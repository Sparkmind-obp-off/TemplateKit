/**
 * TemplateKit — Generation Service (Application Layer)
 * Ref: DOC 05 §44 (Generation Logic Final) | DOC 06 §15 (API Flow)
 *
 * INPUT → Normalize → Extract Context → Select Frameworks → Select Templates
 * → Generate → Check Relevance/Naturalness/Diversity → Remove Duplicates
 * → Rank → Return Hooks
 *
 * Provider AI bersifat opsional & berlapis (failover). Jika seluruh provider
 * gagal, template engine lokal mengambil alih — produk tidak pernah mati.
 */

import type {
  FrameworkId,
  GenerationInput,
  GenerationContext,
  Hook,
  ResponseHook
} from '../domain/types'
import { buildContext } from '../domain/context'
import { FRAMEWORKS, selectFrameworks } from '../templates/frameworks'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt'
import { runQualityPipeline, type CandidateHook } from './quality'
import { renderLocalHooks } from '../templates/local-engine'
import { FailoverProvider, type AIProvider } from '../infrastructure/ai-provider'

/** Sumber hook yang benar-benar dipakai untuk response ini. */
export type GenerationEngine = 'ai' | 'template'

export interface GenerateHooksOutcome {
  generationId: string
  context: GenerationContext
  frameworksUsed: FrameworkId[]
  engine: GenerationEngine
  /** Provider yang benar-benar menghasilkan hook (internal, tidak ke user). */
  providerUsed: string | null
  hooks: Hook[]
  responseHooks: ResponseHook[]
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
}

export class QualityFailedError extends Error {
  constructor(msg = 'No hook passed the quality layer') {
    super(msg)
    this.name = 'QualityFailedError'
  }
}

export interface GenerateHooksOptions {
  /**
   * Provider AI. Boleh `null` — sistem tetap menghasilkan hook lewat
   * template engine lokal (DOC 05 §3 Template First, AI Second).
   */
  provider?: AIProvider | null
  /** Callback saat seluruh provider gagal, untuk logging di layer atas. */
  onProviderError?: (err: unknown) => void
}

export async function generateHooks(
  input: GenerationInput,
  options: GenerateHooksOptions = {}
): Promise<GenerateHooksOutcome> {
  const { provider = null, onProviderError } = options

  // 1. Normalize + Context Extraction
  const ctx = buildContext(input)
  const excludeHooks = (input.excludeHooks ?? []).slice(0, 20)

  // 2. Framework Selection (DOC 05 §20-21)
  //    Saat regenerate, rotasi urutan routing agar angle baru muncul.
  const rotation = excludeHooks.length > 0 ? Math.ceil(excludeHooks.length / ctx.count) : 0
  let frameworkSlots = selectFrameworks(ctx.contentType, ctx.count, [])
  if (rotation > 0) {
    frameworkSlots = rotateSlots(frameworkSlots, rotation)
  }

  // 3. Generation — AI dulu (kalau tersedia), lalu fallback ke template engine.
  //    DOC 06 §5: kegagalan provider tidak boleh mematikan produk.
  let engine: GenerationEngine = 'template'
  let providerUsed: string | null = null
  let usage: GenerateHooksOutcome['usage']
  let candidates: CandidateHook[] = []

  if (provider) {
    try {
      const userPrompt = buildUserPrompt(ctx, frameworkSlots, excludeHooks)
      // Regenerate → temperature lebih tinggi agar sudut pandang bergeser.
      const temperature = Math.min(1.05, 0.8 + rotation * 0.08)

      const result = await provider.generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        frameworkSlots,
        temperature
      })

      candidates = result.hooks.map((h) => ({
        text: h.text,
        frameworkId: h.frameworkId,
        templateId: h.templateId,
        angle: h.angle
      }))
      usage = result.usage
      engine = 'ai'
      providerUsed =
        provider instanceof FailoverProvider
          ? provider.lastUsed
          : (result.providerMetadata?.provider as string | undefined) ?? provider.id
    } catch (err) {
      onProviderError?.(err)
      candidates = []
    }
  }

  // 4. Quality Layer: filter → dedupe → score → rank
  let scored = candidates.length > 0 ? runQualityPipeline(candidates, ctx, { excludeHooks }) : []

  // 4b. Top-up: AI berhasil tapi kurang dari yang diminta setelah quality
  //     filter → lengkapi dengan template engine agar user tetap menerima
  //     jumlah hook yang dia pilih.
  if (scored.length > 0 && scored.length < ctx.count) {
    const need = ctx.count - scored.length
    const filler = renderLocalHooks(ctx, rotateSlots(frameworkSlots, scored.length), rotation + 1)
    const topUp = runQualityPipeline(filler, ctx, {
      excludeHooks: [...excludeHooks, ...scored.map((h) => h.text)],
      minTotalScore: 0
    }).slice(0, need)
    scored = [...scored, ...topUp]
  }

  // 4c. Fallback penuh: template engine lokal (deterministik, tanpa AI).
  if (scored.length === 0) {
    engine = 'template'
    providerUsed = null
    usage = undefined
    const local = renderLocalHooks(ctx, frameworkSlots, rotation)
    scored = runQualityPipeline(local, ctx, { excludeHooks, minTotalScore: 0 })
  }

  if (scored.length === 0) throw new QualityFailedError()

  // 5. Trim ke count yang diminta & assign hook id (DOC 07 §20)
  const finalScored = scored.slice(0, ctx.count)

  const hooks: Hook[] = finalScored.map((h, i) => ({
    id: `hook-${String(i + 1).padStart(2, '0')}`,
    text: h.text,
    frameworkId: h.frameworkId,
    templateId: h.templateId,
    angle: h.angle,
    qualityScore: h.qualityScore
  }))

  // DOC 07 §23 — user-facing response: qualityScore & templateId internal
  const responseHooks: ResponseHook[] = hooks.map((h) => ({
    id: h.id,
    text: h.text,
    frameworkId: h.frameworkId,
    framework: FRAMEWORKS[h.frameworkId].name,
    angle: h.angle || undefined
  }))

  return {
    generationId: crypto.randomUUID(),
    context: ctx,
    frameworksUsed: hooks.map((h) => h.frameworkId),
    engine,
    providerUsed,
    hooks,
    responseHooks,
    usage
  }
}

function rotateSlots(slots: FrameworkId[], by: number): FrameworkId[] {
  if (slots.length === 0) return slots
  const n = ((by % slots.length) + slots.length) % slots.length
  return [...slots.slice(n), ...slots.slice(0, n)]
}
