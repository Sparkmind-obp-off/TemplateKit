/**
 * TemplateKit — AI Provider Adapter (multi-provider + failover)
 * Ref: DOC 06 §5, §18 | DOC 07 §53 (Provider Response Isolation)
 *
 * Adapter mengubah response provider apa pun menjadi `GenerationResult`.
 * Domain tidak peduli provider yang digunakan.
 * Provider-specific detail TIDAK BOLEH bocor ke frontend.
 *
 * Provider yang didukung (semua OpenAI-compatible):
 *   - groq        → Groq Console      (api.groq.com/openai/v1)
 *   - openrouter  → OpenRouter        (openrouter.ai/api/v1)
 *   - openai      → generic / legacy  (base URL bebas)
 *
 * Failover: provider dicoba berurutan sesuai AI_PROVIDER_ORDER.
 * Jika semua gagal → generation service fallback ke template engine lokal.
 */

import type { FrameworkId, GenerationResult } from '../domain/types'
import { FRAMEWORK_IDS } from '../domain/types'
import { getTemplateByFramework } from '../templates/frameworks'

// ── Types ────────────────────────────────────────────────────────────────

export type ProviderId = 'groq' | 'openrouter' | 'openai'

export const PROVIDER_IDS: readonly ProviderId[] = ['groq', 'openrouter', 'openai'] as const

export interface AIProviderEnv {
  AI_PROVIDER_ORDER?: string

  GROQ_API_KEY?: string
  GROQ_BASE_URL?: string
  GROQ_MODEL?: string

  OPENROUTER_API_KEY?: string
  OPENROUTER_BASE_URL?: string
  OPENROUTER_MODEL?: string

  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
}

export interface GenerateArgs {
  systemPrompt: string
  userPrompt: string
  frameworkSlots: FrameworkId[]
  /** Naikkan variasi output saat regenerate. */
  temperature?: number
}

export interface AIProvider {
  /** Label untuk logging & health (bukan untuk user). */
  readonly id: string
  generate(args: GenerateArgs): Promise<GenerationResult>
}

export class ProviderTimeoutError extends Error {
  constructor(msg = 'Provider timeout') {
    super(msg)
    this.name = 'ProviderTimeoutError'
  }
}

export class ProviderError extends Error {
  constructor(msg: string, public readonly detail?: unknown) {
    super(msg)
    this.name = 'ProviderError'
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(msg = 'AI provider is not configured') {
    super(msg)
    this.name = 'ProviderNotConfiguredError'
  }
}

// ── Defaults per provider ────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30_000
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529])

interface ProviderPreset {
  baseUrl: string
  model: string
  /** Header tambahan (mis. attribution OpenRouter). */
  extraHeaders?: Record<string, string>
  /** Beberapa provider menolak `response_format`. */
  supportsJsonMode: boolean
}

const PRESETS: Record<ProviderId, ProviderPreset> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    // gpt-oss-120b: dukung json_mode + structured outputs, murah, cepat.
    model: 'openai/gpt-oss-120b',
    supportsJsonMode: true
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct',
    extraHeaders: {
      'HTTP-Referer': 'https://templatekit.pages.dev',
      'X-Title': 'TemplateKit Hook Generator'
    },
    supportsJsonMode: true
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    supportsJsonMode: true
  }
}

// ── Provider resolution ──────────────────────────────────────────────────

interface ResolvedProviderConfig {
  id: ProviderId
  apiKey: string
  baseUrl: string
  model: string
  extraHeaders?: Record<string, string>
  supportsJsonMode: boolean
}

function readProviderConfig(id: ProviderId, env: AIProviderEnv): ResolvedProviderConfig | null {
  const preset = PRESETS[id]
  const pick = (k: string) => {
    const v = (env as Record<string, string | undefined>)[k]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }

  const keyMap: Record<ProviderId, [string, string, string]> = {
    groq: ['GROQ_API_KEY', 'GROQ_BASE_URL', 'GROQ_MODEL'],
    openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_BASE_URL', 'OPENROUTER_MODEL'],
    openai: ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL']
  }

  const [keyName, urlName, modelName] = keyMap[id]
  const apiKey = pick(keyName)
  if (!apiKey) return null

  return {
    id,
    apiKey,
    baseUrl: (pick(urlName) || preset.baseUrl).replace(/\/+$/, ''),
    model: pick(modelName) || preset.model,
    extraHeaders: preset.extraHeaders,
    supportsJsonMode: preset.supportsJsonMode
  }
}

/** Urutan provider dari env, dengan default aman. */
export function resolveProviderOrder(env: AIProviderEnv): ProviderId[] {
  const raw = (env.AI_PROVIDER_ORDER || '').trim()
  const parsed = raw
    ? raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is ProviderId => (PROVIDER_IDS as readonly string[]).includes(s))
    : []

  const order = parsed.length > 0 ? parsed : ['groq', 'openrouter', 'openai']
  // dedupe, pertahankan urutan
  return order.filter((v, i) => order.indexOf(v) === i) as ProviderId[]
}

/** Provider mana saja yang punya kredensial (untuk /api/health). */
export function describeProviderStatus(env: AIProviderEnv): Array<{
  id: ProviderId
  configured: boolean
  model: string | null
}> {
  return resolveProviderOrder(env).map((id) => {
    const cfg = readProviderConfig(id, env)
    return { id, configured: !!cfg, model: cfg?.model ?? null }
  })
}

// ── OpenAI-compatible adapter ────────────────────────────────────────────

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string
  private cfg: ResolvedProviderConfig

  constructor(cfg: ResolvedProviderConfig) {
    this.cfg = cfg
    this.id = `${cfg.id}:${cfg.model}`
  }

  async generate({
    systemPrompt,
    userPrompt,
    frameworkSlots,
    temperature = 0.85
  }: GenerateArgs): Promise<GenerationResult> {
    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 1600
    }
    if (this.cfg.supportsJsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
          ...(this.cfg.extraHeaders ?? {})
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
    } catch (err) {
      clearTimeout(timer)
      if ((err as Error)?.name === 'AbortError') throw new ProviderTimeoutError()
      throw new ProviderError('Provider request failed', err)
    }
    clearTimeout(timer)

    if (!res.ok) {
      const raw = await res.text().catch(() => '')
      const err = new ProviderError(`Provider returned ${res.status}`, raw.slice(0, 400))
      // tandai retryable agar chain lanjut ke provider berikutnya
      ;(err as ProviderError & { retryable?: boolean }).retryable = RETRYABLE_STATUS.has(res.status)
      throw err
    }

    const json = (await res.json().catch(() => null)) as any

    // Beberapa gateway mengembalikan error 200 dengan body error.
    if (json?.error) {
      throw new ProviderError(String(json.error?.message ?? 'Provider error'), json.error)
    }

    const msg = json?.choices?.[0]?.message
    const content: string | undefined =
      typeof msg?.content === 'string'
        ? msg.content
        : Array.isArray(msg?.content)
          ? msg.content.map((p: any) => p?.text ?? '').join('')
          : undefined

    if (!content || !content.trim()) throw new ProviderError('Provider returned empty content')

    const parsed = parseHooksPayload(content)
    if (parsed.length === 0) throw new ProviderError('Provider output could not be parsed')

    // Map ke domain shape; frameworkId divalidasi terhadap slot yang diminta
    const hooks = parsed
      .map((h, i) => {
        const requested = frameworkSlots[i] ?? frameworkSlots[frameworkSlots.length - 1]
        const frameworkId = isFrameworkId(h.frameworkId) ? h.frameworkId : requested
        return {
          text: String(h.text ?? '').trim(),
          frameworkId,
          templateId: getTemplateByFramework(frameworkId).id,
          angle: String(h.angle ?? '').trim()
        }
      })
      .filter((h) => h.text.length > 0)

    if (hooks.length === 0) throw new ProviderError('Provider returned no usable hook')

    return {
      hooks,
      usage: {
        inputTokens: json?.usage?.prompt_tokens,
        outputTokens: json?.usage?.completion_tokens,
        totalTokens: json?.usage?.total_tokens
      },
      providerMetadata: { provider: this.cfg.id, model: this.cfg.model }
    }
  }
}

// ── Failover chain ───────────────────────────────────────────────────────

export interface ProviderAttempt {
  provider: string
  error: string
}

/**
 * Mencoba beberapa provider berurutan. Provider pertama yang berhasil dipakai.
 * Kegagalan satu provider TIDAK mematikan produk (DOC 06 §5).
 */
export class FailoverProvider implements AIProvider {
  readonly id: string
  private providers: OpenAICompatibleProvider[]
  private onAttemptFailed?: (a: ProviderAttempt) => void
  /** Provider yang akhirnya sukses pada call terakhir. */
  lastUsed: string | null = null

  constructor(
    providers: OpenAICompatibleProvider[],
    onAttemptFailed?: (a: ProviderAttempt) => void
  ) {
    if (providers.length === 0) throw new ProviderNotConfiguredError()
    this.providers = providers
    this.onAttemptFailed = onAttemptFailed
    this.id = providers.map((p) => p.id).join(' → ')
  }

  async generate(args: GenerateArgs): Promise<GenerationResult> {
    let lastErr: unknown = new ProviderNotConfiguredError()

    for (const p of this.providers) {
      try {
        const result = await p.generate(args)
        this.lastUsed = p.id
        return result
      } catch (err) {
        lastErr = err
        this.onAttemptFailed?.({
          provider: p.id,
          error: String((err as Error)?.message ?? err)
        })
      }
    }

    throw lastErr
  }
}

/**
 * Bangun failover chain dari env. Mengembalikan `null` jika tidak ada
 * provider yang dikonfigurasi — caller memakai template engine lokal.
 */
export function createProviderChain(
  env: AIProviderEnv,
  onAttemptFailed?: (a: ProviderAttempt) => void
): FailoverProvider | null {
  const configs = resolveProviderOrder(env)
    .map((id) => readProviderConfig(id, env))
    .filter((c): c is ResolvedProviderConfig => c !== null)

  if (configs.length === 0) return null

  return new FailoverProvider(
    configs.map((c) => new OpenAICompatibleProvider(c)),
    onAttemptFailed
  )
}

// ── Parsing ──────────────────────────────────────────────────────────────

function isFrameworkId(v: unknown): v is FrameworkId {
  return typeof v === 'string' && (FRAMEWORK_IDS as readonly string[]).includes(v)
}

/**
 * Robust parser: menerima JSON object, JSON dalam markdown fence,
 * atau array di root. Provider bisa bervariasi — parsing tidak boleh rapuh.
 */
function parseHooksPayload(
  content: string
): Array<{ frameworkId?: unknown; text?: unknown; angle?: unknown }> {
  const tryParse = (s: string): any => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }

  let data = tryParse(content.trim())

  if (!data) {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence) data = tryParse(fence[1].trim())
  }
  if (!data) {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start !== -1 && end > start) data = tryParse(content.slice(start, end + 1))
  }
  if (!data) {
    const start = content.indexOf('[')
    const end = content.lastIndexOf(']')
    if (start !== -1 && end > start) data = tryParse(content.slice(start, end + 1))
  }

  // Fallback terakhir: model membalas plain text baris-per-baris.
  if (!data) return parseLinesFallback(content)

  if (Array.isArray(data)) return normalizeList(data)
  if (Array.isArray(data.hooks)) return normalizeList(data.hooks)
  if (Array.isArray(data.data)) return normalizeList(data.data)
  if (Array.isArray(data.results)) return normalizeList(data.results)
  if (Array.isArray(data.output)) return normalizeList(data.output)

  // objek tunggal { text: "..." }
  if (typeof data === 'object' && data.text) return [data]

  return []
}

function normalizeList(list: unknown[]): Array<{ frameworkId?: unknown; text?: unknown; angle?: unknown }> {
  return list
    .map((item) => {
      if (typeof item === 'string') return { text: item }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        return {
          frameworkId: o.frameworkId ?? o.framework_id ?? o.framework,
          text: o.text ?? o.hook ?? o.content,
          angle: o.angle ?? o.perspective
        }
      }
      return { text: '' }
    })
    .filter((x) => typeof x.text === 'string' && (x.text as string).trim().length > 0)
}

function parseLinesFallback(
  content: string
): Array<{ frameworkId?: unknown; text?: unknown; angle?: unknown }> {
  return content
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((l) => l.length >= 12 && l.length <= 220)
    .slice(0, 10)
    .map((text) => ({ text }))
}
