-- TemplateKit — Initial Schema
-- Ref: DOC 07 §42–§47 (Database Model, Tables, Indexing)
-- Prinsip: Do not model data that the product does not yet use (DOC 07 §71).
-- Tidak ada users / subscriptions / organizations / teams / workspaces.

-- ── generations (DOC 07 §43) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generations (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL,
  generator_type TEXT NOT NULL DEFAULT 'hook',
  status         TEXT NOT NULL,
  topic          TEXT NOT NULL,
  audience       TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  tone           TEXT NOT NULL,
  count          INTEGER NOT NULL,
  error_code     TEXT,
  created_at     INTEGER NOT NULL,
  completed_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_generations_session_id ON generations(session_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);

-- ── hooks (DOC 07 §44) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hooks (
  id            TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  text          TEXT NOT NULL,
  framework_id  TEXT NOT NULL,
  template_id   TEXT NOT NULL,
  angle         TEXT,
  quality_score REAL,
  created_at    INTEGER NOT NULL,
  PRIMARY KEY (generation_id, id),
  FOREIGN KEY (generation_id) REFERENCES generations(id)
);

CREATE INDEX IF NOT EXISTS idx_hooks_generation_id ON hooks(generation_id);
CREATE INDEX IF NOT EXISTS idx_hooks_framework_id ON hooks(framework_id);

-- ── feedback (DOC 07 §45) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id TEXT NOT NULL,
  hook_id       TEXT NOT NULL,
  rating        TEXT NOT NULL,
  reason        TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_generation_id ON feedback(generation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_hook_id ON feedback(hook_id);

-- ── analytics_events (DOC 07 §46) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event         TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  generation_id TEXT,
  source        TEXT,
  metadata      TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);

-- ── rate_limit_hits (DOC 06 Module 07) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  identity   TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identity_time ON rate_limit_hits(identity, created_at);
