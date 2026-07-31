/**
 * Client directory — Polaroid-style cards by default (visual recall —
 * the user recognizes clients by the brand logo, not by reading a name),
 * with a list-view toggle, search, and sort. View toggle intentionally
 * does not persist — always opens back to Polaroid view.
 */
import { useMemo, useState } from 'react'
import { labelForStepId } from '../lib/journey'
import {
  buildClientGroups,
  filterAndSortClients,
  clientMonogram,
  monogramTone,
} from '../lib/clientDirectory'
import '../styles/lazy-clients.css'

export default function ClientsView({ projects = [], selectProject, setActiveView }) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [view, setView] = useState('polaroid')

  const clients = useMemo(() => buildClientGroups(projects), [projects])
  const visible = useMemo(
    () => filterAndSortClients(clients, query, sortMode),
    [clients, query, sortMode]
  )

  const openProject = (project) => {
    selectProject(project.id)
    setActiveView('project')
  }

  return (
    <div className="clients-view view-enter">
      <div className="clients-view-head">
        <h1 className="page-title">Clients</h1>
        <div className="clients-view-controls">
          <input
            type="search"
            className="field-input clients-search"
            placeholder="Search clients or projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clients"
          />
          <select
            className="clients-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            aria-label="Sort clients"
          >
            <option value="recent">Most recent</option>
            <option value="alpha">A–Z</option>
          </select>
          <div className="clients-view-toggle" role="group" aria-label="Card or list view">
            <button
              type="button"
              className={`clients-view-toggle-btn${view === 'polaroid' ? ' is-active' : ''}`}
              onClick={() => setView('polaroid')}
              aria-pressed={view === 'polaroid'}
            >
              Cards
            </button>
            <button
              type="button"
              className={`clients-view-toggle-btn${view === 'list' ? ' is-active' : ''}`}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="clients-empty">
          {clients.length === 0
            ? `No clients yet — add a client name on a project’s ${labelForStepId('define')} step.`
            : 'No matches.'}
        </p>
      ) : view === 'polaroid' ? (
        <div className="clients-grid">
          {visible.map((c) => (
            <ClientCard key={c.name} client={c} onOpen={openProject} />
          ))}
        </div>
      ) : (
        <ul className="clients-list">
          {visible.map((c) => (
            <ClientRow key={c.name} client={c} onOpen={openProject} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ClientPhoto({ client }) {
  if (client.logoImage) {
    return <img className="client-photo" src={client.logoImage} alt="" />
  }
  return (
    <div className={`client-photo client-photo-monogram tone-${monogramTone(client.name)}`}>
      {clientMonogram(client.name)}
    </div>
  )
}

function ClientCard({ client, onOpen }) {
  return (
    <div className="client-card">
      <ClientPhoto client={client} />
      <div className="client-card-body">
        <p className="client-card-name">{client.name}</p>
        {!client.logoImage && (
          <p className="client-card-hint">Add a logo to use it here</p>
        )}
        <div className="client-card-actions">
          {client.phone && (
            <a className="btn btn-ghost btn-sm" href={`tel:${client.phone}`}>
              Call
            </a>
          )}
          {client.email && (
            <a className="btn btn-ghost btn-sm" href={`mailto:${client.email}`}>
              Email
            </a>
          )}
        </div>
        <ul className="client-card-projects">
          {client.projects.map((p) => (
            <li key={p.id}>
              <button type="button" className="text-link" onClick={() => onOpen(p)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ClientRow({ client, onOpen }) {
  return (
    <li className="client-row">
      <ClientPhoto client={client} />
      <div className="client-row-body">
        <p className="client-row-name">{client.name}</p>
        <ul className="client-row-projects">
          {client.projects.map((p) => (
            <li key={p.id}>
              <button type="button" className="text-link" onClick={() => onOpen(p)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="client-row-actions">
        {client.phone && (
          <a className="btn btn-ghost btn-sm" href={`tel:${client.phone}`}>
            Call
          </a>
        )}
        {client.email && (
          <a className="btn btn-ghost btn-sm" href={`mailto:${client.email}`}>
            Email
          </a>
        )}
      </div>
    </li>
  )
}
