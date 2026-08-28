/**
 * TemplateKit — API Routes
 * Ref: DOC 07 §24–§34, §37–§41, §61 | DOC 06 §15
 *
 * POST /api/generate  — generate hooks (juga dipakai untuk regenerate)
 * POST /api/feedback  — feedback hook
 * POST /api/event     — analytics event
 * GET  /api/health    — health check
 * GET  /api/stats     — funnel summary (internal validation)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from '../types'
import { validateGenerateRequest, validateFeedbackRequest, validateAnalyticsEvent } from '../lib/validation'
import { buildIdentity, checkRateLimit } from '../lib/rate-limit'
import { saveEvent, saveFeedback, saveGeneration, saveFailedGeneration, getFunnelStats } from '../lib/persistence'
import { buildContext } from '../modules/hook-generator/domain/context'
import { generateHooks, QualityFailedError } from '../modules/hook-generator/application/generate-hooks'
import {
  OpenAICompatibleProvider,
  ProviderError,
  ProviderTimeoutError
} from '../modules/hook-generator/infrastructure/ai-provider'
import type { APIError } from '../modules/hook-generator/domain/types'

const api = new Hono<{ Bindings: Bindings }>()

api.use('/*', cors())

const MAX_BODY_BYTES = 8 * 1024 // DOC 07 §62 — limit body size

async function readJson(c: any): Promise<unknown | null> {
  const raw = await c.req.text()
  if (raw.length > MAX_BODY_BYTES) return null
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function errorJson(c: any, status: number, err: APIError, requestId: string) {
  return c.json({ ...err, requestId }, status)
}

// ── GET /api/health (DOC 07 §61) ─────────────────────────────────────────

api.get('/health', (c) => c.json({ status: 'ok', service: 'templatekit', version: '1.0.0' }))

// ── GET /api/meta — enum untuk frontend (single source of truth) ─────────

api.get('/meta', async (c) => {
  const { CONTENT_TYPES, TONES, HOOK_COUNTS } = await import('../modules/hook-generator/domain/types')
  const { FRAMEWORKS, TONE_GUIDE } = await import('../modules/hook-generator/templates/frameworks')

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    general: 'Umum',
    product_review: 'Review Produk',
    product_promotion: 'Promosi Produk',
    educational: 'Edukasi',
    tutorial: 'Tutorial',
    storytelling: 'Storytelling'
  }

  return c.json({
    contentTypes: CONTENT_TYPES.map((v) => ({ value: v, label: CONTENT_TYPE_LABELS[v] ?? v })),
    tones: TONES.map((v) => ({ value: v, label: TONE_GUIDE[v].label })),
    counts: HOOK_COUNTS,
    frameworks: Object.values(FRAMEWORKS).map((f) => ({
      id: f.id,
      name: f.name,
      objective: f.objective
    }))
  })
})

// ── POST /api/generate (DOC 07 §24–§26, §33) ─────────────────────────────

api.post('/generate', async (c) => {
  const requestId = crypto.randomUUID()
  const db = c.env.DB
  const sessionId = (c.req.header('x-session-id') || '').slice(0, 64) || 'anon'
  const source = (c.req.header('x-tk-source') || '').slice(0, 64) || null

  // 1. Body & validation
  const body = await readJson(c)
  if (body === null) {
    return errorJson(c, 400, { code: 'INVALID_INPUT', message: 'Data yang dikirim tidak valid.' }, requestId)
  }

  const validated = validateGenerateRequest(body)
  if (!validated.ok) {
    return errorJson(c, 400, validated.error, requestId)
  }
  const input = validated.value

  // 2. Rate limit (DOC 07 §28)
  const identity = buildIdentity(sessionId, clientIp(c))
  const rl = await checkRateLimit(db, identity)
  if (!rl.allowed) {
    c.header('Retry-After', String(rl.retryAfterSeconds))
    return errorJson(
      c,
      429,
      { code: 'RATE_LIMITED', message: 'Batas penggunaan tercapai. Coba lagi nanti.' },
      requestId
    )
  }

  const isRegenerate = (input.excludeHooks?.length ?? 0) > 0

  // 3. Provider (opsional). Kalau tidak dikonfigurasi, generation tetap jalan
  //    lewat template engine lokal — DOC 05 §3 "Template First, AI Second".
  let provider: OpenAICompatibleProvider | null = null
  try {
    provider = new OpenAICompatibleProvider({
      OPENAI_API_KEY: c.env.OPENAI_API_KEY,
      OPENAI_BASE_URL: c.env.OPENAI_BASE_URL,
      OPENAI_MODEL: c.env.OPENAI_MODEL
    })
  } catch {
    console.warn(`[${requestId}] AI provider not configured — using local template engine`)
    provider = null
  }

  // 4. Generate
  try {
    const outcome = await generateHooks(input, {
      provider,
      onProviderError: (err) =>
        console.warn(
          `[${requestId}] provider failed, falling back to template engine — ${String(
            (err as Error)?.message ?? err
          )}`
        )
    })

    // persistence + analytics (fail-safe, tidak memblokir response)
    await saveGeneration(db, {
      generationId: outcome.generationId,
      sessionId,
      ctx: outcome.context,
      hooks: outcome.hooks
    })
    await saveEvent(
      db,
      {
        event: 'generation_success',
        sessionId,
        generationId: outcome.generationId,
        metadata: {
          count: outcome.responseHooks.length,
          requestedCount: outcome.context.count,
          contentType: outcome.context.contentType,
          tone: outcome.context.tone,
          regenerate: isRegenerate,
          engine: outcome.engine,
          totalTokens: outcome.usage?.totalTokens ?? 0
        }
      },
      { source }
    )

    console.log(
      `[${requestId}] generation success generationId=${outcome.generationId} engine=${outcome.engine} hooks=${outcome.responseHooks.length} tokens=${outcome.usage?.totalTokens ?? '-'}`
    )

    // DOC 07 §22 — GenerateHookResponse
    return c.json({
      generationId: outcome.generationId,
      status: 'success' as const,
      hooks: outcome.responseHooks
    })
  } catch (err) {
    const ctx = buildContext(input)
    let code: APIError['code'] = 'GENERATION_FAILED'
    let status = 502
    let message = 'Hook belum berhasil dibuat. Silakan coba lagi.'

    if (err instanceof ProviderTimeoutError) {
      code = 'PROVIDER_TIMEOUT'
      message = 'Prosesnya terlalu lama. Coba lagi sebentar.'
    } else if (err instanceof QualityFailedError) {
      code = 'QUALITY_FAILED'
      message = 'Hasilnya belum cukup bagus. Coba ubah topik atau audience lalu generate lagi.'
    } else if (err instanceof ProviderError) {
      code = 'GENERATION_FAILED'
    } else {
      code = 'INTERNAL_ERROR'
      status = 500
      message = 'Terjadi kesalahan. Silakan coba lagi.'
    }

    // DOC 07 §32 — user-facing sederhana, server log detail
    console.error(
      `[${requestId}] generation failed code=${code} detail=${String((err as Error)?.message ?? err)}`
    )

    const failedId = crypto.randomUUID()
    await saveFailedGeneration(db, { generationId: failedId, sessionId, ctx, errorCode: code })
    await saveEvent(
      db,
      {
        event: 'generation_error',
        sessionId,
        generationId: failedId,
        metadata: { code, contentType: ctx.contentType, tone: ctx.tone, regenerate: isRegenerate }
      },
      { source }
    )

    return errorJson(c, status, { code, message }, requestId)
  }
})

// ── POST /api/feedback (DOC 07 §40–§41) ──────────────────────────────────

api.post('/feedback', async (c) => {
  const requestId = crypto.randomUUID()
  const sessionId = (c.req.header('x-session-id') || '').slice(0, 64) || 'anon'

  const body = await readJson(c)
  if (body === null) {
    return errorJson(c, 400, { code: 'INVALID_INPUT', message: 'Data yang dikirim tidak valid.' }, requestId)
  }

  const validated = validateFeedbackRequest(body)
  if (!validated.ok) return errorJson(c, 400, validated.error, requestId)

  await saveFeedback(c.env.DB, validated.value)
  await saveEvent(c.env.DB, {
    event: validated.value.rating === 'positive' ? 'feedback_positive' : 'feedback_negative',
    sessionId,
    generationId: validated.value.generationId,
    metadata: { hookId: validated.value.hookId, reason: validated.value.reason ?? '' }
  })

  return c.json({ status: 'ok' })
})

// ── POST /api/event (DOC 07 §37–§39) ─────────────────────────────────────

api.post('/event', async (c) => {
  const requestId = crypto.randomUUID()
  const body = await readJson(c)
  if (body === null) {
    return errorJson(c, 400, { code: 'INVALID_INPUT', message: 'Data event tidak valid.' }, requestId)
  }

  const validated = validateAnalyticsEvent(body)
  if (!validated.ok) return errorJson(c, 400, validated.error, requestId)

  const source = (c.req.header('x-tk-source') || '').slice(0, 64) || null
  await saveEvent(c.env.DB, validated.value, { source })

  return c.json({ status: 'ok' })
})

// ── GET /api/stats — internal validation funnel (DOC 02 §17) ─────────────

api.get('/stats', async (c) => {
  const stats = await getFunnelStats(c.env.DB)
  if (!stats) return c.json({ status: 'unavailable', message: 'Analytics belum tersedia.' }, 200)
  return c.json({ status: 'ok', ...stats })
})

export default api
