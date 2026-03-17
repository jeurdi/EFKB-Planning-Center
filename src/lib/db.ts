/**
 * Database access layer — MariaDB via mysql2/promise.
 * Run `npm run migrate` once to create the schema.
 */

import type {
  Person, CalendarEvent, ServiceJob, AgendaItem, JobRole, AgendaTag, EventType,
  AgendaTemplate, AgendaTemplateItem,
} from '@/types'
import mysql from 'mysql2/promise'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any[]

// ─── Pool singleton ───────────────────────────────────────────────────────────

let _pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host:             process.env.DB_HOST     || 'localhost',
      port:             Number(process.env.DB_PORT) || 3306,
      user:             process.env.DB_USER     || 'planung',
      password:         process.env.DB_PASSWORD || '',
      database:         process.env.DB_NAME     || 'planung',
      waitForConnections: true,
      connectionLimit:  10,
      charset:          'utf8mb4',
    })
  }
  return _pool
}

// ─── Db abstraction ───────────────────────────────────────────────────────────

interface DbRow { [key: string]: unknown }

interface Db {
  first<T extends DbRow>(sql: string, params?: unknown[]): Promise<T | null>
  all<T extends DbRow>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<void>
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>
}

export function getDb(): Db {
  const pool = getPool()
  return {
    async first<T extends DbRow>(sql: string, params: unknown[] = []): Promise<T | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params as P)
      return (rows as T[])[0] ?? null
    },
    async all<T extends DbRow>(sql: string, params: unknown[] = []): Promise<T[]> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params as P)
      return rows as T[]
    },
    async run(sql: string, params: unknown[] = []): Promise<void> {
      await pool.execute(sql, params as P)
    },
    async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void> {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        for (const { sql, params = [] } of statements) {
          await conn.execute(sql, params as P)
        }
        await conn.commit()
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }
    },
  }
}

// ─── Row types ────────────────────────────────────────────────────────────────

type PersonRow = {
  id: string; first_name: string; last_name: string; email: string | null; created_at: string
  roles?: string | null
}
type EventRow = {
  id: string; microsoft_id: string; title: string; start_date: string; end_date: string; is_service: number
  type: string; is_public: number; needs_planning: number; vermeldungen: string | null; thema: string | null; gebetsanliegen: string | null
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
  return {
    id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email, createdAt: r.created_at,
    roles: r.roles ? (r.roles.split(',') as JobRole[]) : [],
  }
}
function mapEvent(r: EventRow): CalendarEvent {
  return {
    id: r.id, microsoftId: r.microsoft_id, title: r.title, startDate: r.start_date, endDate: r.end_date,
    isService: r.is_service === 1,
    eventType: (r.type ?? 'SONSTIGE') as EventType,
    isPublic: r.is_public !== 0,
    needsPlanning: r.needs_planning === 1,
    vermeldungen: r.vermeldungen ?? null,
    thema: r.thema ?? null,
    gebetsanliegen: r.gebetsanliegen ?? null,
  }
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
    const rows = await getDb().all<PersonRow>(`
      SELECT p.*, GROUP_CONCAT(pr.role) as roles
      FROM persons p
      LEFT JOIN person_roles pr ON pr.person_id = p.id
      GROUP BY p.id
      ORDER BY p.last_name, p.first_name
    `)
    return rows.map(mapPerson)
  },
  async getById(id: string): Promise<Person | null> {
    const r = await getDb().first<PersonRow>(`
      SELECT p.*, GROUP_CONCAT(pr.role) as roles
      FROM persons p
      LEFT JOIN person_roles pr ON pr.person_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id])
    return r ? mapPerson(r) : null
  },
  async create(data: { firstName: string; lastName: string; email?: string }): Promise<Person> {
    const db = getDb()
    const id = newId()
    await db.run('INSERT INTO persons (id, first_name, last_name, email) VALUES (?, ?, ?, ?)',
      [id, data.firstName, data.lastName, data.email ?? null])
    return (await personsDb.getById(id))!
  },
  async update(id: string, data: { firstName: string; lastName: string; email?: string | null }): Promise<Person | null> {
    await getDb().run('UPDATE persons SET first_name=?, last_name=?, email=? WHERE id=?',
      [data.firstName, data.lastName, data.email ?? null, id])
    return personsDb.getById(id)
  },
  async delete(id: string): Promise<void> {
    await getDb().run('DELETE FROM persons WHERE id = ?', [id])
  },
}

// ─── Person Roles ─────────────────────────────────────────────────────────────

export const personRolesDb = {
  async getForPerson(personId: string): Promise<JobRole[]> {
    const rows = await getDb().all<{ role: string }>(
      'SELECT role FROM person_roles WHERE person_id = ? ORDER BY role', [personId]
    )
    return rows.map((r) => r.role as JobRole)
  },
  async setForPerson(personId: string, roles: JobRole[]): Promise<void> {
    await getDb().batch([
      { sql: 'DELETE FROM person_roles WHERE person_id = ?', params: [personId] },
      ...roles.map((role) => ({
        sql: 'INSERT INTO person_roles (person_id, role) VALUES (?, ?)',
        params: [personId, role],
      })),
    ])
  },
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const eventsDb = {
  async getUpcoming(limit = 30): Promise<CalendarEvent[]> {
    const now = new Date().toISOString()
    const rows = await getDb().all<EventRow>(
      'SELECT * FROM calendar_events WHERE start_date >= ? ORDER BY start_date LIMIT ?',
      [now, limit],
    )
    return rows.map(mapEvent)
  },
  async getAll(): Promise<CalendarEvent[]> {
    const rows = await getDb().all<EventRow>('SELECT * FROM calendar_events ORDER BY start_date')
    return rows.map(mapEvent)
  },
  async delete(id: string): Promise<void> {
    await getDb().run('DELETE FROM calendar_events WHERE id = ?', [id])
  },
  async getById(id: string): Promise<CalendarEvent | null> {
    const r = await getDb().first<EventRow>('SELECT * FROM calendar_events WHERE id = ?', [id])
    return r ? mapEvent(r) : null
  },
  async upsert(data: { microsoftId: string; title: string; startDate: string; endDate: string; eventType?: EventType; isPublic?: boolean; needsPlanning?: boolean }): Promise<void> {
    const id = newId()
    await getDb().run(
      `INSERT INTO calendar_events (id, microsoft_id, title, start_date, end_date, type, is_public, needs_planning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), start_date=VALUES(start_date), end_date=VALUES(end_date)`,
      [id, data.microsoftId, data.title, data.startDate, data.endDate,
       data.eventType ?? 'SONSTIGE', data.isPublic !== false ? 1 : 0, data.needsPlanning ? 1 : 0],
    )
  },
  async update(id: string, data: { title?: string; startDate?: string; endDate?: string; isPublic?: boolean; needsPlanning?: boolean; vermeldungen?: string | null; thema?: string | null; gebetsanliegen?: string | null }): Promise<CalendarEvent | null> {
    const current = await eventsDb.getById(id)
    if (!current) return null
    await getDb().run(
      'UPDATE calendar_events SET title=?, start_date=?, end_date=?, is_public=?, needs_planning=?, vermeldungen=?, thema=?, gebetsanliegen=? WHERE id=?',
      [
        data.title ?? current.title,
        data.startDate ?? current.startDate,
        data.endDate ?? current.endDate,
        data.isPublic !== undefined ? (data.isPublic ? 1 : 0) : (current.isPublic ? 1 : 0),
        data.needsPlanning !== undefined ? (data.needsPlanning ? 1 : 0) : (current.needsPlanning ? 1 : 0),
        data.vermeldungen !== undefined ? data.vermeldungen : current.vermeldungen,
        data.thema !== undefined ? data.thema : current.thema,
        data.gebetsanliegen !== undefined ? data.gebetsanliegen : current.gebetsanliegen,
        id,
      ],
    )
    return eventsDb.getById(id)
  },
  async getByMicrosoftId(microsoftId: string): Promise<CalendarEvent | null> {
    const r = await getDb().first<EventRow>('SELECT * FROM calendar_events WHERE microsoft_id = ?', [microsoftId])
    return r ? mapEvent(r) : null
  },
  async getAllWithJobs(roles: JobRole[]): Promise<Array<CalendarEvent & { jobs: ServiceJob[] }>> {
    const db = getDb()
    const placeholders = roles.map(() => '?').join(',')
    const events = (await db.all<EventRow>('SELECT * FROM calendar_events ORDER BY start_date')).map(mapEvent)
    if (events.length === 0) return []
    const jobs = (await db.all<JobRow>(
      `SELECT sj.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_jobs sj LEFT JOIN persons p ON p.id = sj.person_id
       WHERE sj.role IN (${placeholders}) ORDER BY sj.event_id`,
      roles,
    )).map(mapJob)
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
    const rows = await getDb().all<JobRow>(
      `SELECT sj.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_jobs sj LEFT JOIN persons p ON p.id = sj.person_id
       WHERE sj.event_id = ? ORDER BY sj.role`,
      [eventId],
    )
    return rows.map(mapJob)
  },
  async upsert(data: { eventId: string; role: JobRole; personId: string | null }): Promise<void> {
    const db = getDb()
    await db.run('DELETE FROM service_jobs WHERE event_id=? AND role=?', [data.eventId, data.role])
    if (data.personId) {
      await db.run('INSERT INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
        [newId(), data.eventId, data.role, data.personId])
    }
  },
  async setMultiple(data: { eventId: string; role: JobRole; personIds: string[] }): Promise<void> {
    const db = getDb()
    await db.run('DELETE FROM service_jobs WHERE event_id=? AND role=?', [data.eventId, data.role])
    await db.batch(data.personIds.map((personId) => ({
      sql: 'INSERT INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
      params: [newId(), data.eventId, data.role, personId],
    })))
  },
}

// ─── Agenda Items ─────────────────────────────────────────────────────────────

export const agendaDb = {
  async getForEvent(eventId: string): Promise<AgendaItem[]> {
    const rows = await getDb().all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id
       WHERE ai.event_id = ? ORDER BY ai.\`order\``,
      [eventId],
    )
    return rows.map(mapAgenda)
  },
  async create(data: {
    eventId: string; order: number; title: string
    tag?: AgendaTag | null; personId?: string | null; duration?: number | null; notes?: string | null
  }): Promise<AgendaItem> {
    const db = getDb()
    const id = newId()
    await db.run(
      'INSERT INTO agenda_items (id, event_id, `order`, title, tag, person_id, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.eventId, data.order, data.title, data.tag ?? null, data.personId ?? null, data.duration ?? null, data.notes ?? null],
    )
    const rows = await db.all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id WHERE ai.id = ?`,
      [id],
    )
    return rows.map(mapAgenda)[0]
  },
  async update(id: string, data: { title?: string; tag?: AgendaTag | null; personId?: string | null; duration?: number | null; notes?: string | null }): Promise<AgendaItem | null> {
    const db = getDb()
    await db.run(
      'UPDATE agenda_items SET title=?, tag=?, person_id=?, duration=?, notes=? WHERE id=?',
      [data.title ?? '', data.tag ?? null, data.personId ?? null, data.duration ?? null, data.notes ?? null, id],
    )
    const rows = await db.all<AgendaRow>(
      `SELECT ai.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM agenda_items ai LEFT JOIN persons p ON p.id = ai.person_id WHERE ai.id = ?`,
      [id],
    )
    return rows.map(mapAgenda)[0] ?? null
  },
  async reorder(eventId: string, orderedIds: string[]): Promise<void> {
    await getDb().batch(
      orderedIds.map((itemId, index) => ({
        sql: 'UPDATE agenda_items SET `order`=? WHERE id=? AND event_id=?',
        params: [index, itemId, eventId],
      })),
    )
  },
  async delete(id: string): Promise<void> {
    await getDb().run('DELETE FROM agenda_items WHERE id = ?', [id])
  },
}

// ─── Agenda Templates ─────────────────────────────────────────────────────────

type TemplateRow = { id: string; name: string; created_at: string }
type TemplateItemRow = {
  id: string; template_id: string; order: number; title: string
  tag: AgendaTag | null; duration: number | null
}

function mapTemplateItem(r: TemplateItemRow): AgendaTemplateItem {
  return { id: r.id, templateId: r.template_id, order: r.order, title: r.title, tag: r.tag, duration: r.duration }
}
function mapTemplate(r: TemplateRow, items: TemplateItemRow[]): AgendaTemplate {
  return { id: r.id, name: r.name, createdAt: r.created_at, items: items.map(mapTemplateItem) }
}

export const templatesDb = {
  async getAll(): Promise<AgendaTemplate[]> {
    const db = getDb()
    const rows = await db.all<TemplateRow>('SELECT * FROM agenda_templates ORDER BY name')
    if (rows.length === 0) return []
    const allItems = await db.all<TemplateItemRow>('SELECT * FROM agenda_template_items ORDER BY `order`')
    return rows.map((r) => mapTemplate(r, allItems.filter((i) => i.template_id === r.id)))
  },

  async getById(id: string): Promise<AgendaTemplate | null> {
    const db = getDb()
    const r = await db.first<TemplateRow>('SELECT * FROM agenda_templates WHERE id = ?', [id])
    if (!r) return null
    const items = await db.all<TemplateItemRow>(
      'SELECT * FROM agenda_template_items WHERE template_id = ? ORDER BY `order`', [id],
    )
    return mapTemplate(r, items)
  },

  async create(data: {
    name: string
    items: Array<{ title: string; tag?: AgendaTag | null; duration?: number | null }>
  }): Promise<AgendaTemplate> {
    const id = newId()
    await getDb().batch([
      { sql: 'INSERT INTO agenda_templates (id, name) VALUES (?, ?)', params: [id, data.name] },
      ...data.items.map((item, i) => ({
        sql: 'INSERT INTO agenda_template_items (id, template_id, `order`, title, tag, duration) VALUES (?, ?, ?, ?, ?, ?)',
        params: [newId(), id, i, item.title, item.tag ?? null, item.duration ?? null],
      })),
    ])
    return (await this.getById(id))!
  },

  async update(id: string, data: {
    name: string
    items: Array<{ title: string; tag?: AgendaTag | null; duration?: number | null }>
  }): Promise<AgendaTemplate | null> {
    await getDb().run('UPDATE agenda_templates SET name = ? WHERE id = ?', [data.name, id])
    await getDb().batch([
      { sql: 'DELETE FROM agenda_template_items WHERE template_id = ?', params: [id] },
      ...data.items.map((item, i) => ({
        sql: 'INSERT INTO agenda_template_items (id, template_id, `order`, title, tag, duration) VALUES (?, ?, ?, ?, ?, ?)',
        params: [newId(), id, i, item.title, item.tag ?? null, item.duration ?? null],
      })),
    ])
    return this.getById(id)
  },

  async delete(id: string): Promise<void> {
    await getDb().run('DELETE FROM agenda_templates WHERE id = ?', [id])
  },
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined'

export interface Invitation {
  id: string; eventId: string; personId: string; token: string
  sentAt: string; status: InvitationStatus; respondedAt: string | null
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
    const rows = await getDb().all<InvitationRow>(
      `SELECT si.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_invitations si JOIN persons p ON p.id = si.person_id
       WHERE si.event_id = ? ORDER BY p.last_name, p.first_name`,
      [eventId],
    )
    return rows.map(mapInvitation)
  },
  async getByToken(token: string): Promise<Invitation | null> {
    const r = await getDb().first<InvitationRow>(
      `SELECT si.*, p.first_name as person_first_name, p.last_name as person_last_name, p.email as person_email
       FROM service_invitations si JOIN persons p ON p.id = si.person_id WHERE si.token = ?`,
      [token],
    )
    return r ? mapInvitation(r) : null
  },
  async isAlreadyInvited(eventId: string, personId: string): Promise<boolean> {
    const r = await getDb().first(
      'SELECT id FROM service_invitations WHERE event_id = ? AND person_id = ?',
      [eventId, personId],
    )
    return !!r
  },
  async create(data: { eventId: string; personId: string }): Promise<Invitation> {
    const id = newId()
    const token = crypto.randomUUID()
    const sentAt = new Date().toISOString()
    await getDb().run(
      `INSERT INTO service_invitations (id, event_id, person_id, token, sent_at, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, data.eventId, data.personId, token, sentAt],
    )
    return (await this.getByToken(token))!
  },
  async respond(token: string, status: 'accepted' | 'declined'): Promise<Invitation | null> {
    await getDb().run(
      'UPDATE service_invitations SET status = ?, responded_at = ? WHERE token = ?',
      [status, new Date().toISOString(), token],
    )
    return this.getByToken(token)
  },
}
