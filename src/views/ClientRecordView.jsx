/**
 * Client record — one client, their contact routes, and every project under
 * them (2026 design handoff). The client is the first-class entity here:
 * repeat clients are the normal shape of the business, and this page is
 * where their work clusters.
 *
 * Derived, not stored: the record is built from the projects that carry
 * this client's name (buildClientGroups), same as the directory — there is
 * no second client entity to drift out of sync.
 */
import { useMemo, useState } from 'react'
import {
  buildClientGroups,
  clientMonogram,
  monogramTone,
} from '../lib/client/clientDirectory'
import { clientKey, clientRecordFor } from '../lib/client/clientRecord'
import { relativeDeadlineLabel } from '../lib/dates'
import useAppStore from '../store/useAppStore'
import '../styles/lazy-clients.css'

export default function ClientRecordView({
  clientName = '',
  projects = [],
  projectsSummary = [],
  listRowNext,
  openProject,
  onNewProject,
  flashMicro,
}) {
  const client = useMemo(() => {
    const groups = buildClientGroups(projects)
    return (
      groups.find((g) => clientKey(g.name) === clientKey(clientName)) || null
    )
  }, [projects, clientName])

  const summaryFor = (projectId) =>
    projectsSummary.find((s) => s.project?.id === projectId) || null

  /* Inline per-row rename (design). Same semantics as the project screen's
     title: Enter/blur-on-Save commits, an emptied field reverts. */
  const [renamingId, setRenamingId] = useState(null)
  const [draft, setDraft] = useState('')

  /* Client memory. Read straight from the store rather than passed down: it
     belongs to the client, not to any project, and threading it through the
     project props would put it back inside the thing it exists to outlive. */
  const clientRecords = useAppStore((st) => st.clientRecords)
  const record = clientRecordFor(clientRecords, clientName)
  const [prefDraft, setPrefDraft] = useState('')
  const addPref = () => {
    const line = prefDraft.trim()
    if (!line) return
    useAppStore.getState().addClientPreference(clientName, line)
    setPrefDraft('')
  }
  const commitRename = (project) => {
    const next = String(draft || '').trim()
    setRenamingId(null)
    if (!next || next === project.name) return
    useAppStore.getState().renameProject(project.id, next)
    flashMicro?.('Name saved')
  }

  if (!client) {
    return (
      <div className="client-record view-enter">
        <p className="clients-empty">
          No client named “{clientName}” — their projects may have been
          renamed or removed.
        </p>
      </div>
    )
  }

  const firstName = client.name.split(/\s+/)[0]

  return (
    <div className="client-record view-enter">
      <div className="client-record-head">
        <div
          className={`client-record-tile client-photo-monogram tone-${monogramTone(client.name)}`}
          aria-hidden="true"
        >
          {clientMonogram(client.name)}
        </div>
        <div className="client-record-id">
          <h1 className="client-record-name">{client.name}</h1>
          <p className="client-record-subline">
            {client.projects.length === 1
              ? '1 project'
              : `${client.projects.length} projects`}
          </p>
          <div className="client-record-contacts">
            {client.phone && (
              <a className="client-card-pill" href={`tel:${client.phone}`}>
                {client.phone}
              </a>
            )}
            {client.email && (
              <a className="client-card-pill" href={`mailto:${client.email}`}>
                {client.email}
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary client-record-new"
          onClick={() => onNewProject?.(client.name)}
        >
          New project for {firstName}
        </button>
      </div>

      <h2 className="client-record-section">Projects</h2>
      <ul className="client-record-projects">
        {client.projects.map((p) => {
          const s = summaryFor(p.id)
          const renaming = renamingId === p.id
          return (
            <li key={p.id} className="client-record-row">
              {renaming ? (
                <>
                  <input
                    className="client-record-rename-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitRename(p)
                      }
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    aria-label="Project name"
                    /* eslint-disable-next-line jsx-a11y/no-autofocus -- the
                       row just switched into an edit the user asked for */
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => commitRename(p)}
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="client-record-open"
                    onClick={() => openProject?.(p.id)}
                  >
                    <span className="client-record-project-name">{p.name}</span>
                    <span className="client-record-project-stage">
                      {s && listRowNext ? listRowNext(s) : ''}
                    </span>
                    <span className="client-record-project-due">
                      {relativeDeadlineLabel(p.deadline)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="client-record-rename"
                    aria-label={`Rename ${p.name}`}
                    onClick={() => {
                      setRenamingId(p.id)
                      setDraft(p.name || '')
                    }}
                  >
                    Rename
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>

      {/* What you know about them, as opposed to about the job.
          No count, no badge, no "0 notes" — empty is the ordinary state for a
          client you have just met, and marking it would turn meeting someone
          into an outstanding task. */}
      <h2 className="client-record-section">What I know about them</h2>
      <div className="client-memory">
        <label className="field-label" htmlFor="client-notes">
          Notes
        </label>
        <textarea
          id="client-notes"
          className="field-textarea client-memory-notes"
          rows={3}
          value={record.notes}
          placeholder="Anything worth remembering next time"
          onChange={(e) =>
            useAppStore.getState().setClientNotes(clientName, e.target.value)
          }
        />

        <ul className="client-memory-prefs">
          {record.preferences.map((pref) => (
            <li key={pref} className="client-memory-pref">
              <span>{pref}</span>
              <button
                type="button"
                className="client-memory-drop"
                onClick={() =>
                  useAppStore
                    .getState()
                    .removeClientPreference(clientName, pref)
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="client-memory-add">
          <label className="field-label" htmlFor="client-pref">
            Add a line
          </label>
          <input
            id="client-pref"
            className="field-input"
            value={prefDraft}
            placeholder="Prefers email"
            onChange={(e) => setPrefDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addPref()
              }
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={addPref}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
