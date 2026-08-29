# TemplateKit — TikTok Hook Generator

## Project Overview
- **Name**: TemplateKit (MVP: TikTok Hook Generator)
- **Goal**: Mengubah informasi sederhana tentang sebuah konten menjadi beberapa alternatif hook TikTok yang siap dipakai, dengan input seminimal mungkin.
- **Core Formula**: `User Input → Hook Framework → Generation Logic → Quality Control → Hook Output`
- **Prinsip**: Template First, AI Second — output harus terasa dirancang, bukan kalimat random AI.

## URLs
- **Production**: https://templatekit.pages.dev
- **Latest deployment**: https://9d3ec687.templatekit.pages.dev
- **Custom domain**: https://templatekit.web.id (⏳ menunggu DNS CNAME — lihat bagian Custom Domain)
- **GitHub**: https://github.com/Sparkmind-obp-off/TemplateKit

## Functional Entry URIs

### Pages
| Path | Deskripsi |
|---|---|
| `GET /` | Landing page |
| `GET /generator` | Hook Generator UI (form + hasil) |
| `GET /how-it-works` | Penjelasan cara kerja |
| `GET /privacy` | Kebijakan privasi |
| `GET /terms` | Syarat & ketentuan |
| `GET /robots.txt` | SEO robots |
| `GET /sitemap.xml` | SEO sitemap |

### API
| Method & Path | Body / Params | Deskripsi |
|---|---|---|
| `GET /api/health` | — | Status service, DB, dan provider AI yang terkonfigurasi |
| `GET /api/meta` | — | Enum untuk UI: contentTypes, tones, counts, feedbackReasons |
| `POST /api/generate` | `{ topic*, audience*, contentType?, tone?, count?(3\|5\|10), excludeHooks?[] }` | Generate hook. Header opsional: `x-session-id`, `x-tk-source` |
| `POST /api/feedback` | `{ generationId, hookId, rating, reason? }` | Kirim feedback per hook |
| `POST /api/event` | `{ name, payload? }` | Analytics event |
| `GET /api/stats` | — | Statistik agregat penggunaan |

`*` = wajib. Semua field teks maks 200 karakter.

## Data Architecture
- **Storage**: Cloudflare D1 (`templatekit-production`, id `b0f6d579-57db-4fd1-bee2-09f8a3f54065`), binding `DB`
- **Schema**: `migrations/0001_initial_schema.sql` (generations, hooks, feedback, analytics_events, rate_limits)
- **Data Flow**:
  `Form → validasi server → rate limit (D1) → context extraction → framework/template selection → AI provider chain → quality & diversity check → ranking → persist (D1) → response`

## AI Provider (Multi-provider + Failover)
Semua provider OpenAI-compatible, dipanggil berurutan sesuai `AI_PROVIDER_ORDER`:
1. **Groq Console** — `openai/gpt-oss-120b`
2. **OpenRouter** — `meta-llama/llama-3.3-70b-instruct`
3. Fallback terakhir: **template engine lokal** (deterministik, tanpa AI) — produk tetap jalan meski semua provider mati.

### Production Secrets (Cloudflare Pages)
Sudah terpasang, nilai terenkripsi:
`AI_PROVIDER_ORDER`, `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`

```bash
npx wrangler pages secret list --project-name templatekit
echo "VALUE" | npx wrangler pages secret put NAMA --project-name templatekit
```

Local dev memakai `.dev.vars` (tidak dicommit, lihat `.dev.vars.example`).

## User Guide
1. Buka `/generator`
2. Isi **Topik konten** (mis. "cara jualan skincare di TikTok Shop")
3. Isi **Target audience** (mis. "pemula affiliate umur 20-30")
4. Opsional: pilih tipe konten, tone, dan jumlah hook (3 / 5 / 10)
5. Klik **Generate** → hook muncul beserta framework-nya
6. Klik **Copy** pada hook yang dipilih, atau **Regenerate** untuk variasi baru

## Development
```bash
npm install
npm run build
npm run db:migrate:local
pm2 start ecosystem.config.cjs      # http://localhost:3000
curl http://localhost:3000/api/health
```

## Deployment
- **Platform**: Cloudflare Pages (BYOK — akun Cloudflare user)
- **Project name**: `templatekit`
- **Production branch**: `main`
- **Status**: ✅ Active
- **Tech Stack**: Hono + TypeScript + Vite + Cloudflare Pages + D1 + Groq/OpenRouter
- **Last Updated**: 2026-08-29

```bash
npm run build
npx wrangler pages deploy dist --project-name templatekit --branch main
npx wrangler d1 migrations apply templatekit-production --remote
```

### Custom Domain — templatekit.web.id
Domain sudah **terdaftar** di Pages project (status `pending`), tetapi DNS record belum bisa dibuat karena API token yang tersedia tidak memiliki permission `Zone → DNS → Edit`.

**Cara menyelesaikan** (salah satu):
- **Via dashboard**: Cloudflare → zone `templatekit.web.id` → DNS → Add record
  - Type `CNAME`, Name `@`, Target `templatekit.pages.dev`, Proxy **ON**
- **Via API** setelah token di-regenerate dengan permission `Zone.DNS:Edit`:
  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/zones/a1c6038a4336968a11c4986ca15e86ff/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"type":"CNAME","name":"@","content":"templatekit.pages.dev","proxied":true}'
  ```
Setelah CNAME aktif, Cloudflare otomatis menerbitkan sertifikat dan status domain berubah menjadi `active`.

## Fitur yang Sudah Selesai
- ✅ Landing page + generator UI (mobile-first)
- ✅ Server-side validation & error contract
- ✅ Rate limiting berbasis D1
- ✅ Hook framework & template library
- ✅ Multi-provider AI dengan failover (Groq → OpenRouter)
- ✅ Fallback template engine lokal
- ✅ Quality control, diversity check, ranking
- ✅ Copy & Regenerate (exclude hook sebelumnya)
- ✅ Feedback & analytics event → D1
- ✅ SEO: robots.txt, sitemap.xml
- ✅ Deploy Cloudflare Pages + D1 production + 7 secrets
- ✅ Push GitHub

## Belum Diimplementasikan
- ❌ Custom domain aktif (blocked: permission DNS token)
- ❌ Autentikasi user / akun tersimpan
- ❌ Generator kedua (caption, script, CTA)
- ❌ Riwayat generate per user
- ❌ Dashboard analytics visual
- ❌ Monetisasi / paywall

## Rekomendasi Langkah Berikutnya
1. Selesaikan CNAME `templatekit.web.id` (regenerate token dengan `Zone.DNS:Edit`)
2. Jalankan Session 01 promotion di TikTok, ukur funnel via `/api/stats`
3. Analisis feedback hook untuk memperbaiki framework yang kurang perform
4. Tambah generator kedua setelah validasi pasar terbukti
