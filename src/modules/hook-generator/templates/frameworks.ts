/**
 * TemplateKit — Hook Framework Library
 * Ref: DOC 05 — TEMPLATE / GENERATION LOGIC v1.0 §7–§14
 *
 * Prinsip: Template First, AI Second.
 * Framework menentukan STRUKTUR. Tone menentukan CARA BICARA.
 */

import type { Framework, FrameworkId, Template, ContentType, Tone } from '../domain/types'

// ── DOC 05 §7 — Framework Library ────────────────────────────────────────

export const FRAMEWORKS: Record<FrameworkId, Framework> = {
  curiosity: {
    id: 'curiosity',
    name: 'Curiosity',
    objective: 'Membangkitkan rasa ingin tahu tanpa membocorkan isi konten.',
    priority: 1,
    active: true
  },
  problem: {
    id: 'problem',
    name: 'Problem',
    objective: 'Mengangkat masalah nyata yang dirasakan target audience.',
    priority: 2,
    active: true
  },
  mistake: {
    id: 'mistake',
    name: 'Mistake',
    objective: 'Mengangkat kesalahan umum yang sering terjadi.',
    priority: 3,
    active: true
  },
  benefit: {
    id: 'benefit',
    name: 'Benefit',
    objective: 'Menonjolkan hasil atau manfaat yang diinginkan audience.',
    priority: 4,
    active: true
  },
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    objective: 'Memberi sudut pandang berlawanan dari anggapan umum.',
    priority: 5,
    active: true
  },
  story: {
    id: 'story',
    name: 'Story',
    objective: 'Membuka dengan situasi atau pengalaman yang relatable.',
    priority: 6,
    active: true
  },
  question: {
    id: 'question',
    name: 'Question',
    objective: 'Mendorong audience berpikir lewat pertanyaan relevan.',
    priority: 7,
    active: true
  }
}

// ── DOC 05 §8–§14 — Template Library (versioned, DOC 07 §17-18) ──────────

export const TEMPLATES: Template[] = [
  {
    id: 'curiosity-01',
    version: '1.0',
    frameworkId: 'curiosity',
    purpose: 'Membangkitkan rasa ingin tahu terhadap insight yang terlewat.',
    pattern: 'Ternyata [TOPIC] punya [INSIGHT] yang sering orang lewatkan.',
    alternativePattern: 'Ada satu hal tentang [TOPIC] yang jarang dibahas...',
    variables: ['TOPIC', 'INSIGHT'],
    constraints: [
      'Insight tidak boleh berupa fakta yang dibuat-buat.',
      'Jangan membocorkan seluruh isi konten di hook.'
    ],
    active: true
  },
  {
    id: 'problem-01',
    version: '1.0',
    frameworkId: 'problem',
    purpose: 'Mengangkat pain point audience.',
    pattern: 'Kalau kamu [AUDIENCE] dan masih [PROBLEM], mungkin ini penyebabnya.',
    alternativePattern: 'Masih [PROBLEM]? Coba lihat ini sebelum kamu [ACTION].',
    variables: ['AUDIENCE', 'PROBLEM', 'ACTION'],
    constraints: [
      'Problem harus relevan dengan audience yang diberikan user.',
      'Jangan menyalahkan audience secara personal.'
    ],
    active: true
  },
  {
    id: 'mistake-01',
    version: '1.0',
    frameworkId: 'mistake',
    purpose: 'Mengangkat kesalahan umum.',
    pattern: 'Jangan lakukan [MISTAKE] kalau kamu ingin [RESULT].',
    alternativePattern: 'Kesalahan ini sering dilakukan [AUDIENCE] saat [ACTIVITY].',
    variables: ['MISTAKE', 'RESULT', 'AUDIENCE', 'ACTIVITY'],
    constraints: [
      'Tidak boleh menyatakan SEMUA orang melakukan kesalahan tersebut.',
      'Gunakan qualifier seperti "sering", "banyak pemula", "salah satu kesalahan".'
    ],
    active: true
  },
  {
    id: 'benefit-01',
    version: '1.0',
    frameworkId: 'benefit',
    purpose: 'Menonjolkan hasil yang diinginkan.',
    pattern: 'Cara [AUDIENCE] mendapatkan [BENEFIT] tanpa [OBSTACLE].',
    alternativePattern: 'Kalau tujuanmu [DESIRED_RESULT], mulai dari ini.',
    variables: ['AUDIENCE', 'BENEFIT', 'OBSTACLE', 'DESIRED_RESULT'],
    constraints: [
      'Benefit harus berasal dari informasi yang diberikan user.',
      'Jangan menciptakan klaim hasil (angka, garansi, persentase).'
    ],
    active: true
  },
  {
    id: 'contrarian-01',
    version: '1.0',
    frameworkId: 'contrarian',
    purpose: 'Sudut pandang tidak biasa.',
    pattern: 'Banyak orang mengira [COMMON_BELIEF], padahal...',
    alternativePattern: 'Ternyata [COMMON_BELIEF] belum tentu benar.',
    variables: ['COMMON_BELIEF'],
    constraints: [
      'Contrarian angle tidak boleh dibuat hanya untuk clickbait.',
      'Harus punya konteks yang masuk akal.',
      'Gunakan wording aman: "belum tentu", "tidak selalu".'
    ],
    active: true
  },
  {
    id: 'story-01',
    version: '1.0',
    frameworkId: 'story',
    purpose: 'Membuka dengan pengalaman atau situasi.',
    pattern: 'Awalnya saya juga [SITUATION], sampai akhirnya...',
    alternativePattern: 'Pernah mengalami situasi seperti ini? [SITUATION]',
    variables: ['SITUATION'],
    constraints: [
      'Jika user tidak memberi pengalaman pribadi, JANGAN mengklaim pengalaman sebagai fakta.',
      'Gunakan framing "Bayangkan kamu..." atau "Pernah mengalami...".'
    ],
    active: true
  },
  {
    id: 'question-01',
    version: '1.0',
    frameworkId: 'question',
    purpose: 'Mendorong audience berpikir.',
    pattern: 'Kenapa [AUDIENCE] masih [PROBLEM] padahal [CONTEXT]?',
    alternativePattern: 'Pernah bertanya kenapa [PROBLEM] terjadi?',
    variables: ['AUDIENCE', 'PROBLEM', 'CONTEXT'],
    constraints: [
      'Pertanyaan harus terasa relevan, bukan retoris kosong.',
      'Hindari pertanyaan yang jawabannya ya/tidak tanpa tensi.'
    ],
    active: true
  }
]

export function getTemplateByFramework(frameworkId: FrameworkId): Template {
  const t = TEMPLATES.find((x) => x.frameworkId === frameworkId && x.active)
  if (!t) throw new Error(`No active template for framework: ${frameworkId}`)
  return t
}

// ── DOC 05 §15, §20 — Framework Routing per content type ─────────────────

export const FRAMEWORK_ROUTING: Record<ContentType, FrameworkId[]> = {
  general: ['curiosity', 'problem', 'benefit', 'question', 'mistake', 'contrarian', 'story'],
  product_review: ['problem', 'curiosity', 'benefit', 'mistake', 'contrarian', 'question', 'story'],
  product_promotion: ['benefit', 'problem', 'curiosity', 'question', 'contrarian', 'mistake', 'story'],
  educational: ['curiosity', 'question', 'mistake', 'problem', 'contrarian', 'benefit', 'story'],
  tutorial: ['problem', 'mistake', 'benefit', 'question', 'curiosity', 'contrarian', 'story'],
  storytelling: ['story', 'curiosity', 'problem', 'question', 'contrarian', 'benefit', 'mistake']
}

// ── DOC 05 §16 — Tone Transformation ─────────────────────────────────────

export const TONE_GUIDE: Record<Tone, { label: string; instruction: string; example: string }> = {
  casual: {
    label: 'Casual',
    instruction:
      'Bahasa santai sehari-hari. Pakai "kamu". Kalimat pendek, seperti ngobrol dengan teman. Boleh pakai kata seperti "nggak", "banget", tapi jangan berlebihan.',
    example: 'Kalau kamu baru mulai lari, jangan asal pilih sepatu.'
  },
  professional: {
    label: 'Professional',
    instruction:
      'Bahasa rapi dan sopan. Boleh pakai "Anda". Tetap ringkas, tidak kaku, tidak bertele-tele. Hindari slang.',
    example:
      'Jika Anda baru mulai berlari, ada beberapa hal yang perlu diperhatikan sebelum memilih sepatu.'
  },
  bold: {
    label: 'Bold',
    instruction:
      'Tegas dan langsung. Kalimat pendek dan punchy. Boleh imperatif ("Stop", "Jangan"). Tetap tanpa klaim palsu dan tanpa CAPSLOCK.',
    example: 'Stop beli sepatu lari sebelum tahu ini.'
  },
  curious: {
    label: 'Curious',
    instruction:
      'Nada bertanya-tanya dan penasaran. Sering berbentuk pertanyaan atau kalimat menggantung. Tidak menjawab langsung.',
    example: 'Kenapa pemula sering salah pilih sepatu lari?'
  }
}

// ── DOC 05 §21 — Generation Count → framework selection ──────────────────

/**
 * Pilih framework untuk generation.
 * count=3 → 3 framework berbeda
 * count=5 → 5 framework berbeda
 * count=10 → seluruh framework + variasi angle
 *
 * `avoidFirst` dipakai saat regenerate agar framework yang sudah dipakai
 * digeser ke belakang (DOC 05 §34-35).
 */
export function selectFrameworks(
  contentType: ContentType,
  count: number,
  avoidFrameworks: FrameworkId[] = []
): FrameworkId[] {
  const routed = FRAMEWORK_ROUTING[contentType] ?? FRAMEWORK_ROUTING.general
  const fresh = routed.filter((f) => !avoidFrameworks.includes(f))
  const used = routed.filter((f) => avoidFrameworks.includes(f))
  const ordered = [...fresh, ...used]

  const picked: FrameworkId[] = []
  for (let i = 0; i < count; i++) {
    picked.push(ordered[i % ordered.length])
  }
  return picked
}
