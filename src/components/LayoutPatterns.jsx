/**
 * Layout patterns — a reference you open, never a thing that prompts you.
 *
 * Sketching is where a single theme gets drawn and iterated, and "what shape
 * should this be" is the question that stalls it. Naming the eight patterns
 * turns a blank stare into a one-second decision.
 *
 * Same shape as the glossary: closed by default, no state, no progress, no
 * nudge. Either useful when opened or invisible.
 */
import { useState } from 'react'
import {
  LAYOUT_PATTERNS,
  SCAN_PATTERNS,
  scanFor,
} from '../lib/layoutPatterns'

export default function LayoutPatterns() {
  const [openId, setOpenId] = useState('')

  return (
    <details className="sketch-ideate-details layout-patterns">
      <summary>Layout patterns ({LAYOUT_PATTERNS.length})</summary>

      {/* Why before what — the scan patterns explain what makes a layout
          work, so the eight below are choices rather than shapes to copy. */}
      <div className="layout-scan-row">
        {SCAN_PATTERNS.map((s) => (
          <p key={s.id} className="layout-scan">
            <span className="define-field-label">{s.name}</span>
            <span className="layout-scan-when">{s.when}</span>
            <span className="layout-scan-why">{s.why}</span>
            <span className="layout-scan-do">{s.do}</span>
          </p>
        ))}
      </div>

      <div className="layout-pattern-list">
        {LAYOUT_PATTERNS.map((p) => {
          const open = openId === p.id
          return (
            <div key={p.id} className="layout-pattern">
              <button
                type="button"
                className="layout-pattern-head"
                aria-expanded={open}
                onClick={() => setOpenId(open ? '' : p.id)}
              >
                <span className="layout-pattern-name">{p.name}</span>
                <span className="layout-pattern-structure">{p.structure}</span>
              </button>
              {open ? (
                <div className="layout-pattern-body">
                  <p>
                    <strong>Use it when</strong> {p.when}
                  </p>
                  <p>
                    <strong>Watch</strong> {p.watch}
                  </p>
                  {scanFor(p.scan) ? (
                    <p className="layout-pattern-scan">
                      Reads as {scanFor(p.scan).name}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </details>
  )
}
