/**
 * TemplateKit — Persistence (optional, DOC 07 §42–§48)
 *
 * Database bersifat OPTIONAL untuk core generation.
 * Semua fungsi di sini fail-safe: kalau DB tidak ada / error,
 * generation tetap berhasil. Persistence hanya untuk measurement.
 *
 * DOC 07 §48 — Data Retention: jangan menyimpan lebih dari yang dibutuhkan.
 */

import type { AnalyticsEvent, Feedback, Hook, GenerationContext } from '../modules/hook-generator/domain/types'

export async function saveGeneration(
  db: D1Database | undefined,
  args: {
    generationId: string
    sessionId: string
    ctx: GenerationContext
    hooks: Hook[]
  }
): Promise<void> {
  if (!db) return
  const now = Date.now()
  try {
    const statements: D1PreparedStatement[] = []

    statements.push(
      db
        .prepare(
          `INSERT INTO generations
             (id, session_id, generator_type, status, topic, audience, content_type, tone, count, created_at, completed_at)
           VALUES (?, ?, 'hook', 'success', ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          args.generationId,
          args.sessionId,
          args.ctx.topic,
          args.ctx.audience,
          args.ctx.contentType,
          args.ctx.tone,
          args.ctx.count,
          now,
          now
        )
    )

    for (const h of args.hooks) {
      statements.push(
        db
          .prepare(
            `INSERT INTO hooks
               (id, generation_id, text, framework_id, template_id, angle, quality_score, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            h.id,
            args.generationId,
            h.text,
            h.frameworkId,
            h.templateId,
            h.angle || null,
            h.qualityScore?.total ?? null,
            now
          )
      )
    }

    await db.batch(statements)
  } catch {
    // silent: persistence tidak boleh menggagalkan generation
  }
}

export async function saveFailedGeneration(
  db: D1Database | undefined,
  args: { generationId: string; sessionId: string; ctx: GenerationContext; errorCode: string }
): Promise<void> {
  if (!db) return
  const now = Date.now()
  try {
    await db
      .prepare(
        `INSERT INTO generations
           (id, session_id, generator_type, status, topic, audience, content_type, tone, count, created_at, completed_at, error_code)
         VALUES (?, ?, 'hook', 'failed', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        args.generationId,
        args.sessionId,
        args.ctx.topic,
        args.ctx.audience,
        args.ctx.contentType,
        args.ctx.tone,
        args.ctx.count,
        now,
        now,
        args.errorCode
      )
      .run()
  } catch {
    /* silent */
  }
}

export async function saveFeedback(
  db: D1Database | undefined,
  fb: Feedback
): Promise<void> {
  if (!db) return
  try {
    await db
      .prepare(
        `INSERT INTO feedback (generation_id, hook_id, rating, reason, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(fb.generationId, fb.hookId, fb.rating, fb.reason ?? null, Date.now())
      .run()
  } catch {
    /* silent */
  }
}

export async function saveEvent(
  db: D1Database | undefined,
  ev: AnalyticsEvent,
  extra?: { source?: string | null }
): Promise<void> {
  if (!db) return
  try {
    await db
      .prepare(
        `INSERT INTO analytics_events (event, session_id, generation_id, source, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        ev.event,
        ev.sessionId,
        ev.generationId ?? null,
        extra?.source ?? null,
        ev.metadata ? JSON.stringify(ev.metadata).slice(0, 2000) : null,
        ev.timestamp ?? Date.now()
      )
      .run()
  } catch {
    /* silent */
  }
}

/** Funnel summary sederhana untuk validasi pasar (DOC 02 §17). */
export async function getFunnelStats(db: D1Database | undefined) {
  if (!db) return null
  try {
    const events = await db
      .prepare(
        `SELECT event, COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions
         FROM analytics_events GROUP BY event`
      )
      .all<{ event: string; total: number; sessions: number }>()

    const gens = await db
      .prepare(
        `SELECT status, COUNT(*) AS total FROM generations GROUP BY status`
      )
      .all<{ status: string; total: number }>()

    const frameworks = await db
      .prepare(
        `SELECT framework_id, COUNT(*) AS total, ROUND(AVG(quality_score), 2) AS avg_score
         FROM hooks GROUP BY framework_id ORDER BY total DESC`
      )
      .all<{ framework_id: string; total: number; avg_score: number }>()

    const fb = await db
      .prepare(`SELECT rating, reason, COUNT(*) AS total FROM feedback GROUP BY rating, reason`)
      .all<{ rating: string; reason: string | null; total: number }>()

    return {
      events: events.results ?? [],
      generations: gens.results ?? [],
      frameworks: frameworks.results ?? [],
      feedback: fb.results ?? []
    }
  } catch {
    return null
  }
}
