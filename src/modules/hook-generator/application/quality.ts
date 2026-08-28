/**
 * TemplateKit — Quality Layer
 * Ref: DOC 05 §22–§31, §46 | DOC 06 Module 05
 *
 * Tanggung jawab: validation, duplicate detection, output filtering, ranking.
 * Tujuan: output terasa dirancang, bukan kalimat random dari AI.
 */

import type { FrameworkId, GenerationContext, QualityScore } from '../domain/types'

export interface CandidateHook {
  text: string
  frameworkId: FrameworkId
  templateId: string
  angle: string
}

export interface ScoredHook extends CandidateHook {
  qualityScore: QualityScore
}

// DOC 05 §25 — Hook Length Control: target 1-2 kalimat pendek
const MAX_HOOK_CHARS = 160
const MIN_HOOK_CHARS = 12

// Kata/pola yang menandakan klaim tidak didukung (DOC 05 §46)
const UNSUPPORTED_CLAIM_PATTERNS: RegExp[] = [
  /\bdijamin\b/i,
  /\bpasti\s+(viral|fyp|laris|untung|berhasil|sukses)\b/i,
  /\b100%\b/,
  /\bgaransi\b/i,
  /\bterbukti\s+secara\s+ilmiah\b/i,
  /\bnaik\s+\d{2,}\s*%/i,
  /\bomzet\s+\d+/i
]

const FILLER_PREFIXES = [
  /^hook\s*#?\d*\s*[:\-]\s*/i,
  /^\d+\s*[.)]\s*/,
  /^(berikut|ini)\s+(adalah\s+)?hook[^:]*:\s*/i
]

// ── 1. SANITIZE ──────────────────────────────────────────────────────────

/** DOC 05 §25 — ringkas, hilangkan filler, pertahankan core idea. */
export function sanitizeHookText(raw: string): string {
  let s = String(raw ?? '')

  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()

  // buang label/numbering yang kadang ikut dari AI
  for (const p of FILLER_PREFIXES) s = s.replace(p, '').trim()

  // buang kutip pembuka/penutup
  s = s.replace(/^["'“”‘’`]+/, '').replace(/["'“”‘’`]+$/, '').trim()

  // buang emoji & hashtag (DOC 05 §26 — bahasa natural, tanpa spam)
  s = s.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu,
    ''
  )
  s = s.replace(/#\w+/g, '')

  // normalisasi punctuation berulang
  s = s.replace(/([!?.,])\1{1,}/g, '$1')
  s = s.replace(/\s+([,.!?])/g, '$1')
  s = s.replace(/\s+/g, ' ').trim()

  // CAPSLOCK penekanan → sentence-ish
  const letters = s.replace(/[^A-Za-z]/g, '')
  if (letters.length > 6 && letters === letters.toUpperCase()) {
    s = s.charAt(0) + s.slice(1).toLowerCase()
  }

  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1)

  return s
}

/** DOC 05 §46 — ubah klaim berisiko menjadi wording aman. */
export function softenClaims(text: string): string {
  let s = text
  s = s.replace(/\bdijamin\b/gi, 'berpotensi')
  s = s.replace(/\bpasti\s+(viral|fyp|laris|untung|berhasil|sukses)\b/gi, 'lebih berpeluang $1')
  s = s.replace(/\b100%\s*/g, '')
  s = s.replace(/\bgaransi\b/gi, 'peluang')
  s = s.replace(/\bterbukti\s+secara\s+ilmiah\b/gi, 'banyak disebut')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function hasUnsupportedClaim(text: string): boolean {
  return UNSUPPORTED_CLAIM_PATTERNS.some((p) => p.test(text))
}

// ── 2. DUPLICATE DETECTION (DOC 05 §23) ──────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

/** Jaccard similarity — deteksi near-duplicate berbasis makna kasar. */
export function similarity(a: string, b: string): number {
  const A = new Set(tokenize(a))
  const B = new Set(tokenize(b))
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

/** DOC 05 §24 — Repetition Control: pembuka kalimat tidak boleh seragam. */
function openingSignature(text: string): string {
  return tokenize(text).slice(0, 3).join(' ')
}

const NEAR_DUPLICATE_THRESHOLD = 0.6

// ── 3. QUALITY SCORING (DOC 05 §29) ──────────────────────────────────────

function scoreHook(
  hook: CandidateHook,
  ctx: GenerationContext,
  accepted: ScoredHook[]
): QualityScore {
  const text = hook.text
  const words = tokenize(text)

  // Relevance 0-5 — overlap dengan topic & audience
  const topicTokens = new Set(tokenize(ctx.topic))
  const audienceTokens = new Set(tokenize(ctx.audience))
  const topicHit = words.filter((w) => topicTokens.has(w)).length
  const audienceHit = words.filter((w) => audienceTokens.has(w)).length
  let relevance = 1
  if (topicHit > 0) relevance += 2.5
  if (topicHit > 1) relevance += 0.5
  if (audienceHit > 0) relevance += 1
  relevance = Math.min(5, relevance)

  // Hook Strength 0-5 — pemicu perhatian
  let strength = 2
  if (/\?$/.test(text)) strength += 1
  if (/\b(jangan|stop|hindari|kesalahan|salah)\b/i.test(text)) strength += 1
  if (/\b(ternyata|sering|jarang|padahal|belum tentu)\b/i.test(text)) strength += 1
  if (/\b(kamu|anda|kalian)\b/i.test(text)) strength += 0.5
  strength = Math.min(5, strength)

  // Naturalness 0-5 — panjang & keterbacaan
  const len = text.length
  let naturalness = 5
  if (len > 130) naturalness -= 1
  if (len > 150) naturalness -= 1
  if (len < 25) naturalness -= 1
  const sentenceCount = (text.match(/[.!?]/g) || []).length
  if (sentenceCount > 2) naturalness -= 1
  if (/\b(oleh karena itu|dengan demikian|sebagaimana)\b/i.test(text)) naturalness -= 1
  naturalness = Math.max(0, Math.min(5, naturalness))

  // Specificity 0-5 — tidak generik
  let specificity = 2
  if (topicHit > 0) specificity += 1.5
  if (audienceHit > 0) specificity += 1
  if (words.length >= 7) specificity += 0.5
  if (/\b(sesuatu|hal ini|banyak hal|apa saja)\b/i.test(text)) specificity -= 1
  specificity = Math.max(0, Math.min(5, specificity))

  // Diversity 0-5 — dibanding hook yang sudah diterima (DOC 05 §22)
  let diversity = 5
  for (const a of accepted) {
    const sim = similarity(text, a.text)
    if (sim > 0.45) diversity -= 2
    else if (sim > 0.3) diversity -= 1
    if (openingSignature(text) === openingSignature(a.text)) diversity -= 1.5
    if (a.frameworkId === hook.frameworkId) diversity -= 0.5
  }
  diversity = Math.max(0, Math.min(5, diversity))

  const total =
    Math.round((relevance + strength + naturalness + specificity + diversity) * 100) / 100

  return {
    relevance: round1(relevance),
    strength: round1(strength),
    naturalness: round1(naturalness),
    specificity: round1(specificity),
    diversity: round1(diversity),
    total
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// ── 4. PIPELINE: filter → dedupe → score → rank (DOC 05 §31) ─────────────

export interface QualityOptions {
  /** hook dari generation sebelumnya yang harus dihindari (regenerate) */
  excludeHooks?: string[]
  /** minimal total score untuk lolos */
  minTotalScore?: number
}

const DEFAULT_MIN_TOTAL = 11

export function runQualityPipeline(
  candidates: CandidateHook[],
  ctx: GenerationContext,
  opts: QualityOptions = {}
): ScoredHook[] {
  const exclude = (opts.excludeHooks ?? []).map((h) => sanitizeHookText(h))
  const minTotal = opts.minTotalScore ?? DEFAULT_MIN_TOTAL

  const accepted: ScoredHook[] = []
  const rejected: ScoredHook[] = []

  for (const c of candidates) {
    let text = sanitizeHookText(c.text)
    if (!text) continue

    // Length control (DOC 05 §25)
    if (text.length < MIN_HOOK_CHARS) continue
    if (text.length > MAX_HOOK_CHARS) text = trimToSentence(text, MAX_HOOK_CHARS)

    // Safety (DOC 05 §46)
    if (hasUnsupportedClaim(text)) text = softenClaims(text)
    if (hasUnsupportedClaim(text)) continue // masih berisiko → buang

    // Exact / near duplicate vs exclusion list (DOC 07 §34)
    if (exclude.some((e) => e.toLowerCase() === text.toLowerCase())) continue
    if (exclude.some((e) => similarity(e, text) > NEAR_DUPLICATE_THRESHOLD)) continue

    // Exact / near duplicate vs accepted batch (DOC 05 §23)
    const dupInBatch = accepted.some(
      (a) =>
        a.text.toLowerCase() === text.toLowerCase() ||
        similarity(a.text, text) > NEAR_DUPLICATE_THRESHOLD
    )
    if (dupInBatch) continue

    const scored: ScoredHook = {
      ...c,
      text,
      angle: c.angle || '',
      qualityScore: scoreHook({ ...c, text }, ctx, accepted)
    }

    // DOC 05 §30 — Quality Threshold
    if (scored.qualityScore.total >= minTotal) accepted.push(scored)
    else rejected.push(scored)
  }

  // DOC 05 §31 — Rank: hook terbaik ditampilkan lebih awal
  accepted.sort((a, b) => b.qualityScore.total - a.qualityScore.total)

  // Jika hasil lolos terlalu sedikit, tarik kandidat terbaik dari rejected
  // (lebih baik memberi hasil daripada gagal total — DOC 05 §30 tetap
  //  memprioritaskan average quality, bukan output kosong)
  if (accepted.length < Math.min(3, candidates.length)) {
    rejected.sort((a, b) => b.qualityScore.total - a.qualityScore.total)
    for (const r of rejected) {
      const dup = accepted.some(
        (a) =>
          a.text.toLowerCase() === r.text.toLowerCase() ||
          similarity(a.text, r.text) > NEAR_DUPLICATE_THRESHOLD
      )
      if (!dup) accepted.push(r)
      if (accepted.length >= Math.min(3, candidates.length)) break
    }
  }

  return accepted
}

/** Potong ke batas kalimat terdekat agar tidak terputus di tengah. */
function trimToSentence(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastPunct = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('?'), slice.lastIndexOf('!'))
  if (lastPunct > max * 0.5) return slice.slice(0, lastPunct + 1).trim()
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim()
}
