/**
 * TemplateKit — Product Components (server-rendered)
 * Ref: DOC 08 §46 (GeneratorForm, EmptyState, ...), §16–§21
 */

import { CONTENT_TYPES, TONES, HOOK_COUNTS } from '../modules/hook-generator/domain/types'
import { TONE_GUIDE } from '../modules/hook-generator/templates/frameworks'

const CONTENT_TYPE_LABELS: Record<string, string> = {
  general: 'Umum',
  product_review: 'Review Produk',
  product_promotion: 'Promosi Produk',
  educational: 'Edukasi',
  tutorial: 'Tutorial',
  storytelling: 'Storytelling'
}

/** DOC 08 §16–§20 — GeneratorForm */
export function generatorForm(): string {
  const contentTypeOptions = CONTENT_TYPES.map(
    (v) =>
      `<option value="${v}"${v === 'general' ? ' selected' : ''}>${CONTENT_TYPE_LABELS[v] ?? v}</option>`
  ).join('')

  const toneOptions = TONES.map(
    (v) => `<option value="${v}"${v === 'casual' ? ' selected' : ''}>${TONE_GUIDE[v].label}</option>`
  ).join('')

  const countOptions = HOOK_COUNTS.map(
    (v) => `<option value="${v}"${v === 5 ? ' selected' : ''}>${v} hook</option>`
  ).join('')

  return `<form class="tk-form" id="generator-form" novalidate>
    <div class="tk-field" id="field-wrap-topic" data-error="false">
      <label class="tk-field__label" for="field-topic">Topik / Produk <span class="tk-req" aria-hidden="true">*</span></label>
      <input class="tk-input" type="text" id="field-topic" name="topic" maxlength="200"
             placeholder="Contoh: Sepatu lari" required
             aria-describedby="field-hint-topic field-error-topic">
      <p class="tk-field__hint" id="field-hint-topic">Apa yang kamu bahas di video ini?</p>
      <p class="tk-field__error" id="field-error-topic" role="alert"></p>
    </div>

    <div class="tk-field" id="field-wrap-audience" data-error="false">
      <label class="tk-field__label" for="field-audience">Target Audience <span class="tk-req" aria-hidden="true">*</span></label>
      <input class="tk-input" type="text" id="field-audience" name="audience" maxlength="200"
             placeholder="Contoh: Pemula yang baru mulai olahraga" required
             aria-describedby="field-hint-audience field-error-audience">
      <p class="tk-field__hint" id="field-hint-audience">Siapa yang kamu ajak bicara?</p>
      <p class="tk-field__error" id="field-error-audience" role="alert"></p>
    </div>

    <div class="tk-form__divider" role="presentation"></div>
    <p class="tk-form__secondary-label">Pengaturan tambahan (opsional)</p>

    <div class="tk-form__row tk-form__row--2">
      <div class="tk-field">
        <label class="tk-field__label" for="field-content-type">Tipe Konten</label>
        <select class="tk-select" id="field-content-type" name="contentType">${contentTypeOptions}</select>
      </div>
      <div class="tk-field">
        <label class="tk-field__label" for="field-tone">Tone</label>
        <select class="tk-select" id="field-tone" name="tone">${toneOptions}</select>
      </div>
    </div>

    <div class="tk-field">
      <label class="tk-field__label" for="field-count">Jumlah Hook</label>
      <select class="tk-select" id="field-count" name="count">${countOptions}</select>
    </div>

    <button type="submit" class="tk-btn tk-btn--primary tk-btn--block" id="generate-btn">
      <span id="generate-btn-label">Generate Hooks</span>
    </button>

    <p class="tk-field__hint">Gratis. Tanpa login. Hasil bisa langsung kamu edit.</p>
  </form>`
}

/** DOC 08 §12 — Hero visual: representasi generator UI */
export function heroMock(): string {
  return `<figure class="tk-mock" aria-label="Contoh tampilan Hook Generator">
    <div class="tk-mock__bar">
      <span class="tk-mock__dot" aria-hidden="true"></span>
      <span class="tk-mock__dot" aria-hidden="true"></span>
      <span class="tk-mock__dot" aria-hidden="true"></span>
      <span>TikTok Hook Generator</span>
    </div>
    <div class="tk-mock__body">
      <div>
        <p class="tk-mock__label">Topik</p>
        <p class="tk-mock__field">Sepatu lari</p>
      </div>
      <div>
        <p class="tk-mock__label">Target Audience</p>
        <p class="tk-mock__field">Pemula</p>
      </div>
      <p class="tk-mock__cta">Generate Hooks</p>
      <div class="tk-mock__out">
        <p class="tk-mock__label">Hasil</p>
        <p class="tk-mock__hook"><span>01</span><span>Kalau kamu baru mulai lari, jangan asal pilih sepatu.</span></p>
        <p class="tk-mock__hook"><span>02</span><span>Ada satu hal yang sering dilewatkan pemula saat pilih sepatu lari.</span></p>
        <p class="tk-mock__hook"><span>03</span><span>Sepatu lari yang mahal belum tentu cocok buat pemula.</span></p>
      </div>
    </div>
  </figure>`
}

export function faqSection(): string {
  const items = [
    {
      q: 'Apa itu TemplateKit?',
      a: 'TemplateKit adalah kumpulan generator praktis untuk creator. Saat ini yang tersedia adalah TikTok Hook Generator — alat untuk membantu kamu membuat kalimat pembuka video.'
    },
    {
      q: 'Apa itu Hook Generator?',
      a: 'Hook Generator membantu kamu membuat beberapa alternatif kalimat pembuka video TikTok berdasarkan topik dan target audience yang kamu masukkan. Setiap hook dibangun dari framework hook yang berbeda, jadi kamu dapat variasi sudut pandang, bukan kalimat yang mirip-mirip.'
    },
    {
      q: 'Apakah gratis?',
      a: 'Ya, saat ini gratis. Ada batas pemakaian wajar per jam supaya layanan tetap stabil untuk semua orang.'
    },
    {
      q: 'Apakah perlu login?',
      a: 'Tidak perlu. Buka halaman generator, isi dua kolom, lalu generate.'
    },
    {
      q: 'Apakah hasil dapat diedit?',
      a: 'Sangat disarankan. Hook yang dihasilkan adalah titik awal — sesuaikan dengan gaya bicara dan konteks kontenmu sebelum dipakai.'
    },
    {
      q: 'Apakah hook ini dijamin viral?',
      a: 'Tidak. Kami tidak menjanjikan viral atau FYP. Yang kami bantu adalah mempercepat proses mencari sudut pembuka yang menarik.'
    }
  ]

  return `<div class="tk-faq">
    ${items
      .map(
        (item, i) => `<div class="tk-faq__item" data-open="${i === 0 ? 'true' : 'false'}">
      <button type="button" class="tk-faq__q" aria-expanded="${i === 0 ? 'true' : 'false'}" aria-controls="faq-a-${i}">
        <span>${item.q}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <div class="tk-faq__a" id="faq-a-${i}"><p>${item.a}</p></div>
    </div>`
      )
      .join('\n    ')}
  </div>`
}

export function stepsSection(): string {
  const steps = [
    {
      title: 'Masukkan topik',
      desc: 'Tulis topik atau produk yang kamu bahas, dan siapa target audience-nya. Dua kolom itu sudah cukup.'
    },
    {
      title: 'Generate',
      desc: 'Sistem memilih framework hook yang cocok dengan tipe kontenmu, lalu menyusun beberapa alternatif pembuka.'
    },
    {
      title: 'Copy dan gunakan',
      desc: 'Pilih hook yang paling pas, copy, sesuaikan sedikit dengan gaya bicaramu, lalu pakai di videomu.'
    }
  ]

  return `<ol class="tk-steps">
    ${steps
      .map(
        (s, i) => `<li class="tk-step">
      <p class="tk-step__num" aria-hidden="true">0${i + 1}</p>
      <h3 class="tk-step__title">${s.title}</h3>
      <p class="tk-step__desc">${s.desc}</p>
    </li>`
      )
      .join('\n    ')}
  </ol>`
}
