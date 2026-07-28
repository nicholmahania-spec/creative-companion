/**
 * Project terms — the facts, for pasting into your own contract.
 *
 * This is what is left of "generate a contract from the brief" after an ADHD
 * review took it apart, and the reasoning is worth keeping because it is what
 * stops this growing back into a document generator.
 *
 * A design contract has nine sections. The app holds four of them. The other
 * five — IP, confidentiality, termination, governing law, signatures — have
 * **the same answer on every project this studio will ever run**. Generating
 * them means either asking for them per project (five prompts whose answer
 * never varies, and unlike most such prompts these carry legal weight, so
 * they trigger the *should I get this right?* stall on the screen everything
 * else depends on) or shipping placeholder legal text that then needs a
 * lawyer. Neither adds safety; both add load.
 *
 * So the split is: **the app produces facts, the studio owns the document.**
 * The five invariant sections get written once, with a lawyer, in the
 * studio's own contract file. The variable ones come from here.
 *
 * ── Two things this deliberately does NOT emit ───────────────────────────
 *
 * **The fee.** Not `budgetRange` — that is the client's opening guess, asked
 * as "What budget do you have in mind?" with the tip "A range is fine". And
 * not `hourlyRate`, which carries this in the store: "What a client gets
 * charged is a claim you make deliberately, so nothing writes here
 * automatically." Emitting either into a block headed "Project terms",
 * destined for a contract, silently converts a guess or a private rate into
 * a stated price — and it does so invisibly, because the number reads as
 * correct on the clipboard and there is no cue to check it. The agreed fee
 * is one line to type into your own contract, and it is the line you should
 * be conscious while writing.
 *
 * `scopeRevisionRate` IS emitted, and the distinction is exact rather than
 * squeamish: it was typed into a field labelled "Fee per extra round", so it
 * was entered as a deliberate claim about what extra work costs.
 *
 * **Nothing is stored.** No saved terms record, no version history, no
 * last-copied marker. Storage is what creates drift — and drift here is the
 * dangerous kind, because the stale copy is the one with legal force. Every
 * call regenerates from the brief as it stands right now.
 */
import { DELIVERABLE_OPTIONS } from './detectiveBrief'
import { REVISION_BILLING } from './revisions'

const LABELS = Object.fromEntries(DELIVERABLE_OPTIONS.map((o) => [o.id, o.label]))

const clean = (v) => String(v ?? '').trim()

const billingPhrase = (id) =>
  REVISION_BILLING.find((b) => b.id === id)?.label || ''

/**
 * The six facts, as plain text. Anything without an answer is omitted
 * entirely rather than rendered blank — an empty heading in something headed
 * for a contract reads as a term that was agreed to be nothing.
 *
 * @returns {string} empty when the project can answer none of it
 */
export function projectTermsText(project = {}) {
  const d = project?.detective || {}
  const out = []

  // 1. What is being made
  const picked = (Array.isArray(d.deliverablesPicked) ? d.deliverablesPicked : [])
    .map((id) => LABELS[id] || id)
    .filter(Boolean)
  const extra = clean(d.deliverables)
  if (picked.length || extra) {
    out.push('Deliverables')
    for (const p of picked) out.push(`- ${p}`)
    if (extra) out.push(`- ${extra}`)
    out.push('')
  }

  // 2. When
  const deadline = clean(d.projectDeadline) || clean(project.deadline)
  const milestones = (Array.isArray(d.milestones) ? d.milestones : []).filter(
    (m) => clean(m?.label) || clean(m?.date)
  )
  if (deadline || milestones.length) {
    out.push('Timeline')
    if (deadline) out.push(`- Delivery by ${deadline}`)
    for (const m of milestones) {
      const label = clean(m.label) || 'Milestone'
      out.push(clean(m.date) ? `- ${label} — ${clean(m.date)}` : `- ${label}`)
    }
    out.push('')
  }

  // 3. Revisions — the number, never "as needed"
  const rounds = Number(project.scopeRevisionsIncluded)
  if (Number.isFinite(rounds) && rounds > 0) {
    out.push('Revisions')
    out.push(`- ${rounds} round${rounds === 1 ? '' : 's'} included`)
    const rate = Number(project.scopeRevisionRate)
    if (Number.isFinite(rate) && rate > 0) {
      const how = billingPhrase(project.scopeRevisionBilling)
      out.push(
        `- Additional rounds: ${how ? `${how.toLowerCase()} — ` : ''}$${rate.toFixed(2)}`
      )
    }
    out.push('')
  }

  // 4. Who signs it off — singular, on purpose
  const approver = clean(project.scopeApprover)
  if (approver) {
    out.push('Approval', `- ${approver} approves the work`, '')
  }

  // 5. What is handed over
  const formats = clean(d.technical)
  if (formats) out.push('File formats', `- ${formats}`, '')

  // 6. What is not included — the half that gets argued about
  const outOf = clean(project.scopeOutOf)
  if (outOf) out.push('Not included', `- ${outOf}`, '')

  return out.join('\n').trim()
}

/** True when there is anything at all worth copying. */
export function hasProjectTerms(project) {
  return projectTermsText(project).length > 0
}
