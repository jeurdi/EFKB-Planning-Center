'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AgendaItem, AgendaTag, Person, ServiceJob } from '@/types'
import { AGENDA_PRESET_BORDER } from '@/types'
import { AgendaItemForm } from './AgendaItemForm'

// ─── Single sortable row ───────────────────────────────────────────────────────

function SortableRow({
  item,
  onEdit,
  onDelete,
}: {
  item: AgendaItem
  onEdit: (item: AgendaItem) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const borderColor = item.tag ? AGENDA_PRESET_BORDER[item.tag as AgendaTag] : 'border-l-gray-200'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 border-l-4 ${borderColor} group ${isDragging ? 'bg-blue-50 rounded-r-lg' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Ziehen zum Verschieben"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5" cy="4" r="1.2" />
          <circle cx="11" cy="4" r="1.2" />
          <circle cx="5" cy="8" r="1.2" />
          <circle cx="11" cy="8" r="1.2" />
          <circle cx="5" cy="12" r="1.2" />
          <circle cx="11" cy="12" r="1.2" />
        </svg>
      </button>

      {/* Order number */}
      <span className="flex-shrink-0 text-xs text-gray-400 w-5 text-right">
        {item.order + 1}.
      </span>

      {/* Title + person */}
      <div className="flex-1 min-w-0">
        <div>
          <span className="font-medium text-gray-900 text-sm">{item.title}</span>
          {item.person && (
            <span className="ml-2 text-xs text-gray-400">
              {item.person.firstName} {item.person.lastName}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Duration */}
      {item.duration && (
        <span className="flex-shrink-0 text-xs text-gray-400">{item.duration} min</span>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(item)}
          className="btn-ghost p-1"
          title="Bearbeiten"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="btn-ghost p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
          title="Löschen"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── AgendaBuilder ────────────────────────────────────────────────────────────

interface AgendaBuilderProps {
  eventId: string
  items: AgendaItem[]
  persons: Person[]
  jobs: ServiceJob[]          // needed for person auto-fill in the form
  onChange: (items: AgendaItem[]) => void
}

export function AgendaBuilder({ eventId, items, persons, jobs, onChange }: AgendaBuilderProps) {
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<AgendaItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...items]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    const withNewOrders = reordered.map((item, idx) => ({ ...item, order: idx }))
    onChange(withNewOrders)

    await fetch(`/api/services/${eventId}/agenda`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: withNewOrders.map((i) => i.id) }),
    })
  }

  function handleSaved(saved: AgendaItem) {
    if (editItem) {
      onChange(items.map((i) => (i.id === saved.id ? saved : i)))
      setEditItem(null)
    } else {
      onChange([...items, saved])
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Agendapunkt löschen?')) return
    await fetch(`/api/services/${eventId}/agenda/${id}`, { method: 'DELETE' })
    onChange(items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx })))
  }

  const totalMinutes = items.reduce((sum, i) => sum + (i.duration ?? 0), 0)

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Ablauf
          {items.length > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              {items.length} Punkte
              {totalMinutes > 0 && ` · ${totalMinutes} min`}
            </span>
          )}
        </h2>
        {!showForm && !editItem && (
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Punkt hinzufügen
          </button>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && !showForm ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-400 text-sm">Noch kein Ablauf geplant.</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-secondary mt-3 text-xs py-1.5"
          >
            Ersten Punkt hinzufügen
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <div key={item.id}>
                  {editItem?.id === item.id ? (
                    <div className="px-4 py-3">
                      <AgendaItemForm
                        eventId={eventId}
                        item={item}
                        persons={persons}
                        jobs={jobs}
                        onSave={handleSaved}
                        onCancel={() => setEditItem(null)}
                      />
                    </div>
                  ) : (
                    <SortableRow
                      item={item}
                      onEdit={(i) => { setShowForm(false); setEditItem(i) }}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Total duration */}
      {items.length > 0 && totalMinutes > 0 && (
        <div className="flex justify-end px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
          Gesamt: <span className="font-semibold ml-1">{totalMinutes} min</span>
        </div>
      )}

      {/* Add form */}
      {showForm && !editItem && (
        <div className="px-4 py-3 border-t border-gray-100">
          <AgendaItemForm
            eventId={eventId}
            persons={persons}
            jobs={jobs}
            onSave={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  )
}
