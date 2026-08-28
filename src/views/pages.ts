/**
 * TemplateKit — Pages
 * Ref: DOC 08 §9–§13, §21, §32–§35 | DOC 02 §5.1, §14
 */

import { layout } from './layout'
import { faqSection, generatorForm, heroMock, stepsSection } from './components'

// ── PAGE 01 — Landing (DOC 08 §10) ───────────────────────────────────────

export function landingPage(): string {
  const content = `
    <section class="tk-hero" id="hero-section" aria-labelledby="hero-headline">
      <div class="tk-container">
        <div class="tk-hero__grid">
          <div>
            <p class="tk-hero__eyebrow"><span class="tk-badge">TikTok Hook Generator</span></p>
            <h1 class="tk-hero__headline" id="hero-headline">Bikin Hook TikTok dalam Hitungan Detik.</h1>
            <p class="tk-hero__support">Masukkan topik dan target audience. Dapatkan beberapa hook yang siap kamu gunakan.</p>
            <div class="tk-hero__actions">
              <a class="tk-btn tk-btn--primary" href="/generator" data-tk-cta="hero">Buat Hook Gratis</a>
              <a class="tk-btn tk-btn--secondary" href="/how-it-works">Lihat cara kerjanya</a>
            </div>
            <p class="tk-hero__note">Gratis · Tanpa login · Hasil bisa langsung di-copy</p>
          </div>
          ${heroMock()}
        </div>
      </div>
    </section>

    <section class="tk-section" id="live-generator" aria-labelledby="live-generator-title">
      <div class="tk-container">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="live-generator-title">Coba langsung di sini</h2>
          <p class="tk-heading__sub">Tidak perlu pindah halaman. Isi topik dan audience, lalu tekan Generate.</p>
        </div>
        <div class="tk-generator">
          <div class="tk-generator__form-wrap">
            <div class="tk-card"><div class="tk-card__body">${generatorForm()}</div></div>
          </div>
          <div id="result-area" aria-live="polite"></div>
        </div>
      </div>
    </section>

    <section class="tk-section" id="how-it-works-section" aria-labelledby="how-title">
      <div class="tk-container">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="how-title">Cara kerjanya</h2>
          <p class="tk-heading__sub">Tiga langkah. Kurang dari satu menit.</p>
        </div>
        ${stepsSection()}
      </div>
    </section>

    <section class="tk-section" id="use-cases" aria-labelledby="usecase-title">
      <div class="tk-container">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="usecase-title">Cocok untuk</h2>
        </div>
        <div class="tk-usecases">
          <article class="tk-usecase">
            <h3 class="tk-usecase__title">Content Creator</h3>
            <p class="tk-usecase__desc">Punya ide konten tapi sering mentok di kalimat pertama.</p>
          </article>
          <article class="tk-usecase">
            <h3 class="tk-usecase__title">Affiliate</h3>
            <p class="tk-usecase__desc">Butuh banyak variasi pembuka untuk produk yang sama.</p>
          </article>
          <article class="tk-usecase">
            <h3 class="tk-usecase__title">UMKM</h3>
            <p class="tk-usecase__desc">Jualan lewat TikTok tapi belum terbiasa bikin skrip video.</p>
          </article>
          <article class="tk-usecase">
            <h3 class="tk-usecase__title">Personal Brand</h3>
            <p class="tk-usecase__desc">Ingin opening yang konsisten dan sesuai karakter.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="tk-section" id="why-templatekit" aria-labelledby="why-title">
      <div class="tk-container">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="why-title">Kenapa TemplateKit</h2>
          <p class="tk-heading__sub">Bukan chatbox kosong. Hook disusun dari framework yang sudah dirancang.</p>
        </div>
        <div class="tk-features">
          <article class="tk-feature">
            <h3 class="tk-feature__title">${check()} Tanpa bikin prompt</h3>
            <p class="tk-feature__desc">Kamu cuma isi topik dan audience. Struktur hook-nya sudah kami siapkan.</p>
          </article>
          <article class="tk-feature">
            <h3 class="tk-feature__title">${check()} Variasi sudut pandang</h3>
            <p class="tk-feature__desc">Setiap hook memakai framework berbeda: problem, curiosity, mistake, benefit, dan lainnya.</p>
          </article>
          <article class="tk-feature">
            <h3 class="tk-feature__title">${check()} Tanpa klaim berlebihan</h3>
            <p class="tk-feature__desc">Kami menghindari janji palsu dan angka yang dikarang. Hook tetap terasa wajar.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="tk-section" id="faq" aria-labelledby="faq-title">
      <div class="tk-container tk-container--narrow">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="faq-title">Pertanyaan yang sering muncul</h2>
        </div>
        ${faqSection()}
      </div>
    </section>

    <section class="tk-section" id="final-cta">
      <div class="tk-container">
        <div class="tk-cta">
          <h2 class="tk-cta__title">Bingung mulai video dari mana?</h2>
          <p class="tk-cta__sub">Masukkan satu topik. Lihat beberapa pilihan hook.</p>
          <a class="tk-btn tk-btn--primary" href="/generator" data-tk-cta="final">Buat Hook Gratis</a>
        </div>
      </div>
    </section>`

  return layout(
    {
      title: 'TemplateKit — Bikin Hook TikTok dalam Hitungan Detik',
      description:
        'Masukkan topik dan target audience, dapatkan beberapa alternatif hook TikTok yang siap dipakai. Gratis, tanpa login.',
      path: '/',
      scripts: ['/static/generator.js']
    },
    content
  )
}

// ── PAGE 02 — Generator (DOC 08 §21) ────────────────────────────────────

export function generatorPage(): string {
  const content = `
    <section class="tk-section" id="generator-page" aria-labelledby="generator-title">
      <div class="tk-container">
        <div class="tk-heading">
          <p style="margin-bottom:var(--tk-sp-3)"><span class="tk-badge">TikTok Hook Generator</span></p>
          <h1 class="tk-heading__title" id="generator-title">Buat Hook TikTok</h1>
          <p class="tk-heading__sub">Isi topik dan target audience. Hook akan muncul di sebelah kanan (atau di bawah pada layar kecil).</p>
        </div>

        <div class="tk-generator">
          <div class="tk-generator__form-wrap">
            <div class="tk-card"><div class="tk-card__body">${generatorForm()}</div></div>
          </div>
          <div id="result-area" aria-live="polite"></div>
        </div>
      </div>
    </section>`

  return layout(
    {
      title: 'Hook Generator — TemplateKit',
      description:
        'Generator hook TikTok. Masukkan topik dan target audience, pilih tone, lalu generate beberapa alternatif hook.',
      path: '/generator',
      scripts: ['/static/generator.js']
    },
    content
  )
}

// ── PAGE 03 — How It Works (DOC 08 §32) ─────────────────────────────────

export function howItWorksPage(): string {
  const content = `
    <section class="tk-section" aria-labelledby="hiw-title">
      <div class="tk-container tk-container--narrow">
        <div class="tk-heading">
          <h1 class="tk-heading__title" id="hiw-title">Cara Kerja TemplateKit</h1>
          <p class="tk-heading__sub">Hook yang baik bukan kalimat acak. Ada polanya. TemplateKit menyusun hook dari pola-pola itu.</p>
        </div>
        ${stepsSection()}
      </div>
    </section>

    <section class="tk-section" aria-labelledby="framework-title">
      <div class="tk-container tk-container--narrow">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="framework-title">Framework hook yang dipakai</h2>
          <p class="tk-heading__sub">Setiap hook dibangun dari salah satu framework di bawah ini, supaya hasilnya punya sudut pandang yang berbeda-beda.</p>
        </div>
        <div class="tk-usecases">
          ${frameworkCard('Curiosity', 'Membangkitkan rasa ingin tahu tanpa membocorkan isi konten.')}
          ${frameworkCard('Problem', 'Mengangkat masalah nyata yang dirasakan target audience.')}
          ${frameworkCard('Mistake', 'Menyoroti kesalahan umum yang sering terjadi.')}
          ${frameworkCard('Benefit', 'Menonjolkan hasil atau manfaat yang diinginkan.')}
          ${frameworkCard('Contrarian', 'Memberi sudut pandang berlawanan dari anggapan umum.')}
          ${frameworkCard('Story', 'Membuka dengan situasi yang relatable.')}
          ${frameworkCard('Question', 'Mendorong audience berpikir lewat pertanyaan.')}
        </div>
      </div>
    </section>

    <section class="tk-section" aria-labelledby="quality-title">
      <div class="tk-container tk-container--narrow">
        <div class="tk-heading">
          <h2 class="tk-heading__title" id="quality-title">Apa yang kami saring</h2>
        </div>
        <div class="tk-card"><div class="tk-card__body tk-prose">
          <p>Sebelum hasil ditampilkan, setiap hook melewati pemeriksaan:</p>
          <ul>
            <li>Relevan dengan topik dan audience yang kamu masukkan.</li>
            <li>Tidak terlalu panjang — target 1 sampai 2 kalimat pendek.</li>
            <li>Tidak mengulang hook lain dengan makna yang sama.</li>
            <li>Tidak memakai klaim berlebihan seperti "dijamin viral" atau angka yang dikarang.</li>
            <li>Tidak mengaku sebagai pengalaman pribadi kalau kamu tidak menyebutkannya.</li>
          </ul>
          <p>Hook yang lolos diurutkan, yang terkuat ditampilkan lebih dulu.</p>
        </div></div>
      </div>
    </section>

    <section class="tk-section">
      <div class="tk-container tk-container--narrow">
        <div class="tk-cta">
          <h2 class="tk-cta__title">Siap coba?</h2>
          <p class="tk-cta__sub">Satu topik, satu target audience. Sisanya kami urus.</p>
          <a class="tk-btn tk-btn--primary" href="/generator" data-tk-cta="how-it-works">Buat Hook Gratis</a>
        </div>
      </div>
    </section>`

  return layout(
    {
      title: 'How It Works — TemplateKit',
      description:
        'Cara kerja TemplateKit Hook Generator: framework hook, quality control, dan alur input hingga hasil.',
      path: '/how-it-works'
    },
    content
  )
}

// ── Legal pages (DOC 08 §35) ────────────────────────────────────────────

export function privacyPage(): string {
  const content = `
    <section class="tk-section">
      <div class="tk-container tk-container--narrow tk-prose">
        <h1 class="tk-heading__title">Privacy</h1>
        <p>TemplateKit dirancang seminimal mungkin dalam mengumpulkan data.</p>

        <h2>Yang kami kumpulkan</h2>
        <ul>
          <li>Topik dan target audience yang kamu masukkan, untuk memproses generation.</li>
          <li>ID sesi anonim yang disimpan di browser kamu, untuk membatasi penyalahgunaan dan mengukur pemakaian.</li>
          <li>Event pemakaian dasar: halaman dibuka, generate ditekan, hasil di-copy.</li>
        </ul>

        <h2>Yang tidak kami kumpulkan</h2>
        <ul>
          <li>Nama, email, nomor telepon.</li>
          <li>Akun atau login apa pun — TemplateKit tidak punya sistem akun.</li>
        </ul>

        <h2>ID sesi</h2>
        <p>ID sesi adalah string acak. Bukan identitas pribadi, dan tidak dikaitkan dengan akun apa pun. Kamu dapat menghapusnya dengan membersihkan penyimpanan browser.</p>

        <h2>Layanan pihak ketiga</h2>
        <p>Untuk menyusun hook, konteks yang kamu masukkan dikirim ke penyedia model bahasa. Jangan memasukkan informasi rahasia atau data pribadi ke dalam kolom topik dan audience.</p>

        <h2>Retensi</h2>
        <p>Kami tidak menyimpan data lebih lama dari yang dibutuhkan untuk memperbaiki produk dan mencegah penyalahgunaan.</p>
      </div>
    </section>`

  return layout(
    {
      title: 'Privacy — TemplateKit',
      description: 'Kebijakan privasi TemplateKit Hook Generator.',
      path: '/privacy'
    },
    content
  )
}

export function termsPage(): string {
  const content = `
    <section class="tk-section">
      <div class="tk-container tk-container--narrow tk-prose">
        <h1 class="tk-heading__title">Terms</h1>
        <p>Dengan menggunakan TemplateKit, kamu menyetujui ketentuan berikut.</p>

        <h2>Layanan</h2>
        <p>TemplateKit menyediakan saran kreatif berupa alternatif hook untuk konten TikTok. Hasil generator adalah titik awal, bukan naskah final.</p>

        <h2>Tanpa jaminan hasil</h2>
        <p>Kami tidak menjanjikan views, FYP, engagement, penjualan, atau hasil bisnis apa pun.</p>

        <h2>Tanggung jawab kamu</h2>
        <ul>
          <li>Periksa dan sesuaikan hook sebelum dipublikasikan.</li>
          <li>Pastikan klaim dalam kontenmu benar dan sesuai aturan platform.</li>
          <li>Jangan menggunakan layanan untuk konten yang melanggar hukum.</li>
        </ul>

        <h2>Batas pemakaian</h2>
        <p>Terdapat batas pemakaian wajar untuk menjaga layanan tetap tersedia bagi semua pengguna.</p>

        <h2>Perubahan</h2>
        <p>TemplateKit masih dalam tahap awal. Fitur dan ketentuan dapat berubah.</p>
      </div>
    </section>`

  return layout(
    {
      title: 'Terms — TemplateKit',
      description: 'Ketentuan penggunaan TemplateKit Hook Generator.',
      path: '/terms'
    },
    content
  )
}

export function notFoundPage(): string {
  const content = `
    <section class="tk-section">
      <div class="tk-container tk-container--narrow">
        <div class="tk-state">
          <p class="tk-state__title">Halaman tidak ditemukan.</p>
          <p class="tk-state__sub">Mungkin tautannya sudah berubah. Coba mulai dari generator.</p>
          <div class="tk-state__actions">
            <a class="tk-btn tk-btn--primary" href="/generator">Buat Hook</a>
            <a class="tk-btn tk-btn--secondary" href="/">Ke Home</a>
          </div>
        </div>
      </div>
    </section>`

  return layout(
    {
      title: 'Halaman tidak ditemukan — TemplateKit',
      description: 'Halaman tidak ditemukan.',
      path: '/404'
    },
    content
  )
}

// ── helpers ──────────────────────────────────────────────────────────────

function check(): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`
}

function frameworkCard(name: string, desc: string): string {
  return `<article class="tk-usecase">
            <h3 class="tk-usecase__title">${name}</h3>
            <p class="tk-usecase__desc">${desc}</p>
          </article>`
}
