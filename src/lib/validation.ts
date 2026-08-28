/**
 * TemplateKit — Request Validation
 * Ref: DOC 06 §16–§17 | DOC 07 §9, §27, §31
 *
 * Jangan mempercayai client validation saja.
 */

import {
  CONTENT_TYPES,
  TONES,
  HOOK_COUNTS,
  FEEDBACK_RATINGS,
  FEEDBACK_REASONS,
  ANALYTICS_EVENTS
} from '../modules/hook-generator/domain/types'
import type {
  APIError,
  ContentType,
  Tone,
  HookCount,
  GenerationInput,
  Feedback,
  AnalyticsEvent,
  AnalyticsEventName,
  FeedbackRating,
  FeedbackReason
} from '../modules/hook-generator/domain/types'

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: APIError }

const MAX_FIELD = 200
const MAX_EXCLUDE = 20

export function validateGenerateRequest(body: unknown): ValidationResult<GenerationInput> {
  if (typeof body !== 'object' || body === null) {
    return fail('INVALID_INPUT', 'Data yang dikirim tidak valid.')
  }
  const b = body as Record<string, unknown>

  // topic — required
  const topic = typeof b.topic === 'string' ? b.topic.trim() : ''
  if (!topic) return fail('INVALID_INPUT', 'Topik wajib diisi.')
  if (topic.length > MAX_FIELD)
    return fail('INVALID_INPUT', `Topik maksimal ${MAX_FIELD} karakter.`)

  // audience — required
  const audience = typeof b.audience === 'string' ? b.audience.trim() : ''
  if (!audience) return fail('INVALID_INPUT', 'Target audience wajib diisi.')
  if (audience.length > MAX_FIELD)
    return fail('INVALID_INPUT', `Target audience maksimal ${MAX_FIELD} karakter.`)

  // contentType — optional enum
  let contentType: ContentType | undefined
  if (b.contentType !== undefined && b.contentType !== null && b.contentType !== '') {
    if (
      typeof b.contentType !== 'string' ||
      !(CONTENT_TYPES as readonly string[]).includes(b.contentType)
    ) {
      return fail('UNSUPPORTED_CONTENT_TYPE', 'Tipe konten tidak dikenali.')
    }
    contentType = b.contentType as ContentType
  }

  // tone — optional enum
  let tone: Tone | undefined
  if (b.tone !== undefined && b.tone !== null && b.tone !== '') {
    if (typeof b.tone !== 'string' || !(TONES as readonly string[]).includes(b.tone)) {
      return fail('UNSUPPORTED_TONE', 'Tone tidak dikenali.')
    }
    tone = b.tone as Tone
  }

  // count — optional, allowed 3 | 5 | 10
  let count: HookCount | undefined
  if (b.count !== undefined && b.count !== null && b.count !== '') {
    const n = typeof b.count === 'number' ? b.count : Number(b.count)
    if (!Number.isFinite(n) || !(HOOK_COUNTS as readonly number[]).includes(n)) {
      return fail('INVALID_COUNT', 'Jumlah hook hanya boleh 3, 5, atau 10.')
    }
    count = n as HookCount
  }

  // excludeHooks — optional
  let excludeHooks: string[] | undefined
  if (b.excludeHooks !== undefined && b.excludeHooks !== null) {
    if (!Array.isArray(b.excludeHooks)) {
      return fail('INVALID_INPUT', 'Format excludeHooks tidak valid.')
    }
    excludeHooks = b.excludeHooks
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim().slice(0, MAX_FIELD))
      .filter(Boolean)
      .slice(0, MAX_EXCLUDE)
  }

  return {
    ok: true,
    value: { topic, audience, contentType, tone, count, excludeHooks }
  }
}

export function validateFeedbackRequest(body: unknown): ValidationResult<Feedback> {
  if (typeof body !== 'object' || body === null) {
    return fail('INVALID_INPUT', 'Data yang dikirim tidak valid.')
  }
  const b = body as Record<string, unknown>

  const generationId = typeof b.generationId === 'string' ? b.generationId.trim() : ''
  const hookId = typeof b.hookId === 'string' ? b.hookId.trim() : ''
  if (!generationId || !hookId) return fail('INVALID_INPUT', 'generationId dan hookId wajib ada.')

  if (
    typeof b.rating !== 'string' ||
    !(FEEDBACK_RATINGS as readonly string[]).includes(b.rating)
  ) {
    return fail('INVALID_INPUT', 'Rating tidak valid.')
  }

  let reason: FeedbackReason | undefined
  if (b.reason !== undefined && b.reason !== null && b.reason !== '') {
    if (typeof b.reason !== 'string' || !(FEEDBACK_REASONS as readonly string[]).includes(b.reason)) {
      return fail('INVALID_INPUT', 'Alasan feedback tidak valid.')
    }
    reason = b.reason as FeedbackReason
  }

  return {
    ok: true,
    value: {
      generationId: generationId.slice(0, 64),
      hookId: hookId.slice(0, 32),
      rating: b.rating as FeedbackRating,
      reason
    }
  }
}

export function validateAnalyticsEvent(body: unknown): ValidationResult<AnalyticsEvent> {
  if (typeof body !== 'object' || body === null) {
    return fail('INVALID_INPUT', 'Data event tidak valid.')
  }
  const b = body as Record<string, unknown>

  if (
    typeof b.event !== 'string' ||
    !(ANALYTICS_EVENTS as readonly string[]).includes(b.event)
  ) {
    return fail('INVALID_INPUT', 'Nama event tidak dikenali.')
  }

  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim().slice(0, 64) : ''
  if (!sessionId) return fail('INVALID_INPUT', 'sessionId wajib ada.')

  const generationId =
    typeof b.generationId === 'string' ? b.generationId.trim().slice(0, 64) : undefined

  let metadata: Record<string, unknown> | undefined
  if (b.metadata && typeof b.metadata === 'object' && !Array.isArray(b.metadata)) {
    metadata = {}
    let i = 0
    for (const [k, v] of Object.entries(b.metadata as Record<string, unknown>)) {
      if (i++ >= 12) break
      if (['string', 'number', 'boolean'].includes(typeof v)) {
        metadata[k.slice(0, 40)] = typeof v === 'string' ? v.slice(0, 200) : v
      }
    }
  }

  return {
    ok: true,
    value: {
      event: b.event as AnalyticsEventName,
      sessionId,
      generationId,
      timestamp: Date.now(),
      metadata
    }
  }
}

function fail(code: APIError['code'], message: string): { ok: false; error: APIError } {
  return { ok: false, error: { code, message } }
}
