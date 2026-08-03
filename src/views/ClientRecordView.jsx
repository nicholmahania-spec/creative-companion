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
      groups.find(
        (g) => g.name.toLowerCase() === String(clientName).toLowerCase()
      ) || null
    )
  }, [projects, clientName])

  const summaryFor = (projectId) =>
    projectsSummary.find((s) => s.project?.id === projectId) || null

  /* Inline per-row rename (design). Same semantics as the project screen's
     title: Enter/blur-on-Save commits, an emptied field reverts. */
  const [renamingId, setRenamingId] = useState(null)
  const [draft, setDraft] = useState('')
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
    </div>
  )
}
