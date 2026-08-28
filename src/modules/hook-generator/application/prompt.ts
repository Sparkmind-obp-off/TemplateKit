/**
 * TemplateKit — Generation Prompt Architecture
 * Ref: DOC 05 §27–§28 (SYSTEM RULES / PRODUCT RULES / USER CONTEXT / TASK / QUALITY RULES)
 *
 * AI TIDAK pernah diberi instruksi kosong "Buatkan hook TikTok".
 * AI selalu diberi: framework + context + constraints.
 */

import type { FrameworkId, GenerationContext } from '../domain/types'
import { FRAMEWORKS, TONE_GUIDE, getTemplateByFramework } from '../templates/frameworks'

// ── SYSTEM RULES (DOC 05 §28) ────────────────────────────────────────────

export const SYSTEM_PROMPT = `Kamu adalah hook engine untuk TemplateKit — generator hook TikTok berbahasa Indonesia.

PERAN
Kamu bukan chatbot. Kamu adalah mesin yang mengisi struktur hook yang sudah dirancang.
Kamu tidak menjawab pertanyaan, tidak menjelaskan, tidak menambahkan komentar.

ATURAN BAHASA
- Bahasa Indonesia percakapan (conversational).
- Kalimat pendek, kata umum, natural.
- Tidak formal-kaku, tidak penuh istilah teknis.
- Panjang setiap hook: 1-2 kalimat pendek (maksimal sekitar 140 karakter).
- Tanpa emoji. Tanpa hashtag. Tanpa tanda kutip pembuka/penutup.
- Tanpa CAPSLOCK untuk penekanan.

ATURAN KEJUJURAN (WAJIB)
- JANGAN mengarang fakta spesifik: angka, statistik, persentase, harga, nama merek, hasil riset.
- JANGAN membuat klaim hasil atau garansi ("pasti viral", "dijamin FYP", "naik 300%").
- JANGAN mengklaim pengalaman pribadi jika user tidak menyediakannya.
- Jika informasi tidak tersedia, gunakan wording umum yang aman ("sering", "banyak", "belum tentu").

ATURAN OUTPUT
- Hook adalah PEMBUKA video: memancing orang berhenti scroll.
- Hook tidak boleh membocorkan seluruh isi konten.
- Hook harus bisa langsung dibacakan di depan kamera.

FORMAT OUTPUT
Balas HANYA dengan JSON valid, tanpa markdown fence, tanpa teks lain:
{"hooks":[{"frameworkId":"...","text":"...","angle":"..."}]}
- "frameworkId": persis sama dengan yang diminta pada tiap slot.
- "text": hook final dalam Bahasa Indonesia.
- "angle": ringkasan sudut pandang, 2-5 kata, Bahasa Indonesia (contoh: "kesalahan pemula").`

// ── USER PROMPT: PRODUCT RULES + CONTEXT + TASK + QUALITY ────────────────

export function buildUserPrompt(
  ctx: GenerationContext,
  frameworkSlots: FrameworkId[],
  excludeHooks: string[] = []
): string {
  const tone = TONE_GUIDE[ctx.tone]

  const slotBlocks = frameworkSlots
    .map((fid, i) => {
      const fw = FRAMEWORKS[fid]
      const tpl = getTemplateByFramework(fid)
      const patterns = [tpl.pattern, tpl.alternativePattern].filter(Boolean).join('\n   ATAU: ')

      return `SLOT ${i + 1}
   frameworkId: ${fid}
   Nama framework: ${fw.name}
   Tujuan: ${fw.objective}
   Pola acuan: ${patterns}
   Aturan khusus:
   ${tpl.constraints.map((c) => `- ${c}`).join('\n   ')}`
    })
    .join('\n\n')

  const excludeBlock =
    excludeHooks.length > 0
      ? `\nHOOK YANG SUDAH DIPAKAI (WAJIB DIHINDARI)
Jangan menghasilkan hook yang sama atau mirip secara makna dengan daftar ini.
Cari sudut pandang, pembuka kalimat, dan pemicu psikologis yang BERBEDA.
${excludeHooks.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join('\n')}\n`
      : ''

  return `KONTEKS KONTEN USER
- Topik: ${ctx.topic}
- Target audience: ${ctx.audience}
- Tipe konten: ${ctx.contentType}
- Tone: ${tone.label} — ${tone.instruction}
- Contoh nada ${tone.label}: "${tone.example}"

PRIORITAS INFORMASI
1. Informasi dari user (topik & audience) adalah prioritas tertinggi.
2. Konteks turunan yang wajar dari topik.
3. Wording umum yang aman.
Jangan menimpa informasi user dengan asumsimu sendiri.

TUGAS
Buat tepat ${frameworkSlots.length} hook. Satu hook untuk setiap SLOT di bawah ini,
mengikuti framework dan pola acuan slot tersebut.
Pola acuan adalah STRUKTUR, bukan kalimat yang harus dicopy mentah —
isi variabelnya dengan konteks user, lalu sesuaikan wording dengan tone ${tone.label}.

${slotBlocks}
${excludeBlock}
ATURAN VARIASI (WAJIB)
- Setiap hook harus punya pembuka kalimat yang berbeda.
- Jangan semua hook diawali "Kalau kamu...".
- Jangan semua hook memakai kata "ternyata".
- Jangan semua hook berbentuk pertanyaan.
- Perbedaan harus pada makna dan sudut pandang, bukan hanya ganti satu kata.

QUALITY CHECK SEBELUM MENJAWAB
- Relevan dengan topik "${ctx.topic}"? 
- Cocok untuk audience "${ctx.audience}"?
- Natural saat diucapkan?
- Cukup spesifik, tidak generik?
- Tidak ada klaim palsu atau angka yang dikarang?
- Panjang 1-2 kalimat pendek?

Balas HANYA JSON: {"hooks":[{"frameworkId":"...","text":"...","angle":"..."}]}`
}
