/**
 * Database access layer.
 * - Local dev (NODE_ENV=development): uses better-sqlite3 with a local file (dev.db)
 * - Cloudflare Pages (production): uses D1 via getRequestContext()
 */

import type {
  Person,
  CalendarEvent,
  ServiceJob,
  AgendaItem,
  JobRole,
  AgendaTag,
} from '@/types'

// ─── Database abstraction ─────────────────────────────────────────────────────

interface DbRow { [key: string]: unknown }

interface Db {
  first<T extends DbRow>(sql: string, params?: unknown[]): T | null
  all<T extends DbRow>(sql: string, params?: unknown[]): T[]
  run(sql: string, params?: unknown[]): void
  batch(statements: Array<{ sql: string; params?: unknown[] }>): void
}

// ─── Local SQLite (better-sqlite3) ───────────────────────────────────────────

function createLocalDb(): Db {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3')
  const path = require('path')
  const dbPath = path.join(process.cwd(), 'dev.db')
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // ── Schema version migrations ──────────────────────────────────────────────
  // v0: pre-versioned schema (may already exist on disk with old job roles)
  // v2: new job roles (TECHNIK_LEITER/MITARBEITER, GESANG_LEITER/MITARBEITER)

  const version = sqlite.pragma('user_version', { simple: true }) as number

  if (version < 2) {
    // Create or update all tables.
    // service_jobs is always dropped & recreated to ensure the CHECK constraint is current.
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        microsoft_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_service INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS agenda_items (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        title TEXT NOT NULL,
        tag TEXT CHECK(tag IN ('MODERATION','GEMEINSAMER_GESANG','KINDERGESCHICHTE','PREDIGT','BEITRAG')),
        person_id TEXT,
        duration INTEGER,
        FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
      );
      DROP TABLE IF EXISTS service_jobs;
      CREATE TABLE service_jobs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('TECHNIK_LEITER','TECHNIK_MITARBEITER','MODERATION','PREDIGT','KINDERGESCHICHTE','GESANG_LEITER','GESANG_MITARBEITER')),
        person_id TEXT,
        FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL,
        UNIQUE(event_id, role)
      );
      CREATE INDEX IF NOT EXISTS idx_agenda_event_order ON agenda_items(event_id, "order");
      CREATE INDEX IF NOT EXISTS idx_jobs_event ON service_jobs(event_id);
      CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_date);
    `)
    sqlite.pragma('user_version = 2')
  }

  if (version < 3) {
    // Remove UNIQUE(event_id, role) to allow multiple persons per role (e.g. TECHNIK_MITARBEITER)
    sqlite.exec(`
      DROP TABLE IF EXISTS service_jobs;
      CREATE TABLE service_jobs (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('TECHNIK_LEITER','TECHNIK_MITARBEITER','MODERATION','PREDIGT','KINDERGESCHICHTE','GESANG_LEITER','GESANG_MITARBEITER')),
        person_id TEXT,
        FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_event ON service_jobs(event_id);
    `)
    sqlite.pragma('user_version = 3')
  }

  if (version < 4) {
    // Add notes column to agenda_items
    sqlite.exec(`ALTER TABLE agenda_items ADD COLUMN notes TEXT`)
    sqlite.pragma('user_version = 4')
  }

  if (version < 5) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS service_invitations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        sent_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        responded_at TEXT,
        UNIQUE(event_id, person_id)
      );
      CREATE INDEX IF NOT EXISTS idx_invitations_token ON service_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_invitations_event ON service_invitations(event_id);
    `)
    sqlite.pragma('user_version = 5')
  }

  if (version < 6) {
    sqlite.exec(`UPDATE calendar_events SET title = 'Gebets-, Kinder- & Bibelstunde' WHERE title = 'Freitagabend'`)
    sqlite.pragma('user_version = 6')
  }

  if (version < 7) {
    sqlite.pragma('user_version = 7')
  }

  if (version < 8) {
    // Remove old-format dev seed entries that are duplicates of the dev-gottesdienst-* entries
    sqlite.exec(`
      DELETE FROM calendar_events
      WHERE title = 'Gottesdienst'
      AND microsoft_id LIKE 'dev-%'
      AND microsoft_id NOT LIKE 'dev-gottesdienst-%'
    `)
    sqlite.pragma('user_version = 8')
  }

  return {
    first<T extends DbRow>(sql: string, params: unknown[] = []): T | null {
      return (sqlite.prepare(sql).get(...params) as T) ?? null
    },
    all<T extends DbRow>(sql: string, params: unknown[] = []): T[] {
      return sqlite.prepare(sql).all(...params) as T[]
    },
    run(sql: string, params: unknown[] = []): void {
      sqlite.prepare(sql).run(...params)
    },
    batch(statements: Array<{ sql: string; params?: unknown[] }>): void {
      sqlite.transaction(() => {
        for (const { sql, params = [] } of statements) {
          sqlite.prepare(sql).run(...params)
        }
      })()
    },
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _localDb: Db | null = null

export function getDb(): Db {
  if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DB === 'true') {
    if (!_localDb) _localDb = createLocalDb()
    return _localDb
  }
  // Production: D1 (not synchronous — future async version needed)
  throw new Error('Production DB not yet configured. Set USE_LOCAL_DB=true or use Cloudflare D1.')
}

// ─── Row types ────────────────────────────────────────────────────────────────

type PersonRow = {
  id: string; first_name: string; last_name: string; email: string | null; created_at: string
}
type EventRow = {
  id: string; microsoft_id: string; title: string; start_date: string; end_date: string; is_service: number
}
type JobRow = {
  id: string; event_id: string; role: JobRole; person_id: string | null
  person_first_name?: string | null; person_last_name?: string | null; person_email?: string | null
}
type AgendaRow = {
  id: string; event_id: string; order: number; title: string; tag: AgendaTag | null
  person_id: string | null; duration: number | null; notes: string | null
  person_first_name?: string | null; person_last_name?: string | null; person_email?: string | null
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapPerson(r: PersonRow): Person {
  return { id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email, createdAt: r.created_at }
}
function mapEvent(r: EventRow): CalendarEvent {
  return { id: r.id, microsoftId: r.microsoft_id, title: r.title, startDate: r.start_date, endDate: r.end_date, isService: r.is_service === 1 }
}
function personFromRow(r: { person_id: string | null; person_first_name?: string | null; person_last_name?: string | null; person_email?: string | null }): Person | null {
  if (!r.person_id || !r.person_first_name) return null
  return { id: r.person_id, firstName: r.person_first_name, lastName: r.person_last_name ?? '', email: r.person_email ?? null, createdAt: '' }
}
function mapJob(r: JobRow): ServiceJob {
  return { id: r.id, eventId: r.event_id, role: r.role, personId: r.person_id, person: personFromRow(r) }
}
function mapAgenda(r: AgendaRow): AgendaItem {
  return { id: r.id, eventId: r.event_id, order: r.order, title: r.title, tag: r.tag, personId: r.person_id, duration: r.duration, notes: r.notes ?? null, person: personFromRow(r) }
}

function newId() { return crypto.randomUUID() }

// ─── Persons ──────────────────────────────────────────────────────────────────

export const personsDb = {
  async getAll(): Promise<Person[]> {
    return getDb().all<PersonRow>('SELECT * FROM persons ORDER BY last_name, first_name').map(mapPerson)
  },
  async getById(id: string): Promise<Person | null> {
    const r = getDb().first<PersonRow>('SELECT * FROM persons WHERE id = ?', [id])
    return r ? mapPerson(r) : null
  },
  async create(data: { firstName: string; lastName: string; email?: string }): Promise<Person> {
    const db = getDb()
    const id = newId()
    db.run('INSERT INTO persons (id, first_name, last_name, email) VALUES (?, ?, ?, ?)',
      [id, data.firstName, data.lastName, data.email ?? null])
    return mapPerson(db.first<PersonRow>('SELECT * FROM persons WHERE id = ?', [id])!)
  },
  async update(id: string, data: { firstName: string; lastName: string; email?: string | null }): Promise<Person | null> {
    getDb().run('UPDATE persons SET first_name=?, last_name=?, email=? WHERE id=?',
      [data.firstName, data.lastName, data.email ?? null, id])
    return personsDb.getById(id)
  },
  async delete(id: string): Promise<void> {
    getDb().run('DELETE FROM persons WHERE id = ?', [id])
  },
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const eventsDb = {
  async getUpcoming(limit = 30): Promise<CalendarEvent[]> {
    const now = new Date().toISOString()
    return getDb().all<EventRow>(
      'SELECT * FROM calendar_events WHERE start_date >= ? ORDER BY start_date LIMIT ?',
      [now, limit],
    ).map(mapEvent)
  },
  async getAll(): Promise<CalendarEvent[]> {
    return getDb().all<EventRow>(
      'SELECT * FROM calendar_events ORDER BY start_date',
    ).map(mapEvent)
  },
  async delete(id: string): Promise<void> {
    getDb().run('DELETE FROM calendar_events WHERE id = ?', [id])
  },
  async getById(id: string): Promise<CalendarEvent | null> {
    const r = getDb().first<EventRow>('SELECT * FROM calendar_events WHERE id = ?', [id])
    return r ? mapEvent(r) : null
  },
  async upsert(data: { microsoftId: string; title: string; startDate: string; endDate: string }): Promise<void> {
    const id = newId()
    getDb().run(
      `INSERT INTO calendar_events (id, microsoft_id, title, start_date, end_date) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(microsoft_id) DO UPDATE SET title=excluded.title, start_date=excluded.start_date, end_date=excluded.end_date`,
      [id, data.microsoftId, data.title, data.startDate, data.endDate],
    )
  },
  async getByMicrosoftId(microsoftId: string): Promise<CalendarEvent | null> {
    const r = getDb().first<EventRow>('SELECT * FROM calendar_events WHERE microsoft_id = ?', [microsoftId])
    return r ? mapEvent(r) : null
  },
  async getAllWithJobs(roles: JobRole[]): Promise<Array<CalendarEvent & { jobs: ServiceJob[] }>> {
    const db = getDb()
    const placeholders = roles.map(() => '?').join(',')
    const events = db.all<EventRow>('SELECT * FROM calendar_events ORDER BY start_date').map(mapEvent)
    if (events.length === 0) return []
    const jobs = db.all<JobRow>(
      `SELECT sj.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_jobs sj LEFT JOIN persons p ON p.id = sj.person_id
       WHERE sj.role IN (${placeholders}) ORDER BY sj.event_id`,
      roles,
    ).map(mapJob)
    const jobsByEvent = new Map<string, ServiceJob[]>()
    for (const j of jobs) {
      const arr = jobsByEvent.get(j.eventId) ?? []
      arr.push(j)
      jobsByEvent.set(j.eventId, arr)
    }
    return events.map((e) => ({ ...e, jobs: jobsByEvent.get(e.id) ?? [] }))
  },
}

// ─── Service Jobs ─────────────────────────────────────────────────────────────

export const jobsDb = {
  async getForEvent(eventId: string): Promise<ServiceJob[]> {
    return getDb().all<JobRow>(
      `SELECT sj.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_jobs sj LEFT JOIN persons p ON p.id = sj.person_id
       WHERE sj.event_id = ? ORDER BY sj.role`,
      [eventId],
    ).map(mapJob)
  },
  async upsert(data: { eventId: string; role: JobRole; personId: string | null }): Promise<void> {
    const db = getDb()
    db.run('DELETE FROM service_jobs WHERE event_id=? AND role=?', [data.eventId, data.role])
    if (data.personId) {
      db.run('INSERT INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
        [newId(), data.eventId, data.role, data.personId])
    }
  },
  async setMultiple(data: { eventId: string; role: JobRole; personIds: string[] }): Promise<void> {
    const db = getDb()
    db.run('DELETE FROM service_jobs WHERE event_id=? AND role=?', [data.eventId, data.role])
    for (const personId of data.personIds) {
      db.run('INSERT INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
        [newId(), data.eventId, data.role, personId])
    }
  },
}

// ─── Agenda Items ─────────────────────────────────────────────────────────────

export const agendaDb = {
  async getForEvent(eventId: string): Promise<AgendaItem[]> {
    return getDb().all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id
       WHERE ai.event_id = ? ORDER BY ai."order"`,
      [eventId],
    ).map(mapAgenda)
  },
  async create(data: {
    eventId: string; order: number; title: string
    tag?: AgendaTag | null; personId?: string | null; duration?: number | null; notes?: string | null
  }): Promise<AgendaItem> {
    const db = getDb()
    const id = newId()
    db.run(
      `INSERT INTO agenda_items (id, event_id, "order", title, tag, person_id, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.eventId, data.order, data.title, data.tag ?? null, data.personId ?? null, data.duration ?? null, data.notes ?? null],
    )
    return db.all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id WHERE ai.id = ?`,
      [id],
    ).map(mapAgenda)[0]
  },
  async update(id: string, data: { title?: string; tag?: AgendaTag | null; personId?: string | null; duration?: number | null; notes?: string | null }): Promise<AgendaItem | null> {
    const db = getDb()
    db.run(
      `UPDATE agenda_items SET title=?, tag=?, person_id=?, duration=?, notes=? WHERE id=?`,
      [data.title ?? '', data.tag ?? null, data.personId ?? null, data.duration ?? null, data.notes ?? null, id],
    )
    return db.all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id WHERE ai.id = ?`,
      [id],
    ).map(mapAgenda)[0] ?? null
  },
  async reorder(eventId: string, orderedIds: string[]): Promise<void> {
    getDb().batch(
      orderedIds.map((itemId, index) => ({
        sql: `UPDATE agenda_items SET "order"=? WHERE id=? AND event_id=?`,
        params: [index, itemId, eventId],
      })),
    )
  },
  async delete(id: string): Promise<void> {
    getDb().run('DELETE FROM agenda_items WHERE id = ?', [id])
  },
}

// ─── Invitations ───────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface Invitation {
  id: string
  eventId: string
  personId: string
  token: string
  sentAt: string
  status: InvitationStatus
  respondedAt: string | null
  person?: { firstName: string; lastName: string; email: string | null }
}

type InvitationRow = {
  id: string; event_id: string; person_id: string; token: string
  sent_at: string; status: string; responded_at: string | null
  person_first_name?: string; person_last_name?: string; person_email?: string | null
}

function mapInvitation(r: InvitationRow): Invitation {
  return {
    id: r.id, eventId: r.event_id, personId: r.person_id, token: r.token,
    sentAt: r.sent_at, status: r.status as InvitationStatus, respondedAt: r.responded_at,
    person: r.person_first_name ? {
      firstName: r.person_first_name, lastName: r.person_last_name!, email: r.person_email ?? null,
    } : undefined,
  }
}

export const invitationsDb = {
  async getForEvent(eventId: string): Promise<Invitation[]> {
    return getDb().all<InvitationRow>(
      `SELECT si.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_invitations si JOIN persons p ON p.id = si.person_id
       WHERE si.event_id = ? ORDER BY p.last_name, p.first_name`,
      [eventId],
    ).map(mapInvitation)
  },
  async getByToken(token: string): Promise<Invitation | null> {
    const r = getDb().first<InvitationRow>(
      `SELECT si.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_invitations si JOIN persons p ON p.id = si.person_id WHERE si.token = ?`,
      [token],
    )
    return r ? mapInvitation(r) : null
  },
  async isAlreadyInvited(eventId: string, personId: string): Promise<boolean> {
    return !!getDb().first(
      'SELECT id FROM service_invitations WHERE event_id = ? AND person_id = ?',
      [eventId, personId],
    )
  },
  async create(data: { eventId: string; personId: string }): Promise<Invitation> {
    const db = getDb()
    const id = newId()
    const token = crypto.randomUUID()
    const sentAt = new Date().toISOString()
    db.run(
      `INSERT INTO service_invitations (id, event_id, person_id, token, sent_at, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, data.eventId, data.personId, token, sentAt],
    )
    return (await this.getByToken(token))!
  },
  async respond(token: string, status: 'accepted' | 'declined'): Promise<Invitation | null> {
    const db = getDb()
    db.run(
      `UPDATE service_invitations SET status = ?, responded_at = ? WHERE token = ?`,
      [status, new Date().toISOString(), token],
    )
    return this.getByToken(token)
  },
}
