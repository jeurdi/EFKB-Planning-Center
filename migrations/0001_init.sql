-- Persons: the church member / volunteer database
CREATE TABLE IF NOT EXISTS persons (
  id         TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Calendar events synced from Microsoft Calendar
CREATE TABLE IF NOT EXISTS calendar_events (
  id           TEXT PRIMARY KEY,
  microsoft_id TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL,
  is_service   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Job assignments per service (Technik, Moderation, Predigt, Kindergeschichte)
CREATE TABLE IF NOT EXISTS service_jobs (
  id        TEXT PRIMARY KEY,
  event_id  TEXT NOT NULL,
  role      TEXT NOT NULL CHECK(role IN ('TECHNIK', 'MODERATION', 'PREDIGT', 'KINDERGESCHICHTE')),
  person_id TEXT,
  FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id)         ON DELETE SET NULL,
  UNIQUE(event_id, role)
);

-- Agenda items per service
CREATE TABLE IF NOT EXISTS agenda_items (
  id        TEXT PRIMARY KEY,
  event_id  TEXT NOT NULL,
  "order"   INTEGER NOT NULL,
  title     TEXT NOT NULL,
  tag       TEXT CHECK(tag IN ('MODERATION', 'GEMEINSAMER_GESANG', 'KINDERGESCHICHTE', 'PREDIGT', 'BEITRAG')),
  person_id TEXT,
  duration  INTEGER,
  FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id)         ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agenda_items_event_order
  ON agenda_items(event_id, "order");

CREATE INDEX IF NOT EXISTS idx_service_jobs_event
  ON service_jobs(event_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start
  ON calendar_events(start_date);
