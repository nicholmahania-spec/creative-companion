/**
 * The brief questionnaire as a client sees it — the shared renderer behind
 * both public routes: /c/:portalId (PublicClientPortal) and /f/:shareId
 * (PublicDiscoveryFill).
 *
 * It exists because "what a client-facing brief chapter looks like" was
 * being decided in more than one place. PublicClientPortal already carried a
 * near-verbatim copy of DetectiveSheet's checklist markup, and converting the
 * share form onto the same schema would have made three copies of the same
 * JSX drifting apart at different rates.
 *
 * One schema, deliberately: detectiveBrief. Its wording is the plain-language
 * rewrite (see the note at the top of that file), which is the register a
 * client can actually answer in — "What does your business do?" rather than
 * "Unique Selling Proposition (USP)".
 */
import { DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'

export default function ClientBriefFields({ answers = {}, onChange, idPrefix }) {
  return DETECTIVE_CHAPTERS.map((chapter) => (
    <fieldset key={chapter.id} className="public-fill-section">
      <legend>{chapter.title}</legend>
      {/* designerOnly fields (budget, file formats) are unanswerable for a
          client and only invite a wrong or embarrassed guess — the designer
          records them. */}
      {chapter.fields
        .filter((f) => !f.designerOnly)
        .map((f) => {
          const fieldId = `${idPrefix}-${f.id}`
          return (
            <div className="field-block" key={f.id}>
              <label className="field-label" htmlFor={fieldId}>
                {f.label}
              </label>
              {f.tip && <p className="discovery-brief-hint">{f.tip}</p>}
              {f.type === 'checklist' ? (
                <div className="define-checklist">
                  {[
                    {
                      key: 'included',
                      label: 'Included',
                      items: f.options.filter((o) => !o.extra),
                    },
                    {
                      key: 'extra',
                      label: 'Quoted separately',
                      items: f.options.filter((o) => o.extra),
                    },
                  ].map((g) => (
                    <fieldset key={g.key} className="define-checklist-group">
                      <legend className="define-checklist-legend">{g.label}</legend>
                      {g.items.map((o) => {
                        const picked = Array.isArray(answers[f.id]) ? answers[f.id] : []
                        const on = picked.includes(o.id)
                        return (
                          <label
                            key={o.id}
                            className={`define-check-row${on ? ' is-on' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() =>
                                onChange(
                                  f.id,
                                  on
                                    ? picked.filter((x) => x !== o.id)
                                    : [...picked, o.id]
                                )
                              }
                            />
                            <span>{o.label}</span>
                          </label>
                        )
                      })}
                    </fieldset>
                  ))}
                </div>
              ) : f.area ? (
                <textarea
                  id={fieldId}
                  className="field-input"
                  rows={3}
                  value={answers[f.id] || ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              ) : (
                <input
                  id={fieldId}
                  className="field-input"
                  value={answers[f.id] || ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              )}
            </div>
          )
        })}
    </fieldset>
  ))
}
