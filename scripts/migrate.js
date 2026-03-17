/**
 * Database migration script for MariaDB.
 * Run once: npm run migrate
 */
// Load .env.local manually (no dotenv dependency needed)
const fs = require('fs')
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  })
}
const mysql = require('mysql2/promise')

async function main() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'planung',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'planung',
    multipleStatements: true,
  })

  console.log('Running migrations...')

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INT NOT NULL DEFAULT 0
    )
  `)

  const [vrows] = await pool.execute('SELECT version FROM schema_version LIMIT 1')
  if (vrows.length === 0) {
    await pool.execute('INSERT INTO schema_version (version) VALUES (0)')
  }
  const version = vrows[0]?.version ?? 0
  console.log('Current schema version:', version)

  if (version < 1) {
    console.log('Applying migration v1: create all tables...')
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS persons (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        first_name  TEXT         NOT NULL,
        last_name   TEXT         NOT NULL,
        email       VARCHAR(255) UNIQUE,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id              VARCHAR(36)  NOT NULL PRIMARY KEY,
        microsoft_id    VARCHAR(255) NOT NULL UNIQUE,
        title           TEXT         NOT NULL,
        start_date      VARCHAR(30)  NOT NULL,
        end_date        VARCHAR(30)  NOT NULL,
        is_service      TINYINT(1)   NOT NULL DEFAULT 1,
        type            VARCHAR(50)  NOT NULL DEFAULT 'SONSTIGE',
        is_public       TINYINT(1)   NOT NULL DEFAULT 1,
        needs_planning  TINYINT(1)   NOT NULL DEFAULT 0,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_events_start (start_date)
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS service_jobs (
        id          VARCHAR(36) NOT NULL PRIMARY KEY,
        event_id    VARCHAR(36) NOT NULL,
        role        VARCHAR(50) NOT NULL,
        person_id   VARCHAR(36),
        FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id)         ON DELETE SET NULL,
        INDEX idx_jobs_event (event_id)
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agenda_items (
        id          VARCHAR(36) NOT NULL PRIMARY KEY,
        event_id    VARCHAR(36) NOT NULL,
        \`order\`   INT         NOT NULL,
        title       TEXT        NOT NULL,
        tag         VARCHAR(50),
        person_id   VARCHAR(36),
        duration    INT,
        notes       TEXT,
        FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id)         ON DELETE SET NULL,
        INDEX idx_agenda_event_order (event_id, \`order\`)
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS service_invitations (
        id            VARCHAR(36) NOT NULL PRIMARY KEY,
        event_id      VARCHAR(36) NOT NULL,
        person_id     VARCHAR(36) NOT NULL,
        token         VARCHAR(36) NOT NULL UNIQUE,
        sent_at       VARCHAR(30) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending',
        responded_at  VARCHAR(30),
        UNIQUE KEY uniq_event_person (event_id, person_id),
        FOREIGN KEY (event_id)  REFERENCES calendar_events(id) ON DELETE CASCADE,
        FOREIGN KEY (person_id) REFERENCES persons(id)         ON DELETE CASCADE,
        INDEX idx_invitations_token (token),
        INDEX idx_invitations_event (event_id)
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS person_roles (
        person_id VARCHAR(36) NOT NULL,
        role      VARCHAR(50) NOT NULL,
        PRIMARY KEY (person_id, role),
        FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
        INDEX idx_person_roles_person (person_id)
      )
    `)
    await pool.execute('UPDATE schema_version SET version = 1')
    console.log('Migration v1 applied.')
  }

  if (version < 2) {
    console.log('Applying migration v2: agenda templates...')
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agenda_templates (
        id          VARCHAR(36) NOT NULL PRIMARY KEY,
        name        TEXT        NOT NULL,
        created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS agenda_template_items (
        id          VARCHAR(36) NOT NULL PRIMARY KEY,
        template_id VARCHAR(36) NOT NULL,
        \`order\`   INT         NOT NULL,
        title       TEXT        NOT NULL,
        tag         VARCHAR(50),
        duration    INT,
        FOREIGN KEY (template_id) REFERENCES agenda_templates(id) ON DELETE CASCADE,
        INDEX idx_template_items_template (template_id)
      )
    `)
    await pool.execute('UPDATE schema_version SET version = 2')
    console.log('Migration v2 applied.')
  }

  console.log('All migrations complete.')
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
