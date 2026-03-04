-- Family Memory — D1 Schema
-- 6 tables: recipients, questions, assignments, responses, admin_users, audit_log

CREATE TABLE IF NOT EXISTS recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT NOT NULL DEFAULT 'family',
  generation TEXT CHECK(generation IN ('grandparent', 'parent', 'sibling', 'child', 'extended')) DEFAULT 'parent',
  avatar_url TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  theme TEXT NOT NULL CHECK(theme IN ('childhood', 'family', 'career', 'wisdom', 'traditions')),
  follow_up TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'opened', 'completed', 'skipped', 'expired')),
  sent_at TEXT,
  opened_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('audio', 'text', 'photo')),
  -- Audio/photo: R2 key. Text: stored inline.
  r2_key TEXT,
  text_content TEXT,
  file_size INTEGER,
  duration_seconds REAL,
  mime_type TEXT,
  -- Transcription
  transcription_status TEXT DEFAULT 'none' CHECK(transcription_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
  transcription_text TEXT,
  transcription_word_count INTEGER,
  -- Admin annotations
  admin_notes TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rate limiting for PIN auth
CREATE TABLE IF NOT EXISTS pin_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ip TEXT NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_token ON assignments(token);
CREATE INDEX IF NOT EXISTS idx_assignments_recipient ON assignments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_responses_assignment ON responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
