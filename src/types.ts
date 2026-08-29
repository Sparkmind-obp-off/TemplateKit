/**
 * TemplateKit — Cloudflare Bindings & Environment
 *
 * Provider AI dikonfigurasi lewat secret (bukan hardcode).
 * Urutan failover ditentukan oleh AI_PROVIDER_ORDER.
 */

export interface Bindings {
  DB?: D1Database

  /** Urutan provider, dipisah koma. Contoh: "groq,openrouter" */
  AI_PROVIDER_ORDER?: string

  // ── Groq Console (https://api.groq.com/openai/v1) ──────────────────
  GROQ_API_KEY?: string
  GROQ_BASE_URL?: string
  GROQ_MODEL?: string

  // ── OpenRouter (https://openrouter.ai/api/v1) ─────────────────────
  OPENROUTER_API_KEY?: string
  OPENROUTER_BASE_URL?: string
  OPENROUTER_MODEL?: string

  // ── Generic OpenAI-compatible (opsional / legacy) ──────────────────
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
}
