/**
 * One-time import: copies all data from dev.db (SQLite) into MariaDB.
 * Run: node scripts/import-from-sqlite.js
 */

const fs = require('fs')
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}

const Database = require('better-sqlite3')
const mysql    = require('mysql2/promise')
const path     = require('path')

async function main() {
  const sqlite = new Database(path.join(process.cwd(), 'dev.db'))
  sqlite.pragma('foreign_keys = OFF')

  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'planungstool',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'planungstool',
    waitForConnections: true,
    connectionLimit: 5,
  })

  const conn = await pool.getConnection()

  try {
    // Disable FK checks during import
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0')
    await conn.beginTransaction()

    // ── persons ──────────────────────────────────────────────────────────────
    const persons = sqlite.prepare('SELECT * FROM persons').all()
    console.log(`Importing ${persons.length} persons...`)
    for (const p of persons) {
      await conn.execute(
        'INSERT IGNORE INTO persons (id, first_name, last_name, email, created_at) VALUES (?, ?, ?, ?, ?)',
        [p.id, p.first_name, p.last_name, p.email ?? null, p.created_at]
      )
    }

    // ── person_roles ──────────────────────────────────────────────────────────
    const pRoles = sqlite.prepare('SELECT * FROM person_roles').all()
    console.log(`Importing ${pRoles.length} person roles...`)
    for (const r of pRoles) {
      await conn.execute(
        'INSERT IGNORE INTO person_roles (person_id, role) VALUES (?, ?)',
        [r.person_id, r.role]
      )
    }

    // ── calendar_events ───────────────────────────────────────────────────────
    const events = sqlite.prepare('SELECT * FROM calendar_events').all()
    console.log(`Importing ${events.length} calendar events...`)
    for (const e of events) {
      await conn.execute(
        `INSERT IGNORE INTO calendar_events
           (id, microsoft_id, title, start_date, end_date, is_service, type, is_public, needs_planning, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id, e.microsoft_id, e.title, e.start_date, e.end_date,
          e.is_service ?? 1,
          e.type ?? 'SONSTIGE',
          e.is_public ?? 1,
          e.needs_planning ?? 0,
          e.created_at ?? new Date().toISOString()
        ]
      )
    }

    // ── service_jobs ──────────────────────────────────────────────────────────
    const jobs = sqlite.prepare('SELECT * FROM service_jobs').all()
    console.log(`Importing ${jobs.length} service jobs...`)
    for (const j of jobs) {
      await conn.execute(
        'INSERT IGNORE INTO service_jobs (id, event_id, role, person_id) VALUES (?, ?, ?, ?)',
        [j.id, j.event_id, j.role, j.person_id ?? null]
      )
    }

    // ── agenda_items ──────────────────────────────────────────────────────────
    const agenda = sqlite.prepare('SELECT * FROM agenda_items').all()
    console.log(`Importing ${agenda.length} agenda items...`)
    for (const a of agenda) {
      await conn.execute(
        'INSERT IGNORE INTO agenda_items (id, event_id, `order`, title, tag, person_id, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [a.id, a.event_id, a.order, a.title, a.tag ?? null, a.person_id ?? null, a.duration ?? null, a.notes ?? null]
      )
    }

    // ── service_invitations ───────────────────────────────────────────────────
    let invitations = []
    try {
      invitations = sqlite.prepare('SELECT * FROM service_invitations').all()
    } catch { /* table may not exist in older DBs */ }
    console.log(`Importing ${invitations.length} invitations...`)
    for (const i of invitations) {
      await conn.execute(
        `INSERT IGNORE INTO service_invitations
           (id, event_id, person_id, token, sent_at, status, responded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.event_id, i.person_id, i.token, i.sent_at, i.status, i.responded_at ?? null]
      )
    }

    await conn.commit()
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1')

    console.log('\n✓ Import complete!')

    // Summary
    const tables = ['persons','person_roles','calendar_events','service_jobs','agenda_items','service_invitations']
    for (const t of tables) {
      const [[row]] = await conn.execute(`SELECT COUNT(*) as cnt FROM \`${t}\``)
      console.log(`  ${t}: ${row.cnt} rows`)
    }

  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
    await pool.end()
    sqlite.close()
  }
}

main().catch(err => { console.error('Import failed:', err.message); process.exit(1) })
