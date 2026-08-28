/**
 * TemplateKit — Input Normalization & Context Extraction
 * Ref: DOC 05 §5, §6, §17–§19 | DOC 07 §12–§13
 *
 * Prinsip: User Input → Derived Context → Generic Context.
 * User input TIDAK BOLEH ditimpa oleh asumsi AI.
 */

import type { GenerationContext, GenerationInput, ContentType, Tone, HookCount } from './types'

const MAX_FIELD_LENGTH = 200

/**
 * DOC 05 §5 — Input Normalization
 * "sepatu LARI buat PEMULA!!!" → "Sepatu lari buat pemula"
 */
export function normalizeText(raw: string): string {
  let s = String(raw ?? '')

  // buang kontrol char & normalisasi whitespace
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()

  // buang punctuation berulang: "!!!" → "", "???" → "?"
  s = s.replace(/([!?.,])\1{1,}/g, '$1')
  s = s.replace(/[!]+$/g, '')

  // ALL-CAPS words → lowercase (kecuali akronim <= 3 huruf, mis. UMKM/AI/CS)
  s = s
    .split(' ')
    .map((w) => {
      const letters = w.replace(/[^A-Za-z]/g, '')
      if (letters.length > 3 && letters === letters.toUpperCase()) {
        return w.toLowerCase()
      }
      return w
    })
    .join(' ')

  s = s.replace(/\s+/g, ' ').trim()

  // Sentence case pada huruf pertama
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1)

  return s.slice(0, MAX_FIELD_LENGTH)
}

/**
 * DOC 05 §6 + DOC 07 §12 — Context Extraction
 * Membangun GenerationContext terstruktur dari input yang sudah dinormalisasi.
 * Field turunan dibiarkan null bila tidak ada bukti dari user input
 * (DOC 05 §18 — AI tidak boleh mengarang fakta spesifik).
 */
export function buildContext(input: GenerationInput): GenerationContext {
  const topic = normalizeText(input.topic)
  const audience = normalizeText(input.audience)
  const contentType: ContentType = input.contentType ?? 'general'
  const tone: Tone = input.tone ?? 'casual'
  const count: HookCount = input.count ?? 5

  return {
    topic,
    audience,
    contentType,
    tone,
    count,
    // DOC 05 §19 — Missing Context Handling: null = tidak tersedia,
    // engine harus fallback ke context lain / generic wording.
    problem: null,
    desiredResult: null,
    benefit: null,
    mistake: null,
    commonBelief: null,
    activity: deriveActivity(topic),
    context: null
  }
}

/**
 * DOC 05 §19 Level 1 — gunakan context lain yang tersedia.
 * Activity diturunkan dari topic secara konservatif (tidak mengarang fakta).
 */
function deriveActivity(topic: string): string | null {
  if (!topic) return null
  return `membahas ${topic.toLowerCase()}`
}
