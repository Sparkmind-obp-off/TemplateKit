/**
 * TemplateKit — Hook Generator Domain Types
 * Ref: DOC 07 — DATA MODEL & API CONTRACT v1.0 (LOCKED)
 *
 * Contract First. Implementation Second.
 */

// ── Enums (DOC 07 §10, §11) ──────────────────────────────────────────────

export const CONTENT_TYPES = [
  'general',
  'product_review',
  'product_promotion',
  'educational',
  'tutorial',
  'storytelling'
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const TONES = ['casual', 'professional', 'bold', 'curious'] as const

export type Tone = (typeof TONES)[number]

export const HOOK_COUNTS = [3, 5, 10] as const

export type HookCount = (typeof HOOK_COUNTS)[number]

// DOC 07 §15 — Framework ID harus stabil
export const FRAMEWORK_IDS = [
  'curiosity',
  'problem',
  'mistake',
  'benefit',
  'contrarian',
  'story',
  'question'
] as const

export type FrameworkId = (typeof FRAMEWORK_IDS)[number]

// DOC 07 §7
export type GenerationStatus = 'pending' | 'generating' | 'success' | 'failed'

// DOC 07 §68 — MVP hanya `hook`
export type GeneratorType = 'hook'

// ── Entities ─────────────────────────────────────────────────────────────

/** DOC 07 §8 — GenerationInput */
export interface GenerationInput {
  topic: string
  audience: string
  contentType?: ContentType
  tone?: Tone
  count?: HookCount
  /** DOC 07 §33-34 — regenerate exclusion context */
  excludeHooks?: string[]
}

/** DOC 07 §12 — GenerationContext (hasil normalisasi + extraction) */
export interface GenerationContext {
  topic: string
  audience: string
  contentType: ContentType
  tone: Tone
  count: HookCount
  problem?: string | null
  desiredResult?: string | null
  benefit?: string | null
  mistake?: string | null
  commonBelief?: string | null
  activity?: string | null
  context?: string | null
}

/** DOC 07 §14 — Framework entity */
export interface Framework {
  id: FrameworkId
  name: string
  objective: string
  priority: number
  active: boolean
}

/** DOC 07 §16 — Template entity */
export interface Template {
  id: string
  version: string
  frameworkId: FrameworkId
  purpose: string
  pattern: string
  alternativePattern?: string
  variables: string[]
  constraints: string[]
  active: boolean
}

/** DOC 07 §21 — QualityScore (internal, tidak dikirim ke user) */
export interface QualityScore {
  relevance: number
  strength: number
  naturalness: number
  specificity: number
  diversity: number
  total: number
}

/** DOC 07 §19 — Hook entity */
export interface Hook {
  id: string
  text: string
  frameworkId: FrameworkId
  templateId: string
  angle: string
  qualityScore?: QualityScore
}

/** DOC 07 §54 — Internal generation result dari AI adapter */
export interface GenerationResult {
  hooks: Array<{
    text: string
    frameworkId: FrameworkId
    templateId: string
    angle: string
  }>
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  providerMetadata?: Record<string, unknown>
}

/** DOC 07 §22 — User-facing response hook shape */
export interface ResponseHook {
  id: string
  text: string
  frameworkId: FrameworkId
  framework: string
  angle?: string
}

/** DOC 07 §22 — GenerateHookResponse */
export interface GenerateHookResponse {
  generationId: string
  status: 'success'
  hooks: ResponseHook[]
}

// ── Errors (DOC 07 §31) ──────────────────────────────────────────────────

export const ERROR_CODES = [
  'INVALID_INPUT',
  'UNSUPPORTED_CONTENT_TYPE',
  'UNSUPPORTED_TONE',
  'INVALID_COUNT',
  'RATE_LIMITED',
  'GENERATION_FAILED',
  'QUALITY_FAILED',
  'PROVIDER_TIMEOUT',
  'INTERNAL_ERROR'
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export interface APIError {
  code: ErrorCode
  message: string
}

/** DOC 07 §38 — Analytics event enum */
export const ANALYTICS_EVENTS = [
  'page_view',
  'generator_view',
  'generate_click',
  'generation_success',
  'generation_error',
  'copy_click',
  'regenerate_click',
  'create_another_click',
  'feedback_positive',
  'feedback_negative'
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/** DOC 07 §37 */
export interface AnalyticsEvent {
  event: AnalyticsEventName
  sessionId: string
  generationId?: string
  timestamp?: number
  metadata?: Record<string, unknown>
}

/** DOC 07 §41 */
export const FEEDBACK_RATINGS = ['positive', 'negative'] as const
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number]

export const FEEDBACK_REASONS = [
  'too_generic',
  'not_relevant',
  'too_long',
  'unnatural',
  'other'
] as const
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export interface Feedback {
  generationId: string
  hookId: string
  rating: FeedbackRating
  reason?: FeedbackReason
}
