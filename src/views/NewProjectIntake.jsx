/**
 * New-project intake — one screen, from the 2026 design handoff.
 *
 * Reviewed by adhd-executive-function-advisor before build. Its ruling shaped
 * this: creation must never become a gate at task-initiation, so
 *  - the ONLY thing worth typing (the client/business name) is first and
 *    autofocused, but nothing is hard-required;
 *  - engagement is PRE-selected to 'new' (confirm-or-change, not fill-blank);
 *  - deliverables are optional and BLANK MEANS FULL SCOPE (empty
 *    deliverablesPicked is everything in progressItemInScope) — never
 *    pre-ticked;
 *  - the deadline is optional;
 *  - the design's "send vs interview" fork is cut: one always-enabled
 *    "Start project" opens the brief; "Send them the brief" is a quiet
 *    secondary, not a blocking choice.
 */
import { useEffect, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { DELIVERABLE_OPTIONS, isLogoOnlyScope } from '../lib/brief/detectiveBrief'
import { activeStepIds, typeFromIntake } from '../lib/journey/projectTypes'
import { createDiscoveryShare, discoveryShareUrl } from '../lib/client/discoveryShare'
import '../styles/lazy-create.css'

const ENGAGEMENT = [
  { id: 'new', label: 'Starting from scratch — no brand yet' },
  { id: 'rebrand', label: 'Rebranding — replacing what exists now' },
  { id: 'extend', label: 'Adding to a brand that already works' },
]
const DELIVERABLE_GROUPS = [
  { key: 'included', legend: 'Included', items: DELIVERABLE_OPTIONS.filter((o) => !o.extra) },
  { key: 'extra', legend: 'Quoted separately', items: DELIVERABLE_OPTIONS.filter((o) => o.extra) },
]

export default function NewProjectIntake({
  setActiveView,
  flashToast,
  initialClientName = '',
  onDone,
}) {
  const [clientName, setClientName] = useState(initialClientName)
  const [engagement, setEngagement] = useState('new')
  const [picked, setPicked] = useState([]) // empty = full brand package
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)

  /* The header back stays live during sendBrief (the project is already
     created, so leaving is safe) — but then the await must not yank the
     user to the brief after they chose to go elsewhere. */
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
      onDone?.()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    []
  )

  const togglePick = (id) =>
    setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  /* Empty picks = full brand package (progressItemInScope). Surface that.
   *
   * The chip also names the CONSEQUENCE, in stops. The project type is
   * derived from these answers rather than asked as a fourth question, and
   * a derivation nobody witnesses becomes a "where did this come from?"
   * surprise weeks later. Cause and effect share one line, at the instant
   * the answer is given.
   *
   * It reacts to engagement too, not just the checkboxes — engagement is
   * the input that changes the path MOST (adding to an existing brand drops
   * two stops), and it is a pre-selected radio designed to be skimmed past.
   * A chip blind to it would explain the smaller change and stay silent on
   * the bigger one. (adhd-executive-function-advisor, 2026-08-05.)
   *
   * Stops, not type names: "3 stops" is information the designer can act
   * on; "Brand expansion" is a taxonomy they would have to decode first. */
  const logoOnly = isLogoOnlyScope(picked)
  const stopCount = activeStepIds({
    projectType: typeFromIntake({ engagementType: engagement, logoOnly }),
  }).length
  const scopeWords =
    picked.length === 0
      ? engagement === 'extend'
        ? 'Adding to an existing brand'
        : 'Scope: full brand package'
      : logoOnly
        ? 'Scope: logo only'
        : `Scope: ${picked.length} deliverable${picked.length === 1 ? '' : 's'}`
  const scopeLabel = `${scopeWords} · ${stopCount} stops on the path`

  const create = () =>
    useAppStore.getState().createProjectFromIntake({
      clientName,
      engagementType: engagement,
      deliverablesPicked: picked,
      projectDeadline: deadline,
    })

  const startProject = () => {
    create()
    setActiveView('project')
  }

  // Quiet secondary: create the project AND mint the client's brief link, so
  // "send it to them" is one action, not a second decision. Both paths land on
  // the brief — the fork the advisor cut.
  const sendBrief = async () => {
    if (busy) return
    setBusy(true)
    const project = create()
    const r = await createDiscoveryShare({
      projectLocalId: project.id,
      clientName: clientName.trim(),
      answers: {},
    })
    if (r.ok) {
      useAppStore.getState().setDiscoveryShare(r.shareId, 'pending')
      try {
        await navigator.clipboard?.writeText(discoveryShareUrl(r.shareId))
      } catch {
        /* clipboard blocked — the link still lives on the brief */
      }
      flashToast?.('Client brief link created and copied')
    } else {
      flashToast?.(r.error || 'Project created — open the brief to send a link')
    }
    if (!mounted.current) return
    setBusy(false)
    setActiveView('project')
  }

  return (
    <div className="create-view view-enter">
      {/* No local header — the app header's back affordance carries the
          cancel/return (the project is created synchronously on Start/Send,
          so backing out mid-busy leaves a real project, never a torn one). */}
      <div className="create-body">
        <h1 className="create-title">New project</h1>

        <div className="create-field">
          <label className="create-label" htmlFor="create-client">
            Who’s it for?
          </label>
          <input
            id="create-client"
            type="text"
            className="create-input"
            /* eslint-disable-next-line jsx-a11y/no-autofocus -- the one field
               worth typing on this screen; autofocus removes a click at the
               highest-friction moment (advisor). */
            autoFocus
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Business or client name"
          />
        </div>

        <fieldset className="create-section">
          <legend className="create-legend">Where are they starting from?</legend>
          <div className="create-radios" role="radiogroup" aria-label="Where are they starting from?">
            {ENGAGEMENT.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`create-radio${engagement === o.id ? ' is-on' : ''}`}
                aria-pressed={engagement === o.id}
                onClick={() => setEngagement(o.id)}
              >
                <span className="create-radio-dot" aria-hidden="true" />
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="create-section">
          <legend className="create-legend">What do they need made?</legend>
          <p className="create-scope-chip" role="status">
            {scopeLabel}
          </p>
          <div className="create-deliverables">
            {DELIVERABLE_GROUPS.map((g) => (
              <div key={g.key} className="create-deliverable-group">
                <div className="create-deliverable-legend">{g.legend}</div>
                <div className="create-checks">
                  {g.items.map((o) => {
                    const on = picked.includes(o.id)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={`create-check${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => togglePick(o.id)}
                      >
                        <span className="create-check-box" aria-hidden="true">
                          {on ? '✓' : ''}
                        </span>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="create-field create-field-narrow">
          <label className="create-label" htmlFor="create-deadline">
            Is there a date it has to be done by?
          </label>
          <input
            id="create-deadline"
            type="date"
            className="create-input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="create-actions">
          <button
            type="button"
            className="btn btn-primary create-start"
            onClick={startProject}
            disabled={busy}
          >
            Start project
          </button>
          <button
            type="button"
            className="btn btn-ghost create-send"
            onClick={sendBrief}
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Send them the brief to fill in'}
          </button>
        </div>
      </div>
    </div>
  )
}
