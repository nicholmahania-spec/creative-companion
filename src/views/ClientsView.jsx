/**
 * Client directory — card grid (visual recall: the user recognizes clients by
 * the brand logo/monogram, not by reading a name), with search and a sort
 * segmented control.
 *
 * Reskinned to the 2026 design handoff: 2px title underline, square monogram
 * tiles, Call/Email pills, underlined project links, segmented sort.
 *
 * NO card/list view toggle, deliberately. The handoff redrew one, but the
 * adhd-executive-function-advisor reconciled it against #18 and ruled it out:
 * a view preference re-decided every visit is decision-fatigue overhead with
 * no task payoff (a List view does no work Cards don't at a studio-of-one's
 * client counts). Match the design's look, drop its toggle. (#18)
 */
import { useMemo, useState } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import {
  buildClientGroups,
  filterAndSortClients,
  clientMonogram,
  monogramTone,
} from '../lib/client/clientDirectory'
import '../styles/lazy-clients.css'

const SORT_MODES = [
  { id: 'recent', label: 'Most recent' },
  { id: 'alpha', label: 'A–Z' },
]

export default function ClientsView({
  projects = [],
  selectProject,
  setActiveView,
  openClientRecord,
}) {
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
        <h1 className="clients-view-title">Clients</h1>
        <div className="clients-view-controls">
          <input
            type="search"
            className="clients-search"
            placeholder="Search clients or projects"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clients"
          />
          <div
            className="clients-sort"
            role="group"
            aria-label="Sort clients"
          >
            {SORT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`clients-sort-btn${sortMode === m.id ? ' is-active' : ''}`}
                aria-pressed={sortMode === m.id}
                onClick={() => setSortMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
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
            <ClientCard
              key={c.name}
              client={c}
              onOpen={openProject}
              onOpenRecord={openClientRecord}
            />
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

function ClientCard({ client, onOpen, onOpenRecord }) {
  return (
    <div className="client-card">
      <ClientPhoto client={client} />
      {/* The name opens the client's record (design) — the card's projects
          list below still deep-links straight into each project. */}
      <button
        type="button"
        className="client-card-name"
        onClick={() => onOpenRecord?.(client.name)}
      >
        {client.name}
      </button>
      {!client.logoImage && (
        <p className="client-card-hint">Add a logo to use it here</p>
      )}
      <div className="client-card-actions">
        {client.phone && (
          <a className="client-card-pill" href={`tel:${client.phone}`}>
            Call
          </a>
        )}
        {client.email && (
          <a className="client-card-pill" href={`mailto:${client.email}`}>
            Email
          </a>
        )}
      </div>
      <ul className="client-card-projects">
        {client.projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="client-card-project"
              onClick={() => onOpen(p)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
