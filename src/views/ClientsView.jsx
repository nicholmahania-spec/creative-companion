/**
 * Client directory — Polaroid-style cards (visual recall: the user recognizes
 * clients by the brand logo, not by reading a name), with search and sort.
 * No card/list view toggle: a presentation preference the user re-decides on
 * every visit is pure decision-fatigue overhead — neither view does more work
 * than the other, so we commit to the recognizable one. (#18)
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
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="clients-empty">
          {clients.length === 0
            ? `No clients yet — add a client name on a project’s ${labelForStepId('define')} step.`
            : 'No matches.'}
        </p>
      ) : (
        <div className="clients-grid">
          {visible.map((c) => (
            <ClientCard key={c.name} client={c} onOpen={openProject} />
          ))}
        </div>
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
