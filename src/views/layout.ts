/**
 * TemplateKit — Shared Layout
 * Ref: DOC 08 §7–§8 (nav), §35 (footer), §56 (a11y)
 */

export interface LayoutOptions {
  title: string
  description: string
  path: string
  bodyClass?: string
  scripts?: string[]
}

export function layout(opts: LayoutOptions, content: string): string {
  const scripts = opts.scripts ?? []

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(opts.title)}</title>
  <meta name="description" content="${escapeHtml(opts.description)}">
  <meta name="theme-color" content="#5b47fb">
  <meta property="og:title" content="${escapeHtml(opts.title)}">
  <meta property="og:description" content="${escapeHtml(opts.description)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/static/tokens.css">
  <link rel="stylesheet" href="/static/app.css">
</head>
<body${opts.bodyClass ? ` class="${opts.bodyClass}"` : ''}>
  <a class="tk-skip-link" href="#main">Langsung ke konten utama</a>
  ${navbar(opts.path)}
  <main id="main">
${content}
  </main>
  ${footer()}

  <div class="tk-toast" id="toast" data-show="false" role="status" aria-live="polite">
    <span id="toast-text"></span>
  </div>

  <script src="/static/analytics.js"></script>
  <script src="/static/ui.js"></script>
${scripts.map((s) => `  <script src="${s}"></script>`).join('\n')}
</body>
</html>`
}

function navbar(path: string): string {
  const link = (href: string, label: string) =>
    `<a class="tk-nav__link" href="${href}"${path === href ? ' aria-current="page"' : ''}>${label}</a>`

  return `<header class="tk-navbar">
    <div class="tk-container">
      <nav class="tk-navbar__inner" aria-label="Navigasi utama">
        <a class="tk-logo" href="/" aria-label="TemplateKit — beranda">
          <span class="tk-logo__mark" aria-hidden="true">TK</span>
          <span>TemplateKit</span>
        </a>

        <div class="tk-nav__links">
          ${link('/', 'Home')}
          ${link('/generator', 'Generator')}
          ${link('/how-it-works', 'How It Works')}
        </div>

        <div class="tk-nav__actions">
          <a class="tk-btn tk-btn--primary tk-btn--sm" href="/generator" data-tk-cta="navbar">Buat Hook</a>
          <button type="button" class="tk-nav__toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-mobile" aria-label="Buka menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </nav>

      <div class="tk-nav__mobile" id="nav-mobile" data-open="false">
        <a href="/generator">Generator</a>
        <a href="/how-it-works">How It Works</a>
      </div>
    </div>
  </header>`
}

function footer(): string {
  const year = new Date().getFullYear()
  return `<footer class="tk-footer">
    <div class="tk-container">
      <div class="tk-footer__grid">
        <div>
          <a class="tk-logo" href="/">
            <span class="tk-logo__mark" aria-hidden="true">TK</span>
            <span>TemplateKit</span>
          </a>
          <p class="tk-footer__tag">Hook Generator untuk TikTok. Masukkan topik, dapatkan ide hook yang siap dipakai.</p>
        </div>
        <nav class="tk-footer__links" aria-label="Navigasi footer">
          <a href="/generator">Generator</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </div>
      <p class="tk-footer__bottom">© ${year} TemplateKit. Hasil generator adalah saran kreatif — periksa dan sesuaikan sebelum digunakan.</p>
    </div>
  </footer>`
}

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
