/**
 * TemplateKit — Local Template Engine (deterministic, no AI)
 * Ref: DOC 05 §3 (Template First, AI Second), §19 (Missing Context Handling),
 *      DOC 06 §5 (Provider abstraction — sistem tidak boleh mati karena provider)
 *
 * Engine ini merender hook langsung dari template pattern + context user,
 * tanpa memanggil provider AI. Fungsinya:
 *
 *   1. Fallback ketika AI provider tidak dikonfigurasi / gagal / kehabisan kuota.
 *   2. Baseline determinstik untuk testing dan pengembangan.
 *
 * Aturan yang sama tetap berlaku (DOC 05 §46):
 *   - Tidak mengarang angka, statistik, merek, harga.
 *   - Tidak menjanjikan hasil ("pasti viral", "dijamin FYP").
 *   - Tidak mengklaim pengalaman pribadi yang tidak diberikan user.
 *
 * Semua output tetap melewati quality pipeline yang sama.
 */

import type { FrameworkId, GenerationContext } from '../domain/types'
import { getTemplateByFramework } from './frameworks'

export interface LocalHook {
  text: string
  frameworkId: FrameworkId
  templateId: string
  angle: string
}

/** Variasi kalimat per framework. `t` = topic (lowercase), `a` = audience (lowercase). */
type Variant = (t: string, a: string) => string

const VARIANTS: Record<FrameworkId, Variant[]> = {
  curiosity: [
    (t) => `Ada satu hal tentang ${t} yang jarang dibahas orang.`,
    (t, a) => `Ternyata ${a} sering melewatkan satu bagian penting soal ${t}.`,
    (t) => `Kebanyakan orang belum tahu bagian ini dari ${t}.`,
    (t, a) => `Kalau kamu ${a}, ada detail ${t} yang perlu kamu lihat dulu.`,
    (t) => `Bagian paling sering dilewatkan dari ${t} justru yang ini.`
  ],
  problem: [
    (t, a) => `Kalau kamu ${a} dan masih bingung soal ${t}, mungkin ini penyebabnya.`,
    (t) => `Masih mentok waktu memilih ${t}? Coba lihat ini dulu.`,
    (t, a) => `Banyak ${a} berhenti di tengah jalan gara-gara satu hal soal ${t}.`,
    (t) => `Kesulitan yang paling sering muncul soal ${t} biasanya bukan yang kamu kira.`,
    (t, a) => `${cap(a)} sering kena masalah yang sama saat mulai ${t}.`
  ],
  mistake: [
    (t) => `Jangan buru-buru memutuskan soal ${t} sebelum tahu ini.`,
    (t, a) => `Kesalahan ini sering dilakukan ${a} saat membahas ${t}.`,
    (t) => `Salah satu kesalahan paling umum soal ${t} kelihatan sepele, tapi berpengaruh.`,
    (t, a) => `Kalau kamu ${a}, hindari satu kebiasaan ini waktu memilih ${t}.`,
    (t) => `Hal kecil ini sering keliru dilakukan orang waktu urusan ${t}.`
  ],
  benefit: [
    (t, a) => `Cara ${a} memanfaatkan ${t} tanpa harus ribet.`,
    (t) => `Kalau tujuanmu memaksimalkan ${t}, mulai dari bagian ini.`,
    (t, a) => `${cap(a)} bisa mulai dari langkah paling sederhana soal ${t}.`,
    (t) => `Bagian paling berguna dari ${t} biasanya yang paling jarang dipakai.`,
    (t, a) => `Ada cara yang lebih ringan buat ${a} mendekati ${t}.`
  ],
  contrarian: [
    (t) => `Banyak orang mengira soal ${t} sudah jelas, padahal belum tentu.`,
    (t) => `Yang mahal belum tentu jadi pilihan paling tepat soal ${t}.`,
    (t, a) => `Anggapan umum ${a} soal ${t} tidak selalu berlaku.`,
    (t) => `Ternyata cara paling populer soal ${t} bukan selalu yang paling cocok.`,
    (t, a) => `Nasihat yang sering didengar ${a} tentang ${t} tidak selalu pas.`
  ],
  story: [
    (t) => `Bayangkan kamu baru mulai dan bingung memilih ${t}.`,
    (t, a) => `Pernah mengalami situasi ini? Kamu ${a}, lalu mentok di urusan ${t}.`,
    (t) => `Coba ingat momen pertama kamu berurusan dengan ${t}.`,
    (t, a) => `Situasi yang sering dialami ${a}: sudah niat, tapi mentok di ${t}.`,
    (t) => `Awalnya kelihatan mudah, sampai kamu benar-benar mulai soal ${t}.`
  ],
  question: [
    (t, a) => `Kenapa ${a} masih sering keliru soal ${t}?`,
    (t) => `Pernah bertanya kenapa urusan ${t} terasa lebih rumit dari seharusnya?`,
    (t, a) => `Kalau kamu ${a}, sudah tahu bagian mana dari ${t} yang paling penting?`,
    (t) => `Menurut kamu, apa yang paling sering disalahpahami soal ${t}?`,
    (t, a) => `Apa yang bikin ${a} ragu waktu memutuskan soal ${t}?`
  ]
}

const ANGLES: Record<FrameworkId, string[]> = {
  curiosity: ['detail terlewat', 'informasi tersembunyi', 'bagian jarang dibahas'],
  problem: ['pain point audience', 'hambatan umum', 'penyebab tersering'],
  mistake: ['kesalahan pemula', 'kebiasaan keliru', 'langkah salah'],
  benefit: ['manfaat praktis', 'jalan paling ringan', 'hasil yang dituju'],
  contrarian: ['anggapan umum', 'sudut berlawanan', 'mitos populer'],
  story: ['situasi relatable', 'momen awal', 'pengalaman umum'],
  question: ['pertanyaan pemicu', 'refleksi audience', 'ajakan berpikir']
}

/** Penyesuaian tone (DOC 05 §26) — ringan, tidak mengubah makna. */
function applyTone(text: string, tone: GenerationContext['tone']): string {
  switch (tone) {
    case 'professional':
      return text
        .replace(/\bgara-gara\b/gi, 'karena')
        .replace(/\bribet\b/gi, 'rumit')
        .replace(/\bbikin\b/gi, 'membuat')
        .replace(/\bmentok\b/gi, 'terhambat')
        .replace(/\bburu-buru\b/gi, 'terlalu cepat')
    case 'bold':
      return text
        .replace(/\bmungkin ini penyebabnya\b/gi, 'ini yang perlu kamu cek')
        .replace(/\bcoba lihat ini dulu\b/gi, 'lihat ini dulu')
        .replace(/\bbiasanya bukan yang kamu kira\b/gi, 'bukan yang kamu kira')
    case 'curious':
      // Pernyataan polos diubah menjadi kalimat menggantung (open loop) —
      // pola hook yang umum dan tetap terbaca natural. Kalimat yang sudah
      // berbentuk pertanyaan dibiarkan apa adanya.
      if (/\?/.test(text)) return text
      return text.replace(/\.$/, '...')
    default:
      return text
  }
}

function cap(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

function soft(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/[.!?]+$/, '')
    .toLowerCase()
}

/**
 * Render hook untuk tiap slot framework.
 *
 * `rotation` menggeser pilihan varian sehingga "Generate More" menghasilkan
 * kalimat berbeda tanpa memanggil AI.
 *
 * `depth` menentukan berapa varian per slot yang dihasilkan. Pool yang lebih
 * besar dari `count` diperlukan supaya quality pipeline masih dapat mengisi
 * jumlah hook yang diminta setelah dedupe & exclusion (DOC 05 §23, §31).
 * Urutan hasil di-interleave (varian ke-1 semua slot, lalu ke-2, dst) agar
 * hook prioritas tetap berasal dari framework routing teratas.
 */
export function renderLocalHooks(
  ctx: GenerationContext,
  frameworkSlots: FrameworkId[],
  rotation = 0,
  depth = 3
): LocalHook[] {
  const t = soft(ctx.topic) || 'topik ini'
  const a = soft(ctx.audience) || 'audience kamu'

  // hitung pemakaian framework agar slot yang sama memakai varian berbeda
  const used: Partial<Record<FrameworkId, number>> = {}
  const slotOffsets = frameworkSlots.map((fid) => {
    const seen = used[fid] ?? 0
    used[fid] = seen + 1
    return seen
  })

  const out: LocalHook[] = []
  const templateIds = new Map<FrameworkId, string>()

  for (let round = 0; round < depth; round++) {
    frameworkSlots.forEach((fid, i) => {
      const variants = VARIANTS[fid]
      const angles = ANGLES[fid]
      const offset = slotOffsets[i]

      const idx = (rotation + offset * depth + round + i) % variants.length
      const raw = variants[idx](t, a)

      if (!templateIds.has(fid)) templateIds.set(fid, getTemplateByFramework(fid).id)

      out.push({
        text: applyTone(cap(raw), ctx.tone),
        frameworkId: fid,
        templateId: templateIds.get(fid)!,
        angle: angles[(rotation + offset + round) % angles.length]
      })
    })
  }

  return out
}
