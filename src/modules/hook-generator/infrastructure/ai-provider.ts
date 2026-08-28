/**
 * TemplateKit — AI Provider Adapter
 * Ref: DOC 06 §5, §18 | DOC 07 §53 (Provider Response Isolation)
 *
 * Adapter mengubah response provider apa pun menjadi `GenerationResult`.
 * Domain tidak peduli provider yang digunakan.
 * Provider-specific detail TIDAK BOLEH bocor ke frontend.
 */

import type { FrameworkId, GenerationResult } from '../domain/types'
import { FRAMEWORK_IDS } from '../domain/types'
import { getTemplateByFramework } from '../templates/frameworks'

export interface AIProviderEnv {
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
}

export interface AIProvider {
  generate(args: {
    systemPrompt: string
    userPrompt: string
    frameworkSlots: FrameworkId[]
  }): Promise<GenerationResult>
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

const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_MODEL = 'gpt-5-mini'
const DEFAULT_BASE_URL = 'https://www.genspark.ai/api/llm_proxy/v1'

/**
 * OpenAI-compatible chat completions adapter.
 */
export class OpenAICompatibleProvider implements AIProvider {
  private apiKey: string
  private baseUrl: string
  private model: string

  constructor(env: AIProviderEnv) {
    if (!env.OPENAI_API_KEY) {
      throw new ProviderError('AI provider is not configured')
    }
    this.apiKey = env.OPENAI_API_KEY
    this.baseUrl = (env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.model = env.OPENAI_MODEL || DEFAULT_MODEL
  }

  async generate({
    systemPrompt,
    userPrompt,
    frameworkSlots
  }: {
    systemPrompt: string
    userPrompt: string
    frameworkSlots: FrameworkId[]
  }): Promise<GenerationResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })
    } catch (err) {
      clearTimeout(timer)
      if ((err as Error)?.name === 'AbortError') throw new ProviderTimeoutError()
      throw new ProviderError('Provider request failed', err)
    }
    clearTimeout(timer)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ProviderError(`Provider returned ${res.status}`, body.slice(0, 500))
    }

    const json = (await res.json().catch(() => null)) as any
    const content: string | undefined = json?.choices?.[0]?.message?.content
    if (!content) throw new ProviderError('Provider returned empty content')

    const parsed = parseHooksPayload(content)
    if (parsed.length === 0) throw new ProviderError('Provider output could not be parsed')

    // Map ke domain shape; frameworkId divalidasi terhadap slot yang diminta
    const hooks = parsed.map((h, i) => {
      const requested = frameworkSlots[i] ?? frameworkSlots[frameworkSlots.length - 1]
      const frameworkId = isFrameworkId(h.frameworkId) ? h.frameworkId : requested
      return {
        text: String(h.text ?? '').trim(),
        frameworkId,
        templateId: getTemplateByFramework(frameworkId).id,
        angle: String(h.angle ?? '').trim()
      }
    })

    return {
      hooks,
      usage: {
        inputTokens: json?.usage?.prompt_tokens,
        outputTokens: json?.usage?.completion_tokens,
        totalTokens: json?.usage?.total_tokens
      },
      providerMetadata: { model: this.model }
    }
  }
}

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
  if (!data) return []

  if (Array.isArray(data)) return data
  if (Array.isArray(data.hooks)) return data.hooks
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  return []
}
