'use client'

import { useEffect, useState } from 'react'
import type { AgendaTemplate, AgendaTag, AppUser, AppRole } from '@/types'
import { AGENDA_PRESETS, AGENDA_PRESET_LABELS, APP_ROLES, APP_ROLE_LABELS } from '@/types'

type ItemDraft = { title: string; tag: AgendaTag | ''; duration: string }
type TemplateDraft = { name: string; items: ItemDraft[] }
const emptyDraft: TemplateDraft = { name: '', items: [] }

export default function SettingsPage() {
  const [templates, setTemplates] = useState<AgendaTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User management
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  async function loadUsers() {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json() as AppUser[])
    setUsersLoading(false)
  }

  async function handleRoleChange(userId: string, newRole: AppRole) {
    setRoleChanging(userId)
    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    await loadUsers()
    setRoleChanging(null)
  }

  async function handleDeleteUser(userId: string, name: string | null) {
    if (!confirm(`Benutzer „${name ?? userId}" wirklich löschen?`)) return
    await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    await loadUsers()
  }

  async function load() {
    const res = await fetch('/api/templates')
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }

  useEffect(() => { load(); loadUsers() }, [])

  function startNew() {
    setEditing('new')
    setDraft(emptyDraft)
    setError(null)
  }

  function startEdit(t: AgendaTemplate) {
    setEditing(t.id)
    setDraft({
      name: t.name,
      items: t.items.map((i) => ({
        title: i.title,
        tag: i.tag ?? '',
        duration: i.duration != null ? String(i.duration) : '',
      })),
    })
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setDraft(emptyDraft)
    setError(null)
  }

  function addItem() {
    setDraft((d) => ({ ...d, items: [...d.items, { title: '', tag: '', duration: '' }] }))
  }

  function updateItem(index: number, field: keyof ItemDraft, value: string) {
    setDraft((d) => {
      const items = [...d.items]
      items[index] = { ...items[index], [field]: value }
      return { ...d, items }
    })
  }

  function removeItem(index: number) {
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== index) }))
  }

  function moveItem(index: number, dir: -1 | 1) {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= draft.items.length) return
    setDraft((d) => {
      const items = [...d.items]
      ;[items[index], items[newIndex]] = [items[newIndex], items[index]]
      return { ...d, items }
    })
  }

  async function handleSave() {
    if (!draft.name.trim()) { setError('Name erforderlich'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: draft.name.trim(),
        items: draft.items.map((item) => ({
          title: item.title.trim() || '—',
          tag: item.tag || null,
          duration: item.duration ? parseInt(item.duration) : null,
        })),
      }
      const res = editing === 'new'
        ? await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/templates/${editing}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Fehler beim Speichern')
      }
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Vorlage "${name}" wirklich löschen?`)) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 text-sm mt-1">Vorlagen und Konfiguration</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Agenda-Vorlagen</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ablauf-Vorlagen für Gottesdienste</p>
          </div>
          {editing === null && (
            <button onClick={startNew} className="btn-primary text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Vorlage
            </button>
          )}
        </div>

        {editing === 'new' && (
          <TemplateForm
            draft={draft} setDraft={setDraft}
            onAddItem={addItem} onUpdateItem={updateItem}
            onRemoveItem={removeItem} onMoveItem={moveItem}
            onSave={handleSave} onCancel={cancelEdit}
            saving={saving} error={error} title="Neue Vorlage"
          />
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm animate-pulse">Lädt…</div>
        ) : templates.length === 0 && editing !== 'new' ? (
          <div className="px-5 py-10 text-center">
            <p className="text-gray-400 text-sm">Noch keine Vorlagen vorhanden.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t.id}>
                {editing === t.id ? (
                  <TemplateForm
                    draft={draft} setDraft={setDraft}
                    onAddItem={addItem} onUpdateItem={updateItem}
                    onRemoveItem={removeItem} onMoveItem={moveItem}
                    onSave={handleSave} onCancel={cancelEdit}
                    saving={saving} error={error} title={`„${t.name}" bearbeiten`}
                  />
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.items.length} Punkt{t.items.length !== 1 ? 'e' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEdit(t)} className="btn-ghost px-2 py-1 text-xs">
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="btn-ghost px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User management */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Benutzer</h2>
            <p className="text-xs text-gray-400 mt-0.5">Rollen und Zugriffsrechte verwalten</p>
          </div>
        </div>
        {usersLoading ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm animate-pulse">Lädt…</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Keine Benutzer vorhanden.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.name ?? '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <select
                  className="select text-sm py-1 w-44 shrink-0"
                  value={u.role}
                  disabled={roleChanging === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as AppRole)}
                >
                  {APP_ROLES.map((r) => (
                    <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDeleteUser(u.id, u.name)}
                  className="btn-ghost px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateForm({
  draft, setDraft, onAddItem, onUpdateItem, onRemoveItem, onMoveItem,
  onSave, onCancel, saving, error, title,
}: {
  draft: TemplateDraft
  setDraft: React.Dispatch<React.SetStateAction<TemplateDraft>>
  onAddItem: () => void
  onUpdateItem: (i: number, f: keyof ItemDraft, v: string) => void
  onRemoveItem: (i: number) => void
  onMoveItem: (i: number, dir: -1 | 1) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
  title: string
}) {
  return (
    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="mb-4">
        <label className="label">Name</label>
        <input
          className="input max-w-xs"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="z. B. Abendmahl"
        />
      </div>

      <div className="mb-4">
        <label className="label mb-2">Ablauf-Punkte</label>
        {draft.items.length === 0 ? (
          <p className="text-xs text-gray-400 mb-2">Noch keine Punkte hinzugefügt.</p>
        ) : (
          <div className="space-y-1.5 mb-2">
            {draft.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>

                <input
                  className="input flex-1 min-w-0 text-sm py-1"
                  value={item.title}
                  onChange={(e) => onUpdateItem(i, 'title', e.target.value)}
                  placeholder="Titel"
                />

                <select
                  className="select text-xs py-1 w-36 shrink-0"
                  value={item.tag}
                  onChange={(e) => onUpdateItem(i, 'tag', e.target.value)}
                >
                  <option value="">— Kein Tag</option>
                  {AGENDA_PRESETS.map((tag) => (
                    <option key={tag} value={tag}>{AGENDA_PRESET_LABELS[tag]}</option>
                  ))}
                </select>

                <input
                  className="input w-16 text-xs py-1 shrink-0"
                  type="number"
                  min="1"
                  value={item.duration}
                  onChange={(e) => onUpdateItem(i, 'duration', e.target.value)}
                  placeholder="min"
                />

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onMoveItem(i, -1)}
                    disabled={i === 0}
                    className="btn-ghost p-1 disabled:opacity-30"
                    title="Nach oben"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onMoveItem(i, 1)}
                    disabled={i === draft.items.length - 1}
                    className="btn-ghost p-1 disabled:opacity-30"
                    title="Nach unten"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onRemoveItem(i)}
                    className="btn-ghost p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Entfernen"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onAddItem} className="btn-secondary text-xs py-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Punkt hinzufügen
        </button>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Abbrechen</button>
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
