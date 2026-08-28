/**
 * TemplateKit — Rate Limit (Module 07)
 * Ref: DOC 06 Module 07 | DOC 07 §28, §62
 *
 * Tujuan: abuse prevention + API cost protection.
 * Implementasi D1-backed sliding window agar konsisten di edge
 * (in-memory tidak reliable karena isolate bisa berganti).
 */

export interface RateLimitConfig {
  /** jumlah maksimum generation dalam window */
  limit: number
  /** panjang window dalam milidetik */
  windowMs: number
}

export const GENERATE_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60 * 60 * 1000 // 20 generation / jam per identity
}

export const BURST_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 1000 // 5 generation / menit per identity
}

export interface RateLimitVerdict {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Cek + catat pemakaian. D1 dipakai sebagai counter store.
 * Jika DB tidak tersedia, fail-open (jangan blokir user karena infra).
 */
export async function checkRateLimit(
  db: D1Database | undefined,
  identity: string,
  configs: RateLimitConfig[] = [BURST_RATE_LIMIT, GENERATE_RATE_LIMIT]
): Promise<RateLimitVerdict> {
  if (!db) return { allowed: true, remaining: configs[0].limit, retryAfterSeconds: 0 }

  const now = Date.now()

  try {
    for (const cfg of configs) {
      const since = now - cfg.windowMs
      const row = await db
        .prepare(
          `SELECT COUNT(*) AS c FROM rate_limit_hits WHERE identity = ? AND created_at >= ?`
        )
        .bind(identity, since)
        .first<{ c: number }>()

      const used = row?.c ?? 0
      if (used >= cfg.limit) {
        const oldest = await db
          .prepare(
            `SELECT MIN(created_at) AS t FROM rate_limit_hits WHERE identity = ? AND created_at >= ?`
          )
          .bind(identity, since)
          .first<{ t: number }>()
        const resetAt = (oldest?.t ?? now) + cfg.windowMs
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000))
        }
      }
    }

    // catat hit + housekeeping
    await db
      .prepare(`INSERT INTO rate_limit_hits (identity, created_at) VALUES (?, ?)`)
      .bind(identity, now)
      .run()

    const longest = configs.reduce((a, b) => (a.windowMs > b.windowMs ? a : b))
    await db
      .prepare(`DELETE FROM rate_limit_hits WHERE created_at < ?`)
      .bind(now - longest.windowMs)
      .run()

    const remainingRow = await db
      .prepare(`SELECT COUNT(*) AS c FROM rate_limit_hits WHERE identity = ? AND created_at >= ?`)
      .bind(identity, now - longest.windowMs)
      .first<{ c: number }>()

    return {
      allowed: true,
      remaining: Math.max(0, longest.limit - (remainingRow?.c ?? 0)),
      retryAfterSeconds: 0
    }
  } catch {
    // fail-open
    return { allowed: true, remaining: configs[0].limit, retryAfterSeconds: 0 }
  }
}

/** Identity anonim: sessionId + IP (bukan identitas pribadi — DOC 07 §36). */
export function buildIdentity(sessionId: string | undefined, ip: string | undefined): string {
  const s = (sessionId || 'anon').slice(0, 64)
  const i = (ip || 'noip').slice(0, 64)
  return `${s}|${i}`
}
