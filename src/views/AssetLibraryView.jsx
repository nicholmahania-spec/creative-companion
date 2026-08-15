/**
 * Asset library — the finished files, filed loosely, kept forever.
 *
 * A TOOL, not a path stop. Every stop carries a completion tick and a library
 * is never finished; a tick here would be a permanent open loop in the one
 * place a designer stores work that IS done. It is also a reference surface
 * entered with a question rather than a stage walked through, and it is where
 * someone returns mid-project — so it must be reachable from anywhere, and it
 * must not greet a designer three weeks from delivery with "ship it", which
 * is what putting it on Deliver would have done.
 *
 * FILING IS DEFERRED, AND THIS SCREEN MUST NOT UNDO THAT. `normaliseIngest`
 * accepts anything and files the unknown as Unfiled on purpose: a designer
 * pushing a mark from Illustrator is mid-flow, and a taxonomy question at
 * that moment is how the whole feature becomes something they route around.
 * The natural way to draw a grouped shelf breaks this by geometry rather than
 * by a form — so, four rules, each load-bearing:
 *
 *   1. ONE drop plane for the whole shelf. Never per group. A per-group
 *      target is a five-way aim decision at the instant of capture.
 *   2. No "file it as…" prompt after arrival. Same tax with a fuse, and
 *      because it expires, ignoring it leaves a residue of having missed
 *      something — worse than being asked.
 *   3. No count and no badge on Unfiled. That turns deferred filing into a
 *      visible debt and punishes the designer for using the escape hatch.
 *   4. Filing later is a menu on the card. No dialog, no navigation. If
 *      refiling is expensive the deferral is a lie and people will file at
 *      capture out of dread.
 */
import { useMemo, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { labelForView } from '../lib/journey/journey'
import { assetShelf, shelfEmptyState } from '../lib/assets/assetShelf'
import { ASSET_CATEGORIES, categoryLabel, ALLOWED_MIME_TYPES } from '../lib/assets/assetLibrary'
import { ingestFiles, ingestSummary } from '../lib/assets/ingestFiles'
import '../styles/lazy-assets.css'

export default function AssetLibraryView({
  navDir = 'none',
  cloud = false,
  flashToast,
}) {
  const assets = useAppStore((s) => s.assets)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const addAssets = useAppStore((s) => s.addAssets)
  const dropRef = useRef(null)
  const fileRef = useRef(null)
  const [dropActive, setDropActive] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [busy, setBusy] = useState(false)
  /* Refusals stay on screen. A toast is the wrong home for "this file was not
     saved" — it leaves before the designer has finished reading a list, and
     the thing it is reporting is the absence of work they believe they did. */
  const [refused, setRefused] = useState([])

  async function take(files) {
    const list = Array.from(files || [])
    if (!list.length) return
    setBusy(true)
    try {
      const result = await ingestFiles(list, { projectId: currentProjectId })
      if (result.accepted.length) addAssets?.(result.accepted)
      setRefused(result.refused)
      const line = ingestSummary(result)
      if (line) flashToast?.(line)
    } finally {
      setBusy(false)
    }
  }

  const mine = useMemo(
    () => (assets || []).filter((a) => a && a.project_id === currentProjectId),
    [assets, currentProjectId]
  )

  /* Every display judgement is made in the view model, so this component has
     none to make and none to get subtly wrong per render. */
  const { groups, total, showHeadings, allRemote, allLocal } = useMemo(
    () => assetShelf(mine, { online: typeof navigator === 'undefined' || navigator.onLine }),
    [mine]
  )
  const empty = shelfEmptyState({ total, cloud })

  return (
    <div className="assets-library view-enter" data-nav-dir={navDir}>
      <div className="flow-top">
        <h1 className="page-title">{labelForView('assets')}</h1>
      </div>

      {/* Said ONCE, above the shelf, when it is true of everything. Twenty
          cards each carrying the same sentence is one fact read twenty times,
          and repetition of an absence reads as breakage rather than as a
          statement about this device. */}
      {allRemote && (
        <p className="assets-lib-note" role="status">
          Files aren’t on this device. Names, versions and sources are.
        </p>
      )}

      {/* The mirror image, said the same way and for the same reason. Every
          file here is on this desk, which is one fact about the shelf rather
          than a sentence each card has to carry. */}
      {allLocal && (
        <p className="assets-lib-note" role="status">
          These files are saved on this desk.
        </p>
      )}

      {/* THE one drop plane. Rule 1. */}
      <div
        ref={dropRef}
        className={`assets-lib-drop${dropActive ? ' is-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDropActive(true)
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDropActive(false)
          void take(e.dataTransfer?.files)
        }}
      >
        <p className="assets-lib-drop-line">
          {busy ? 'Filing…' : 'Drop finished files here'}
        </p>
        {/* A drop plane alone is a mouse-only control: unreachable by
            keyboard, invisible to a screen reader, and impossible on a tablet.
            The button is the same action, not a lesser fallback. */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Choose files
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ALLOWED_MIME_TYPES.join(',')}
          className="sr-only"
          aria-label="Choose files to add to the asset library"
          onChange={(e) => {
            /* SNAPSHOT BEFORE CLEARING, and the order is the whole fix.
               `e.target.files` is a LIVE FileList bound to the input, so
               `value = ''` empties the object this variable still points at.
               Holding the reference across the clear handed `take()` an empty
               list, it hit `if (!list.length) return`, and the picker did
               nothing at all: no asset, no refusal, no toast, no console
               error. Measured — captured FileList went from length 1 to 0 the
               moment the input was cleared, and the shelf stayed empty while
               the drop path filed the same file correctly through the same
               `take()`.

               The clear itself has to stay: without it, choosing the same
               file twice in a row fires no `change` event the second time.
               `Array.from` copies the entries out first, which is what
               `ClientPackagePanel`'s picker already does. */
            const files = Array.from(e.target.files || [])
            e.target.value = ''
            void take(files)
          }}
        />
      </div>

      {/* Named, one per file, and not going anywhere until the next drop. */}
      {refused.length > 0 && (
        <ul className="assets-lib-refused" aria-label="Files that were not filed">
          {refused.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <strong>{r.name}</strong> — {r.reason}
            </li>
          ))}
        </ul>
      )}

      {empty ? (
        <p className="assets-lib-empty">{empty.line}</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="assets-lib-group">
            {/* A single heading over the only content on screen labels a
                distinction that does not exist yet. */}
            {showHeadings && (
              <h2 className="assets-lib-group-title">
                {g.label}
                {/* No count. Rule 3 — a number here turns deferred filing
                    into a debt the designer is shown every visit. */}
              </h2>
            )}
            <ul className="assets-lib-grid">
              {g.cards.map((c) => (
                <li key={c.id} className={`assets-lib-card is-${c.bytes.state}`}>
                  <div className="assets-lib-face" aria-hidden="true" />
                  <p className="assets-lib-name">{c.name}</p>
                  <p className="assets-lib-meta">
                    {c.source}
                    {c.versionLabel ? ` · ${c.versionLabel}` : ''}
                  </p>
                  {/* Per-card state ONLY in the mixed case, where it says
                      something true of this file and not that one. */}
                  {!allRemote && !allLocal && c.bytes.label && (
                    <p className="assets-lib-state">{c.bytes.label}</p>
                  )}

                  {/* Rule 4: refiling is a menu on the card. */}
                  <div className="assets-lib-file">
                    <button
                      type="button"
                      className="assets-lib-file-btn"
                      aria-expanded={openMenu === c.id}
                      onClick={() =>
                        setOpenMenu(openMenu === c.id ? null : c.id)
                      }
                    >
                      {categoryLabel(c.category)}
                    </button>
                    {openMenu === c.id && (
                      <ul className="assets-lib-file-menu">
                        {ASSET_CATEGORIES.map((cat) => (
                          <li key={cat.id}>
                            <button
                              type="button"
                              className="assets-lib-file-option"
                              onClick={() => {
                                useAppStore
                                  .getState()
                                  .setAssetCategory?.(c.id, cat.id)
                                setOpenMenu(null)
                              }}
                            >
                              {cat.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
