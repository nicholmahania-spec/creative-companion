/**
 * Define right pane — live inspiration & mood sandbox.
 * Pins sync to the shared project mood board (Research).
 */
import { useState, useCallback, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { pinFaceStyle, readImageFilesAsPins } from '../lib/moodPins'

const SWATCHES = [
  '#22D3EE',
  '#A78BFA',
  '#FB7185',
  '#34D399',
  '#FBBF24',
  '#F8FAFC',
  '#0F172A',
  '#F97316',
]

export default function DefineMoodCanvas({
  deskMood = [],
  projectId = null,
  projectPalette = [],
  flashToast,
  flashMicro,
}) {
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)

  const [noteDraft, setNoteDraft] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const pins = (deskMood || []).slice(0, 24)
  const paletteSwatches = (projectPalette || [])
    .map((c) => String(c || '').trim())
    .filter(Boolean)
    .slice(0, 6)
  const colors = [...new Set([...paletteSwatches, ...SWATCHES])].slice(0, 12)

  const addNote = useCallback(() => {
    const text = String(noteDraft || '').trim()
    if (!text) return
    addMoodPin({
      type: 'note',
      note: text,
      visual: '#312e81',
      projectId,
    })
    setNoteDraft('')
    flashMicro?.('Sticky pinned')
  }, [noteDraft, addMoodPin, projectId, flashMicro])

  const addSwatch = useCallback(
    (hex) => {
      addMoodPin({
        type: 'color',
        note: hex,
        visual: hex,
        projectId,
      })
      flashMicro?.(`Swatch ${hex}`)
    },
    [addMoodPin, projectId, flashMicro]
  )

  const ingestFiles = useCallback(
    async (fileList) => {
      const { pins: next, skipped } = await readImageFilesAsPins(fileList)
      next.forEach((p) => addMoodPin({ ...p, projectId }))
      if (next.length) flashMicro?.(`${next.length} image${next.length > 1 ? 's' : ''} pinned`)
      if (skipped.length) flashToast?.(skipped[0])
    },
    [addMoodPin, projectId, flashMicro, flashToast]
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer?.files?.length) {
        ingestFiles(e.dataTransfer.files)
      }
    },
    [ingestFiles]
  )

  return (
    <aside className="define-mood" aria-label="Inspiration and mood board">
      <header className="define-mood-head">
        <p className="define-mood-kicker">Inspiration</p>
        <h2 className="define-mood-title">Mood board</h2>
        <p className="define-mood-lede">
          Pin refs while you write. Messy is fine — context for the brief.
        </p>
      </header>

      <div
        className={`define-mood-drop${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="define-mood-file"
          onChange={(e) => {
            if (e.target.files?.length) ingestFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="define-mood-drop-btn"
          onClick={() => fileRef.current?.click()}
        >
          Drop images or click to pin
        </button>
      </div>

      <div className="define-mood-swatches" aria-label="Color swatches">
        {colors.map((hex) => (
          <button
            key={hex}
            type="button"
            className="define-mood-swatch"
            style={{ background: hex }}
            title={`Pin ${hex}`}
            aria-label={`Pin color ${hex}`}
            onClick={() => addSwatch(hex)}
          />
        ))}
      </div>

      <div className="define-mood-note-row">
        <input
          className="define-input field-input"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          aria-label="Sticky note"
          placeholder=""
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={addNote}>
          Sticky
        </button>
      </div>
      <p className="define-mood-tip">
        <span className="define-field-tip-label">tip</span>
        Dump half-thoughts as stickies. Stars live on Research.
      </p>

      <div className="define-mood-wall">
        {pins.length === 0 ? (
          <div className="define-mood-empty">
            <span className="define-mood-empty-icon" aria-hidden="true">
              ✦
            </span>
            <p>Empty sandbox — drop a photo or pin a swatch.</p>
          </div>
        ) : (
          pins.map((pin) => {
            const isNote = pin.type === 'note' || (!pinFaceStyle(pin).backgroundImage && pin.note)
            const face = pinFaceStyle(pin)
            return (
              <article
                key={pin.id}
                className={`define-mood-pin${isNote ? ' is-note' : ''}${
                  pin.type === 'color' ? ' is-swatch' : ''
                }`}
                style={
                  isNote && pin.type === 'note'
                    ? { background: pin.visual || '#312e81' }
                    : face
                }
              >
                {isNote && pin.type === 'note' ? (
                  <p className="define-mood-pin-note">{pin.note}</p>
                ) : (
                  <p className="define-mood-pin-cap">{pin.note || pin.type || 'pin'}</p>
                )}
                <div className="define-mood-pin-actions">
                  {pin.type === 'note' && (
                    <button
                      type="button"
                      className="define-mood-pin-edit"
                      title="Edit sticky"
                      onClick={() => {
                        const next = window.prompt('Sticky text', pin.note || '')
                        if (next != null) updateMoodPinNote(pin.id, next)
                      }}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    type="button"
                    className="define-mood-pin-x"
                    aria-label="Remove pin"
                    onClick={() => removeMoodPin(pin.id)}
                  >
                    ✕
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </aside>
  )
}
