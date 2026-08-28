/**
 * TemplateKit — Application Entry
 * Ref: DOC 06 §15 (System Boundary) | DOC 09 (Implementation Contract)
 *
 * Halaman:
 *   GET /               → Landing (+ live generator)
 *   GET /generator      → Hook Generator
 *   GET /how-it-works   → Penjelasan framework & quality control
 *   GET /privacy, /terms
 *
 * API (lihat src/routes/api.ts):
 *   POST /api/generate | POST /api/feedback | POST /api/event
 *   GET  /api/health | GET /api/meta | GET /api/stats
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import api from './routes/api'
import type { Bindings } from './types'
import {
  landingPage,
  generatorPage,
  howItWorksPage,
  privacyPage,
  termsPage,
  notFoundPage
} from './views/pages'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('*', secureHeaders())

// ── API ──────────────────────────────────────────────────────────────────

app.route('/api', api)

// ── Pages ────────────────────────────────────────────────────────────────

app.get('/', (c) => c.html(landingPage()))
app.get('/generator', (c) => c.html(generatorPage()))
app.get('/how-it-works', (c) => c.html(howItWorksPage()))
app.get('/privacy', (c) => c.html(privacyPage()))
app.get('/terms', (c) => c.html(termsPage()))

// ── robots.txt (DOC 08 §35) ──────────────────────────────────────────────

app.get('/robots.txt', (c) =>
  c.text(
    ['User-agent: *', 'Allow: /', 'Disallow: /api/', `Sitemap: ${new URL(c.req.url).origin}/sitemap.xml`].join(
      '\n'
    )
  )
)

app.get('/sitemap.xml', (c) => {
  const origin = new URL(c.req.url).origin
  const paths = ['/', '/generator', '/how-it-works', '/privacy', '/terms']
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}
</urlset>`
  return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

// ── Error & 404 (DOC 07 §32 — user-facing sederhana) ─────────────────────

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' }, 404)
  }
  return c.html(notFoundPage(), 404)
})

app.onError((err, c) => {
  console.error(`[unhandled] ${c.req.method} ${c.req.path} — ${String(err?.message ?? err)}`)
  if (c.req.path.startsWith('/api/')) {
    return c.json({ code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan. Silakan coba lagi.' }, 500)
  }
  return c.html(notFoundPage(), 500)
})

export default app
