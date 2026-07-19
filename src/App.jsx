import { useState, useEffect, useMemo } from 'react'
import useAppStore from './store/useAppStore'
import {
  DEFAULT_PALETTE,
  normalizeHex,
  buildPairChecks,
  bestTextOn,
  formatRatio,
} from './lib/color'
import {
  BREAKDOWN_DEPTHS,
  generateProjectMicrosteps,
} from './lib/microsteps'
import {
  toISODate,
  buildMonthGrid,
  formatMonthYear,
  formatShortDate,
  urgencyLabel,
  deadlineUrgency,
  daysUntil,
} from './lib/dates'

function App() {
  // ——— Zustand (persisted studio state) ———
  const projects = useAppStore((s) => s.projects)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const tasks = useAppStore((s) => s.tasks)
  const moodItems = useAppStore((s) => s.moodItems)
  const theme = useAppStore((s) => s.theme)
  const bodyDoubling = useAppStore((s) => s.bodyDoubling)
  const onboarded = useAppStore((s) => s.onboarded)
  const currentSpark = useAppStore((s) => s.currentSpark)
  const addProject = useAppStore((s) => s.addProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const setLogoDirection = useAppStore((s) => s.setLogoDirection)
  const updatePaletteColor = useAppStore((s) => s.updatePaletteColor)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const removePaletteColor = useAppStore((s) => s.removePaletteColor)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const setBodyDoubling = useAppStore((s) => s.setBodyDoubling)
  const toggleBodyDoubling = useAppStore((s) => s.toggleBodyDoubling)
  const setOnboarded = useAppStore((s) => s.setOnboarded)
  const addTask = useAppStore((s) => s.addTask)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const updateTaskTitle = useAppStore((s) => s.updateTaskTitle)
  const removeTask = useAppStore((s) => s.removeTask)
  const breakIntoSteps = useAppStore((s) => s.breakIntoSteps)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const nextSpark = useAppStore((s) => s.nextSpark)
  const createNewProject = useAppStore((s) => s.createNewProject)
  const addMicroStepsBatch = useAppStore((s) => s.addMicroStepsBatch)
  const setProjectDeadline = useAppStore((s) => s.setProjectDeadline)
  const setTaskDueDate = useAppStore((s) => s.setTaskDueDate)
  const prefs = useAppStore((s) => s.prefs) || {}
  const setPref = useAppStore((s) => s.setPref)
  const exportAllData = useAppStore((s) => s.exportAllData)
  const clearAllData = useAppStore((s) => s.clearAllData)
  const clearToEmpty = useAppStore((s) => s.clearToEmpty)

  // ——— Ephemeral UI (not persisted) ———
  const [activeView, setActiveView] = useState('flow')
  const [quickInput, setQuickInput] = useState('')
  const [captureEnergy, setCaptureEnergy] = useState('med')
  const [focusLeft, setFocusLeft] = useState(25 * 60)
  const [isFocusRunning, setIsFocusRunning] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const focusMinutes = Math.floor(focusLeft / 60)
  const focusSeconds = focusLeft % 60
  const [showCreativeReset, setShowCreativeReset] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardName, setOnboardName] = useState('')
  const [onboardBrief, setOnboardBrief] = useState('')
  const [exportPanel, setExportPanel] = useState(null)
  const [savePulse, setSavePulse] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [captureOptionsOpen, setCaptureOptionsOpen] = useState(false)
  const [checkBgIndex, setCheckBgIndex] = useState(0)
  const [hexDrafts, setHexDrafts] = useState({})
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [breakdownStep, setBreakdownStep] = useState(0)
  const [bdGoal, setBdGoal] = useState('')
  const [bdDone, setBdDone] = useState('')
  const [bdDepth, setBdDepth] = useState('standard')
  const [bdEnergy, setBdEnergy] = useState('low')
  const [bdSteps, setBdSteps] = useState([])
  const [breakdownAdded, setBreakdownAdded] = useState(0)
  const [captureDue, setCaptureDue] = useState('')
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [boardUrl, setBoardUrl] = useState('')
  const [boardNote, setBoardNote] = useState('')
  const [boardAddMode, setBoardAddMode] = useState(null) // 'url' | 'note' | null
  const [queueOpen, setQueueOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [actionToast, setActionToast] = useState('')
  const [stepFocusKey, setStepFocusKey] = useState(0)

  const showHowItWorks = prefs.showHowItWorks !== false
  const queueCollapsed = prefs.queueCollapsed !== false
  const soundEnabled = prefs.soundEnabled !== false
  const reduceMotion = !!prefs.reduceMotion
  const bodyDoubleSilent = !!prefs.bodyDoubleSilent

  const activeProjectId = currentProjectId
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectPalette =
    activeProject?.palette?.length > 0
      ? activeProject.palette
      : DEFAULT_PALETTE
  const deskTasks = (tasks || []).filter(
    (t) => t.projectId == null || t.projectId === activeProjectId
  )
  const openTasks = deskTasks.filter((t) => !t.completed)
  const doneTasks = deskTasks.filter((t) => t.completed)
  const nextTask = openTasks[0] || null
  const queueTasks = openTasks.slice(1)
  const deskMood = (moodItems || []).filter(
    (m) => m.projectId == null || m.projectId === activeProjectId
  )
  const completedCount = doneTasks.length
  const progressPercent =
    deskTasks.length > 0
      ? Math.round((completedCount / deskTasks.length) * 100)
      : 0

  const projectDeadline = activeProject?.deadline || ''
  const projectUrgency = projectDeadline
    ? deadlineUrgency(projectDeadline)
    : null

  const calendarEvents = useMemo(() => {
    const map = {}
    const add = (iso, item) => {
      if (!iso) return
      if (!map[iso]) map[iso] = []
      map[iso].push(item)
    }
    ;(projects || []).forEach((p) => {
      if (p.deadline) {
        add(p.deadline, {
          type: 'project',
          id: `p-${p.id}`,
          label: p.name,
          projectId: p.id,
        })
      }
    })
    ;(tasks || []).forEach((t) => {
      if (t.dueDate && !t.completed) {
        const proj = (projects || []).find((p) => p.id === t.projectId)
        add(t.dueDate, {
          type: 'task',
          id: `t-${t.id}`,
          label: t.title,
          projectId: t.projectId,
          projectName: proj?.name,
        })
      }
    })
    return map
  }, [projects, tasks])

  const upcomingDeadlines = useMemo(() => {
    const rows = []
    ;(projects || []).forEach((p) => {
      if (!p.deadline) return
      rows.push({
        kind: 'project',
        id: p.id,
        name: p.name,
        date: p.deadline,
        urgency: deadlineUrgency(p.deadline),
        days: daysUntil(p.deadline),
      })
    })
    ;(tasks || [])
      .filter((t) => t.dueDate && !t.completed)
      .forEach((t) => {
        rows.push({
          kind: 'task',
          id: t.id,
          name: t.title,
          date: t.dueDate,
          urgency: deadlineUrgency(t.dueDate),
          days: daysUntil(t.dueDate),
          projectId: t.projectId,
        })
      })
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [projects, tasks])

  const selectProject = (id) => setCurrentProject(id)

  // Keep checker bg valid when palette shrinks; seed missing project palettes
  useEffect(() => {
    if (!activeProject) return
    if (!activeProject.palette?.length) {
      setProjectPalette([...DEFAULT_PALETTE])
    }
  }, [activeProject?.id, activeProject?.palette, setProjectPalette])

  useEffect(() => {
    if (checkBgIndex >= projectPalette.length) {
      setCheckBgIndex(Math.max(0, projectPalette.length - 1))
    }
  }, [projectPalette.length, checkBgIndex])

  const checkBg =
    projectPalette[checkBgIndex] || projectPalette[0] || '#FFFFFF'

  const contrastPairs = useMemo(
    () => buildPairChecks(projectPalette, checkBg),
    [projectPalette, checkBg]
  )

  const handleHexChange = (index, raw) => {
    setHexDrafts((d) => ({ ...d, [index]: raw }))
    const n = normalizeHex(raw)
    if (n) updatePaletteColor(index, n)
  }

  const commitHex = (index) => {
    const draft = hexDrafts[index]
    if (draft == null) return
    const n = normalizeHex(draft)
    if (n) updatePaletteColor(index, n)
    setHexDrafts((d) => {
      const next = { ...d }
      delete next[index]
      return next
    })
  }

  const hideHowItWorks = () => setPref('showHowItWorks', false)
  const revealHowItWorks = () => setPref('showHowItWorks', true)

  const flashToast = (msg) => {
    setActionToast(msg)
    window.setTimeout(() => setActionToast(''), 3200)
  }

  const completeCurrentStep = () => {
    if (!nextTask) return
    toggleTask(nextTask.id)
    flashToast('Step complete · next one is ready')
    setStepFocusKey((k) => k + 1)
  }

  const projectPills = (
    <div className="project-pills" role="tablist" aria-label="Project">
      {(projects || []).map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={activeProjectId === p.id}
          onClick={() => selectProject(p.id)}
          className={
            activeProjectId === p.id ? 'project-pill is-active' : 'project-pill'
          }
        >
          {p.name}
        </button>
      ))}
    </div>
  )

  // Keyboard: ⌘K spark · Esc dismiss overlays
  useEffect(() => {
    const handleKey = (e) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setActiveView('spark')
        setMoreOpen(false)
        return
      }
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setShowCreativeReset(false)
        setExportPanel(null)
        setShowBreakdown(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Click outside closes More menu
  useEffect(() => {
    if (!moreOpen) return undefined
    const onPointer = (e) => {
      const wrap = document.querySelector('.more-wrap')
      if (wrap && !wrap.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [moreOpen])

  // Focus countdown
  useEffect(() => {
    if (!isFocusRunning) return undefined
    const id = window.setInterval(() => {
      setFocusLeft((left) => {
        if (left <= 1) {
          setIsFocusRunning(false)
          setSessionComplete(true)
          if (soundEnabled) {
            try {
              const ctx = new AudioContext()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.type = 'sine'
              osc.frequency.value = 660
              gain.gain.value = 0.06
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.start()
              setTimeout(() => {
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
                setTimeout(() => osc.stop(), 900)
              }, 200)
            } catch {
              /* ignore */
            }
          }
          return 0
        }
        return left - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [isFocusRunning, soundEnabled])

  // Respect reduce-motion preference on <html>
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion
      ? 'true'
      : 'false'
  }, [reduceMotion])

  // First-run gate (zustand onboarded)
  useEffect(() => {
    if (!onboarded) setShowOnboarding(true)
  }, [onboarded])

  // Autosave pulse when persisted store updates
  useEffect(() => {
    setSavePulse(true)
    const t = window.setTimeout(() => setSavePulse(false), 1800)
    return () => window.clearTimeout(t)
  }, [tasks, moodItems, activeProjectId, projects, theme])

  const addQuickTask = () => {
    if (!quickInput.trim()) return
    addTask({
      id: Date.now(),
      title: quickInput.trim(),
      energy: captureEnergy,
      meta: `Just captured · ${captureEnergy} energy · ${activeProject?.name || 'desk'}`,
      completed: false,
      seeded: false,
      projectId: activeProjectId,
      dueDate: captureDue || '',
    })
    setQuickInput('')
    setCaptureDue('')
    setActiveView('flow')
  }

  const resetFocus = (minutes = 25) => {
    setIsFocusRunning(false)
    setFocusLeft(minutes * 60)
    setSessionComplete(false)
  }

  const chooseLogoDirection = (label, detail) => {
    setLogoDirection(`${label}: ${detail}`)
  }

  const finishOnboarding = (mode) => {
    if (mode === 'custom' && onboardName.trim()) {
      createNewProject(
        onboardName.trim(),
        onboardBrief.trim() || 'Direction TBD — capture first, polish later.'
      )
    }
    setOnboarded(true)
    localStorage.setItem('cc-onboarded', '1')
    setShowOnboarding(false)
    setActiveView('flow')
  }

  const escapeHtml = (s) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const openExportPanel = () => {
    setExportPanel({
      projectName: activeProject?.name || 'Untitled project',
      brief: activeProject?.brief?.trim() || '',
      logoDirection: activeProject?.logoDirection || '',
      tagline: activeProject?.tagline?.trim() || '',
      voice: activeProject?.voice?.trim() || '',
      doUse: activeProject?.doUse?.trim() || '',
      dontUse: activeProject?.dontUse?.trim() || '',
      openTasks: deskTasks.filter((t) => !t.completed).slice(0, 5),
      doneCount: completedCount,
      totalCount: deskTasks.length,
      progressPercent,
      pins: deskMood.slice(0, 6),
      palette: [...projectPalette],
      typeHeading:
        activeProject?.typeHeading || 'Plus Jakarta Sans Bold',
      typeBody: activeProject?.typeBody || 'Plus Jakarta Sans Regular',
    })
  }

  const uploadMoodFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    )
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        addMoodPin({
          id: Date.now() + i,
          type: 'image',
          note: file.name.replace(/\.[^.]+$/, '') || 'Upload',
          visual: ev.target?.result,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const downloadExportHtml = () => {
    if (!exportPanel) return
    const pinsHtml = exportPanel.pins
      .map((p) => {
        if (p.type === 'image' && p.visual) {
          const src = String(p.visual).replace(/'/g, '%27')
          return `<div class="pin"><div class="swatch" style="background-image:url('${src}');background-size:cover"></div><p>${escapeHtml(p.note)}</p></div>`
        }
        return `<div class="pin"><div class="swatch" style="background:${escapeHtml(p.visual || '#863BFF')}"></div><p>${escapeHtml(p.note)}</p></div>`
      })
      .join('')
    const tasksHtml = exportPanel.openTasks
      .map((t) => `<li>${escapeHtml(t.title)}</li>`)
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(exportPanel.projectName)} — Brand Identity</title>
<style>
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0B1220;background:#EEF0F6;margin:0;padding:2.5rem}
  .sheet{max-width:760px;margin:0 auto;background:#fff;border:1px solid rgba(11,18,32,.08);border-radius:16px;padding:2.25rem;box-shadow:0 8px 28px rgba(11,18,32,.08)}
  .cover{border-radius:12px;padding:2rem 1.75rem;margin:0 0 1.75rem;color:#fff}
  .cover .label{font-size:.75rem;font-weight:700;opacity:.85;margin:0 0 .5rem}
  .cover h1{font-size:2rem;font-weight:700;letter-spacing:-.03em;margin:0 0 .4rem}
  .cover .tag{font-size:1.05rem;opacity:.92;margin:0;font-weight:500}
  h1{font-weight:700;font-size:1.75rem;letter-spacing:-.025em;margin:0 0 .35rem}
  .kicker{font-size:.8125rem;font-weight:600;color:rgba(11,18,32,.55);margin:1.25rem 0 .4rem}
  .brief{color:rgba(11,18,32,.65);line-height:1.55;margin:0 0 1rem}
  .row{display:flex;gap:0;height:64px;border-radius:10px;overflow:hidden;margin:.65rem 0}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1rem 0}
  .box{border:1px solid rgba(11,18,32,.08);border-radius:10px;padding:1rem}
  .box h3{margin:0 0 .35rem;font-size:.8rem;font-weight:700;color:rgba(11,18,32,.5)}
  .box p{margin:0;line-height:1.45;color:rgba(11,18,32,.75);font-size:.95rem}
  .type-display{font-size:1.75rem;font-weight:700;letter-spacing:-.03em;margin:.25rem 0}
  .type-body{font-size:1rem;color:rgba(11,18,32,.65)}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:1rem 0}
  .pin{border:1px solid rgba(36,30,48,.1);border-radius:2px 10px 10px 2px;overflow:hidden}
  .swatch{height:88px;background:#EDE6FF}
  .pin p{margin:0;padding:.55rem .65rem;font-size:.8rem}
  ul{margin:.5rem 0 0;padding-left:1.1rem;color:rgba(36,30,48,.62)}
  .foot{margin-top:2rem;font-size:.75rem;color:rgba(36,30,48,.4)}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border:none}}
</style></head><body><div class="sheet">
  <div class="cover" style="background:${escapeHtml(exportPanel.palette[0] || '#4F46E5')}">
    <p class="label">Brand identity template</p>
    <h1>${escapeHtml(exportPanel.projectName)}</h1>
    <p class="tag">${escapeHtml(exportPanel.tagline || 'Tagline TBD')}</p>
  </div>
  <div class="kicker">Positioning</div>
  <p class="brief">${escapeHtml(exportPanel.brief || 'No brief captured yet.')}</p>
  ${exportPanel.voice ? `<div class="kicker">Voice</div><p class="brief">${escapeHtml(exportPanel.voice)}</p>` : ''}
  <div class="kicker">Palette</div>
  <div class="row">${exportPanel.palette.map((c) => `<div style="flex:1;background:${c}"></div>`).join('')}</div>
  <p class="brief">${exportPanel.palette.map((c) => escapeHtml(c)).join(' · ')}</p>
  <div class="kicker">Typography</div>
  <div class="type-display">${escapeHtml(exportPanel.typeHeading)}</div>
  <div class="type-body">${escapeHtml(exportPanel.typeBody)}</div>
  ${
    exportPanel.logoDirection
      ? `<div class="kicker">Logo direction</div><p class="brief">${escapeHtml(exportPanel.logoDirection)}</p>`
      : ''
  }
  <div class="grid2">
    <div class="box"><h3>Do</h3><p>${escapeHtml(exportPanel.doUse || '—')}</p></div>
    <div class="box"><h3>Don’t</h3><p>${escapeHtml(exportPanel.dontUse || '—')}</p></div>
  </div>
  <div class="kicker">Mood direction</div>
  <div class="grid">${pinsHtml || '<p class="brief">No pins yet.</p>'}</div>
  <div class="kicker">Open work</div>
  <ul>${tasksHtml || '<li>Desk clear</li>'}</ul>
  <p class="foot">Creative Companion · ${exportPanel.progressPercent}% of desk checked · ${new Date().toLocaleDateString()}</p>
</div></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportPanel.projectName.replace(/\s+/g, '-').toLowerCase()}-brand-direction.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const creativeResetItems = [
    {
      label: 'Break project into micro-steps',
      action: () => {
        setShowCreativeReset(false)
        openBreakdown()
      },
    },
    {
      label: 'Back to current step',
      action: () => {
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Split current step into 3',
      action: () => {
        if (nextTask && !nextTask.parentId) breakIntoSteps(nextTask.id)
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Get a spark',
      action: () => {
        setActiveView('spark')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Start a 2‑min focus',
      action: () => {
        resetFocus(2)
        setActiveView('insights')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Open mood board',
      action: () => {
        setActiveView('studio')
        setShowCreativeReset(false)
      },
    },
  ]

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.onresult = (e) => setQuickInput(e.results[0][0].transcript)
    recognition.onerror = () => {}
    recognition.start()
  }

  const openBreakdown = () => {
    setBdGoal(activeProject?.name || '')
    setBdDone(activeProject?.brief?.slice(0, 120) || '')
    setBdDepth('standard')
    setBdEnergy('low')
    setBdSteps([])
    setBreakdownStep(0)
    setBreakdownAdded(0)
    setShowBreakdown(true)
    setMoreOpen(false)
    setShowCreativeReset(false)
  }

  const buildBreakdownPreview = () => {
    const steps = generateProjectMicrosteps({
      goal: bdGoal || activeProject?.name || 'this project',
      doneLooksLike: bdDone,
      depth: bdDepth,
    })
    setBdSteps(steps)
    setBreakdownStep(3)
  }

  const updateBdStepLine = (index, value) => {
    setBdSteps((rows) => rows.map((r, i) => (i === index ? value : r)))
  }

  const removeBdStepLine = (index) => {
    setBdSteps((rows) => rows.filter((_, i) => i !== index))
  }

  const addBdStepLine = () => {
    setBdSteps((rows) => [...rows, 'New micro-step…'])
  }

  const commitBreakdown = () => {
    const n = addMicroStepsBatch({
      steps: bdSteps,
      energy: bdEnergy,
      goalLabel: bdGoal || activeProject?.name || 'Project',
    })
    setBreakdownAdded(n)
    setBreakdownStep(4)
    setPref('queueCollapsed', true)
    setQueueOpen(false)
    setDoneOpen(false)
    setActiveView('flow')
    setStepFocusKey((k) => k + 1)
    flashToast(`${n} micro-steps ready — do #1 only`)
  }

  const finishBreakdownToStep = () => {
    setShowBreakdown(false)
    setActiveView('flow')
    window.setTimeout(() => {
      document
        .getElementById('current-step')
        ?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
    }, 60)
  }

  const downloadDataBackup = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `creative-companion-backup-${toISODate()}.json`
    a.click()
    URL.revokeObjectURL(url)
    flashToast('Backup downloaded')
  }

  const submitBoardUrl = () => {
    const url = boardUrl.trim()
    if (!url) return
    addMoodPin({
      type: 'image',
      note: 'Reference URL',
      visual: url,
    })
    setBoardUrl('')
    setBoardAddMode(null)
    flashToast('Pin added')
  }

  const submitBoardNote = () => {
    const note = boardNote.trim() || 'Direction note'
    addMoodPin({
      type: 'quote',
      note,
      visual:
        projectPalette[0] ||
        'linear-gradient(135deg, #4F46E5, #0D9488)',
    })
    setBoardNote('')
    setBoardAddMode(null)
    flashToast('Note pin added')
  }

  return (
    <div className={`app ${theme} view-${activeView}`}>
      <header className="header">
        <div className="header-content">
          <div className="brand-block">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Creative Companion
            </div>
            <p className="logo-sub">Creative work tool for ADHD brains</p>
          </div>
          <nav className="nav" aria-label="Primary">
            {[
              { id: 'flow', label: 'Work' },
              { id: 'studio', label: 'Board' },
              { id: 'project', label: 'Projects' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                className={`nav-button ${activeView === v.id ? 'active' : ''}`}
                onClick={() => setActiveView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            {bodyDoubling && (
              <span className="mate-on-badge" aria-live="polite">
                {bodyDoubleSilent ? 'Presence on' : 'Sitting with you'}
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost header-help"
              onClick={() => setShowCreativeReset(true)}
            >
              I&apos;m stuck
            </button>
            <button
              type="button"
              className={`btn btn-ghost header-help${
                activeView === 'settings' ? ' is-nav-active' : ''
              }`}
              onClick={() => setActiveView('settings')}
            >
              Settings
            </button>
            <div className="more-wrap">
              <button
                type="button"
                className="btn btn-secondary header-more"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(!moreOpen)}
              >
                More
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu">
                  <p className="more-menu-intro">
                    Main work is on <strong>Work</strong>,{' '}
                    <strong>Board</strong>, and <strong>Projects</strong>. Use
                    these when you stall, need focus, or want to package the
                    brand.
                  </p>

                  <p className="more-menu-group">When you stall</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={openBreakdown}
                  >
                    <strong>Break project into micro-steps</strong>
                    <span>
                      Guided ADHD breakdown: goal → done line → editable step
                      list on your desk. Use when the whole project feels too
                      big.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      toggleBodyDoubling()
                      setMoreOpen(false)
                    }}
                  >
                    <strong>
                      {bodyDoubling
                        ? 'Turn off body double'
                        : 'Body double'}
                    </strong>
                    <span>
                      Quiet company on screen so you&apos;re not alone — not a
                      chat bot. Use when starting feels hard.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('spark')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Spark · ⌘K</strong>
                    <span>
                      One creative prompt when you don&apos;t know what to do
                      next. Optional — skip if the step is clear.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('insights')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Focus timer</strong>
                    <span>
                      Hold a work block (2 or 25 min) on your current step. Use
                      when you need a container, not more ideas.
                    </span>
                  </button>

                  <p className="more-menu-group">Brand &amp; delivery</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('brand')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Brand identity template</strong>
                    <span>
                      Colors, type, voice, logo direction — the full system.
                      Use when the project needs a shareable identity.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      openExportPanel()
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Export identity pack</strong>
                    <span>
                      Download/print what you filled in Brand. Use to share with
                      a client or keep a snapshot.
                    </span>
                  </button>

                  <p className="more-menu-group">Time</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('calendar')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Deadline calendar</strong>
                    <span>
                      See project due dates and step due dates by month. Use so
                      deadlines stay visible without another app.
                    </span>
                  </button>

                  <p className="more-menu-group">Setup</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      createNewProject()
                      setActiveView('project')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>New project</strong>
                    <span>
                      Start another client or personal lane. Use when work
                      shouldn&apos;t mix with the current desk.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      toggleTheme()
                      setMoreOpen(false)
                    }}
                  >
                    <strong>
                      {theme === 'warm' ? 'Dark mode' : 'Light mode'}
                    </strong>
                    <span>
                      Screen comfort only. Doesn&apos;t change your work data.
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* ===== DESK = step-by-step work loop ===== */}
        {activeView === 'flow' && (
          <div className="flow-view">
            <div className="flow-top">
              <div>
                <h1 className="page-title">Work loop</h1>
                <p className="page-sub">
                  One project. One next step. Break big work into micro-steps
                  when overwhelm hits.
                </p>
              </div>
              <div className="flow-top-actions">
                {/* Context primary CTA */}
                {!nextTask && deskTasks.length === 0 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openBreakdown}
                  >
                    Break project into micro-steps
                  </button>
                ) : nextTask ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={completeCurrentStep}
                  >
                    Complete current step
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      document.getElementById('desk-capture')?.focus()
                    }
                  >
                    Add next entry
                  </button>
                )}
                <div className="flow-progress">
                  <div className="flow-progress-bar" aria-hidden="true">
                    <div
                      className="flow-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="flow-progress-label">
                    {completedCount}/{deskTasks.length || 0} done
                    {deskTasks.length > 0 ? ` · ${progressPercent}%` : ''}
                  </span>
                </div>
              </div>
            </div>

            {projectDeadline && (
              <div
                className={`deadline-banner urgency-${projectUrgency || 'later'}`}
              >
                <div>
                  <strong>Project deadline</strong>
                  <span>
                    {formatShortDate(projectDeadline)} ·{' '}
                    {urgencyLabel(projectDeadline)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setActiveView('calendar')}
                >
                  Open calendar
                </button>
              </div>
            )}

            {showHowItWorks ? (
              <section className="product-card" aria-label="How the loop works">
                <div className="product-card-top">
                  <p className="product-card-eyebrow">How this works</p>
                  <button
                    type="button"
                    className="product-card-dismiss"
                    onClick={hideHowItWorks}
                  >
                    Got it
                  </button>
                </div>
                <ol className="product-steps">
                  <li>
                    <span className="product-step-num">1</span>
                    <span>
                      <strong>Capture</strong>
                      <em>Dump every messy idea</em>
                    </span>
                  </li>
                  <li>
                    <span className="product-step-num">2</span>
                    <span>
                      <strong>Do the current step</strong>
                      <em>Only the next open task</em>
                    </span>
                  </li>
                  <li>
                    <span className="product-step-num">3</span>
                    <span>
                      <strong>Need help?</strong>
                      <em>Split · spark · timer · board</em>
                    </span>
                  </li>
                </ol>
              </section>
            ) : (
              <button
                type="button"
                className="how-it-works-link"
                onClick={revealHowItWorks}
              >
                How the work loop works
              </button>
            )}

            {/* 01 Capture */}
            <section className="panel brand-section">
              <div className="brand-section-label">01 · Capture</div>
              <div className="panel-head" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 className="panel-title">Add an entry</h2>
                  <p className="panel-hint">
                    Project:{' '}
                    <strong>{activeProject?.name || 'None selected'}</strong>
                  </p>
                </div>
                {projectPills}
              </div>
              <div className="capture-row">
                <input
                  id="desk-capture"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                  placeholder="What needs doing? Dump it raw…"
                  aria-label="Add to desk"
                />
                <button
                  type="button"
                  onClick={addQuickTask}
                  className="btn btn-primary"
                >
                  Add entry
                </button>
              </div>
              <div className="capture-desk-meta">
                <button
                  type="button"
                  className="text-link capture-options-toggle"
                  onClick={() => setCaptureOptionsOpen((o) => !o)}
                  aria-expanded={captureOptionsOpen}
                >
                  {captureOptionsOpen ? 'Hide options' : 'Energy & voice'}
                </button>
                {captureOptionsOpen && (
                  <>
                    <select
                      className="capture-energy"
                      value={captureEnergy}
                      onChange={(e) => setCaptureEnergy(e.target.value)}
                      aria-label="Energy level"
                    >
                      <option value="high">High energy</option>
                      <option value="med">Med energy</option>
                      <option value="low">Low energy</option>
                    </select>
                    <label className="capture-due-label">
                      Due
                      <input
                        type="date"
                        className="capture-due-input"
                        value={captureDue}
                        onChange={(e) => setCaptureDue(e.target.value)}
                        aria-label="Optional due date"
                      />
                    </label>
                    <button
                      type="button"
                      className="voice-link"
                      onClick={startVoice}
                    >
                      Voice input
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* 02 Current step — the only job that matters */}
            <section
              className="panel brand-section step-focus-panel"
              key={stepFocusKey}
              id="current-step"
            >
              <div className="brand-section-label">02 · Current step</div>
              {!nextTask ? (
                <div className="empty-state">
                  <p className="empty-state-title">
                    {doneTasks.length > 0
                      ? 'Queue clear — nice work'
                      : 'No current step yet'}
                  </p>
                  <p className="empty-state-body">
                    {doneTasks.length > 0
                      ? 'Add another entry above, or break the project into new micro-steps.'
                      : 'Empty project? Start with micro-steps. Or add one entry above.'}
                  </p>
                  <div className="step-focus-actions" style={{ marginTop: '0.85rem' }}>
                    {deskTasks.length === 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openBreakdown}
                      >
                        Break project into micro-steps
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        document.getElementById('desk-capture')?.focus()
                      }
                    >
                      Add an entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="step-focus">
                  <div className="step-focus-meta">
                    <span className="task-badge">Do this now</span>
                    <span className="task-meta">
                      {(nextTask.energy || 'med')} energy
                      {nextTask.parentId ? ' · micro-step' : ''}
                      {nextTask.dueDate
                        ? ` · ${urgencyLabel(nextTask.dueDate)}`
                        : ''}
                    </span>
                  </div>
                  <input
                    className="step-focus-title"
                    value={nextTask.title}
                    onChange={(e) =>
                      updateTaskTitle(nextTask.id, e.target.value)
                    }
                    aria-label="Edit current step"
                  />
                  <label className="field-label" htmlFor="step-due">
                    Step due date (optional)
                  </label>
                  <input
                    id="step-due"
                    type="date"
                    className="field-input step-due-input"
                    value={nextTask.dueDate || ''}
                    onChange={(e) =>
                      setTaskDueDate(nextTask.id, e.target.value)
                    }
                  />
                  <div className="step-focus-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={completeCurrentStep}
                    >
                      Mark complete
                    </button>
                    {!nextTask.parentId && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          breakIntoSteps(nextTask.id)
                          flashToast('Split into 3 micro-steps')
                          setStepFocusKey((k) => k + 1)
                        }}
                      >
                        Split into 3 steps
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        removeTask(nextTask.id)
                        flashToast('Step removed')
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 03 Need help? — max 3 primary tools */}
            <section className="panel brand-section help-panel">
              <div className="brand-section-label">03 · Need help?</div>
              <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                Use one tool, then return here. More tools live under More.
              </p>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card help-card-featured"
                  onClick={openBreakdown}
                >
                  <strong>Break project into micro-steps</strong>
                  <span>When the whole project feels too big</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  disabled={!nextTask || !!nextTask.parentId}
                  onClick={() => {
                    if (!nextTask) return
                    breakIntoSteps(nextTask.id)
                    flashToast('Split into 3 micro-steps')
                    setStepFocusKey((k) => k + 1)
                  }}
                >
                  <strong>Split this step</strong>
                  <span>3 smaller actions from current only</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setShowCreativeReset(true)}
                >
                  <strong>I&apos;m stuck</strong>
                  <span>Pick one small restart</span>
                </button>
              </div>
              <div className="help-secondary">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('studio')}
                >
                  Board
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('spark')}
                >
                  Spark
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('insights')}
                >
                  Focus timer
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('calendar')}
                >
                  Deadlines
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('brand')}
                >
                  Brand
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => toggleBodyDoubling()}
                >
                  {bodyDoubling ? 'Body double off' : 'Body double'}
                </button>
              </div>
            </section>

            {/* 04 Queue — collapsed by default when busy */}
            <section className="panel brand-section">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setQueueOpen((o) => !o)}
                aria-expanded={
                  queueTasks.length === 0
                    ? false
                    : queueCollapsed
                      ? queueOpen
                      : true
                }
              >
                <span className="brand-section-label" style={{ margin: 0 }}>
                  04 · Queue · {queueTasks.length} waiting
                </span>
                <span className="section-toggle-hint">
                  {queueTasks.length === 0
                    ? ''
                    : queueCollapsed && !queueOpen
                      ? 'Show'
                      : 'Hide'}
                </span>
              </button>
              {queueTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Nothing waiting. Completing the current step promotes the next
                  entry automatically.
                </p>
              ) : (queueCollapsed ? queueOpen : true) ? (
                <div className="desk-list" style={{ marginTop: '0.75rem' }}>
                  {queueTasks.map((task, i) => (
                    <div key={task.id} className="task-row">
                      <label className="task-row-label">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleTask(task.id)}
                        />
                        <span className="task-row-body">
                          <span className="task-step-num">Step {i + 2}</span>
                          <span className="task-title">{task.title}</span>
                          <span className="task-meta">
                            {(task.energy || 'med')} energy
                            {task.dueDate
                              ? ` · ${formatShortDate(task.dueDate)}`
                              : ''}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Queue hidden so you only see the current step. Show when ready.
                </p>
              )}
            </section>

            {/* 05 Completed — collapsed by default */}
            <section className="panel brand-section">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setDoneOpen((o) => !o)}
                aria-expanded={doneOpen}
              >
                <span className="brand-section-label" style={{ margin: 0 }}>
                  05 · Completed · {doneTasks.length}
                </span>
                <span className="section-toggle-hint">
                  {doneTasks.length === 0 ? '' : doneOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {doneTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Finished steps land here — proof you moved.
                </p>
              ) : doneOpen ? (
                <ul className="done-list" style={{ marginTop: '0.75rem' }}>
                  {doneTasks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="done-undo"
                        onClick={() => toggleTask(t.id)}
                        title="Mark incomplete"
                      >
                        ✓
                      </button>
                      <span className="done-title">{t.title}</span>
                      <button
                        type="button"
                        className="text-link"
                        style={{ marginTop: 0 }}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this completed step permanently?'
                            )
                          ) {
                            removeTask(t.id)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        )}

        {/* ===== MOOD BOARD = visual collection template ===== */}
        {activeView === 'studio' && (
          <div className="studio-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to work loop
            </button>

            <div className="flow-top">
              <div>
                <h1 className="page-title">Mood board</h1>
                <p className="page-sub">
                  Collect references for the current step — then return to the
                  desk.
                </p>
              </div>
              <span className="panel-count">{deskMood.length} pins</span>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">01 · Project</div>
              <div className="panel-head" style={{ marginBottom: 0 }}>
                <div>
                  <h2 className="panel-title">
                    {activeProject?.name || 'Project'}
                  </h2>
                  <p className="panel-hint">
                    {activeProject?.brief ||
                      'No brief yet — add one on Projects or Brand.'}
                  </p>
                </div>
                {projectPills}
              </div>
              {nextTask && (
                <div className="mood-linked-step">
                  <span className="task-badge">Linked to desk</span>
                  <p className="mood-linked-title">{nextTask.title}</p>
                  <p className="panel-hint" style={{ margin: 0 }}>
                    Pin refs that help this step, then mark it complete on the
                    desk.
                  </p>
                </div>
              )}
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">02 · Add references</div>
              <div className="mood-add-grid">
                <label className="mood-add-card btn-like">
                  <strong>Upload images</strong>
                  <span>Screenshots, photos, comps</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      uploadMoodFiles(e.target.files)
                      e.target.value = ''
                      flashToast('Images added')
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={`mood-add-card${
                    boardAddMode === 'url' ? ' is-active' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'url' ? null : 'url'))
                  }
                >
                  <strong>Paste URL</strong>
                  <span>Image link from web</span>
                </button>
                <button
                  type="button"
                  className={`mood-add-card${
                    boardAddMode === 'note' ? ' is-active' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'note' ? null : 'note'))
                  }
                >
                  <strong>Add color / note</strong>
                  <span>Text pin on brand color</span>
                </button>
                <button
                  type="button"
                  className="mood-add-card"
                  onClick={() => setActiveView('spark')}
                >
                  <strong>Get a spark</strong>
                  <span>Prompt → pin to board</span>
                </button>
              </div>
              {boardAddMode === 'url' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-url">
                    Image URL
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-url"
                      className="field-input"
                      value={boardUrl}
                      onChange={(e) => setBoardUrl(e.target.value)}
                      placeholder="https://…"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardUrl()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardUrl}
                      disabled={!boardUrl.trim()}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
              {boardAddMode === 'note' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-note">
                    Note / direction
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-note"
                      className="field-input"
                      value={boardNote}
                      onChange={(e) => setBoardNote(e.target.value)}
                      placeholder="e.g. Soft twilight, no hard sell"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardNote()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardNote}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
              <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
                Tip: drag image files onto the board below.
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                03 · Board · {deskMood.length}
              </div>
              <div
                className={`mood-board${deskMood.length ? ' has-pins' : ''}${
                  deskMood.length === 1 ? ' single-pin' : ''
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.length) {
                    uploadMoodFiles(e.dataTransfer.files)
                    return
                  }
                  const data =
                    e.dataTransfer.getData('text/uri-list') ||
                    e.dataTransfer.getData('text')
                  if (data?.trim()) {
                    addMoodPin({
                      type: 'image',
                      note: 'Dropped reference',
                      visual: data.trim(),
                    })
                  }
                }}
              >
                {deskMood.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">Board is empty</p>
                    <p className="empty-state-body">
                      Use step 02 to upload, paste a URL, or add a note pin.
                      Drag files here anytime.
                    </p>
                  </div>
                ) : (
                  deskMood.map((item, index) => {
                    const isHero = index === 0
                    const isGradient =
                      typeof item.visual === 'string' &&
                      item.visual.includes('gradient')
                    const isQuote = item.type === 'quote' || isGradient
                    return (
                      <article
                        key={item.id || index}
                        className={`mood-card${isQuote ? ' is-quote' : ''}${
                          isHero ? ' is-hero' : ''
                        }`}
                      >
                        {isQuote ? (
                          <div
                            className="mood-pin-face"
                            style={{
                              background: isGradient
                                ? item.visual
                                : undefined,
                              backgroundColor: !isGradient
                                ? item.visual || '#0F172A'
                                : undefined,
                            }}
                          >
                            <p className="mood-pin-caption">
                              {item.note || 'Note'}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="mood-pin-media"
                            style={{
                              backgroundImage: `url(${item.visual})`,
                            }}
                          />
                        )}
                        <div className="mood-pin-tools">
                          <input
                            className="mood-pin-note-input"
                            value={item.note || ''}
                            onChange={(e) =>
                              updateMoodPinNote(item.id, e.target.value)
                            }
                            placeholder="Caption / why this pin…"
                            aria-label="Pin note"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost mood-pin-remove"
                            onClick={() => removeMoodPin(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </section>

            <section className="panel brand-section help-panel">
              <div className="brand-section-label">04 · Next</div>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('flow')}
                >
                  <strong>Back to current step</strong>
                  <span>
                    {nextTask
                      ? nextTask.title.slice(0, 48)
                      : 'Open work loop'}
                  </span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('brand')}
                >
                  <strong>Brand template</strong>
                  <span>Use pins in identity pack</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => openExportPanel()}
                >
                  <strong>Export pack</strong>
                  <span>Share direction</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== SPARK (help tool) ===== */}
        {activeView === 'spark' && (
          <div className="spark-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to work loop
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Spark</h1>
                <p className="page-sub">
                  One prompt · pin it · return to your current step
                </p>
              </div>
            </div>
            {nextTask && (
              <p className="mood-linked-step" style={{ marginBottom: '1rem' }}>
                <span className="task-badge">For</span>{' '}
                <span className="mood-linked-title">{nextTask.title}</span>
              </p>
            )}
            <section className="panel brand-section">
              <div className="brand-section-label">01 · Prompt</div>
              <div className="spark-card">
                <p>{currentSpark}</p>
              </div>
              <div className="spark-actions">
                <button
                  type="button"
                  onClick={nextSpark}
                  className="btn btn-primary"
                >
                  Another spark
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    addMoodPin({
                      type: 'quote',
                      note: currentSpark,
                      visual: projectPalette[0] || '#4F46E5',
                    })
                    setActiveView('studio')
                  }}
                >
                  Pin to mood board
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setActiveView('flow')}
                >
                  Done — back to step
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== FOCUS (help tool) ===== */}
        {activeView === 'insights' && (
          <div className="insights-layout">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to work loop
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Focus timer</h1>
                <p className="page-sub">
                  Hold the pocket · then complete the current step
                </p>
              </div>
            </div>
            {nextTask && (
              <div className="mood-linked-step" style={{ marginBottom: '1rem' }}>
                <span className="task-badge">Work on</span>
                <p className="mood-linked-title">{nextTask.title}</p>
              </div>
            )}
            <section className="panel focus-panel brand-section">
              <div className="brand-section-label">01 · Timer</div>
              <div className="insights-timer">
                {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
              </div>
              <div className="insights-focus-actions">
                <button
                  type="button"
                  onClick={() => {
                    setSessionComplete(false)
                    if (focusLeft === 0) setFocusLeft(25 * 60)
                    setIsFocusRunning(!isFocusRunning)
                  }}
                  className="btn btn-primary"
                  disabled={focusLeft === 0 && !isFocusRunning}
                >
                  {isFocusRunning ? 'Pause' : 'Start 25 min'}
                </button>
                <button
                  type="button"
                  onClick={() => resetFocus(25)}
                  className="btn btn-secondary"
                >
                  Reset 25
                </button>
                <button
                  type="button"
                  onClick={() => resetFocus(2)}
                  className="btn btn-ghost"
                >
                  2 min
                </button>
              </div>
              {sessionComplete && (
                <p className="session-done">Session complete. Take a break.</p>
              )}
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">02 · After</div>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card"
                  disabled={!nextTask}
                  onClick={() => {
                    if (nextTask) toggleTask(nextTask.id)
                    setActiveView('flow')
                  }}
                >
                  <strong>Mark step done</strong>
                  <span>Complete current desk step</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('flow')}
                >
                  <strong>Back to loop</strong>
                  <span>
                    {completedCount}/{deskTasks.length || 0} done
                  </span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => toggleBodyDoubling()}
                >
                  <strong>Body double</strong>
                  <span>{bodyDoubling ? 'On' : 'Turn on'}</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== DEADLINE CALENDAR ===== */}
        {activeView === 'calendar' && (
          <div className="calendar-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to work loop
            </button>

            <div className="flow-top">
              <div>
                <h1 className="page-title">Deadlines</h1>
                <p className="page-sub">
                  Project due dates + step due dates. Simple calendar so time
                  stays visible.
                </p>
              </div>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">01 · Active project due</div>
              <p className="panel-hint" style={{ marginBottom: '0.55rem' }}>
                {activeProject?.name || 'No project'}
              </p>
              <label className="field-label" htmlFor="project-deadline">
                Project deadline
              </label>
              <div className="deadline-edit-row">
                <input
                  id="project-deadline"
                  type="date"
                  className="field-input"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                />
                {projectDeadline && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setProjectDeadline('')}
                  >
                    Clear
                  </button>
                )}
              </div>
              {projectDeadline && (
                <p
                  className={`deadline-chip urgency-${projectUrgency || 'later'}`}
                >
                  {formatShortDate(projectDeadline)} ·{' '}
                  {urgencyLabel(projectDeadline)}
                </p>
              )}
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">02 · Month</div>
              <div className="cal-nav">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setCalCursor((c) => {
                      const m = c.month - 1
                      if (m < 0) return { year: c.year - 1, month: 11 }
                      return { ...c, month: m }
                    })
                  }
                >
                  ←
                </button>
                <h2 className="cal-month-title">
                  {formatMonthYear(calCursor.year, calCursor.month)}
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setCalCursor((c) => {
                      const m = c.month + 1
                      if (m > 11) return { year: c.year + 1, month: 0 }
                      return { ...c, month: m }
                    })
                  }
                >
                  →
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const n = new Date()
                    setCalCursor({
                      year: n.getFullYear(),
                      month: n.getMonth(),
                    })
                  }}
                >
                  Today
                </button>
              </div>
              <div className="cal-weekdays" aria-hidden="true">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="cal-grid">
                {buildMonthGrid(calCursor.year, calCursor.month).map(
                  (cell, i) => {
                    const events = cell.date
                      ? calendarEvents[cell.date] || []
                      : []
                    const isToday = cell.date === toISODate()
                    return (
                      <div
                        key={i}
                        className={`cal-cell${
                          cell.inMonth ? '' : ' is-pad'
                        }${isToday ? ' is-today' : ''}${
                          events.length ? ' has-events' : ''
                        }`}
                      >
                        {cell.day != null && (
                          <span className="cal-daynum">{cell.day}</span>
                        )}
                        {events.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            className={`cal-event cal-event-${ev.type}`}
                            title={ev.label}
                            onClick={() => {
                              if (ev.projectId != null) {
                                selectProject(ev.projectId)
                              }
                              setActiveView(
                                ev.type === 'project' ? 'project' : 'flow'
                              )
                            }}
                          >
                            {ev.type === 'project' ? '◆ ' : '· '}
                            {ev.label.slice(0, 18)}
                            {ev.label.length > 18 ? '…' : ''}
                          </button>
                        ))}
                        {events.length > 3 && (
                          <span className="cal-more">
                            +{events.length - 3}
                          </span>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
              <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
                ◆ = project deadline · · = open step due date
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">03 · Upcoming list</div>
              {upcomingDeadlines.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  No deadlines yet. Set a project deadline above, or add a due
                  date when capturing a step (Energy &amp; voice → Due).
                </p>
              ) : (
                <ul className="deadline-list">
                  {upcomingDeadlines.map((row) => (
                    <li
                      key={`${row.kind}-${row.id}`}
                      className={`deadline-list-item urgency-${row.urgency}`}
                    >
                      <div>
                        <strong>
                          {row.kind === 'project' ? 'Project' : 'Step'}:{' '}
                          {row.name}
                        </strong>
                        <span>
                          {formatShortDate(row.date)} ·{' '}
                          {urgencyLabel(row.date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          if (row.kind === 'project') {
                            selectProject(row.id)
                            setActiveView('project')
                          } else if (row.projectId != null) {
                            selectProject(row.projectId)
                            setActiveView('flow')
                          }
                        }}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* ===== BRAND IDENTITY TEMPLATE ===== */}
        {activeView === 'brand' && (
          <div className="brand-layout">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to desk
            </button>

            <div className="brand-template-top">
              <div>
                <h1 className="page-title">Brand identity template</h1>
                <p className="page-sub">
                  Fill the system for{' '}
                  <strong>{activeProject?.name || 'this project'}</strong>, then
                  export a shareable pack.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openExportPanel}
              >
                Export pack
              </button>
            </div>

            {/* Live identity cover */}
            <section
              className="brand-cover"
              style={{
                background:
                  projectPalette[0] || 'var(--accent-primary)',
                color: bestTextOn(projectPalette[0] || '#4F46E5'),
              }}
            >
              <p className="brand-cover-label">Brand identity</p>
              <h2 className="brand-cover-name">
                {activeProject?.name || 'Untitled project'}
              </h2>
              <p className="brand-cover-tagline">
                {activeProject?.tagline?.trim() ||
                  'Add a tagline below — one line people can remember.'}
              </p>
              <div className="brand-cover-strip">
                {projectPalette.map((c, i) => (
                  <div key={`${c}-c-${i}`} style={{ background: c }} />
                ))}
              </div>
            </section>

            {/* 01 Essentials */}
            <section className="panel brand-section">
              <div className="brand-section-label">01 · Essentials</div>
              <div className="field-block">
                <label className="field-label" htmlFor="brand-tagline">
                  Tagline
                </label>
                <input
                  id="brand-tagline"
                  className="field-input"
                  value={activeProject?.tagline || ''}
                  onChange={(e) =>
                    updateBrandField('tagline', e.target.value)
                  }
                  placeholder="One line. Memorable."
                />
              </div>
              <div className="field-block" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="brand-brief">
                  Positioning / brief
                </label>
                <textarea
                  id="brand-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is this for? What should it feel like?"
                  rows={3}
                />
              </div>
            </section>

            {/* 02 Voice */}
            <section className="panel brand-section">
              <div className="brand-section-label">02 · Voice</div>
              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="brand-voice">
                  How we sound
                </label>
                <textarea
                  id="brand-voice"
                  className="field-textarea"
                  value={activeProject?.voice || ''}
                  onChange={(e) => updateBrandField('voice', e.target.value)}
                  placeholder="e.g. Warm, plain-spoken, hopeful — never corporate."
                  rows={2}
                />
              </div>
              <div className="brand-do-dont">
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-do">
                    Do
                  </label>
                  <textarea
                    id="brand-do"
                    className="field-textarea"
                    value={activeProject?.doUse || ''}
                    onChange={(e) =>
                      updateBrandField('doUse', e.target.value)
                    }
                    placeholder="Behaviors, materials, tone that fit."
                    rows={3}
                  />
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-dont">
                    Don&apos;t
                  </label>
                  <textarea
                    id="brand-dont"
                    className="field-textarea"
                    value={activeProject?.dontUse || ''}
                    onChange={(e) =>
                      updateBrandField('dontUse', e.target.value)
                    }
                    placeholder="Clichés and traps to avoid."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* 03 Palette + checker */}
            <section className="panel brand-section">
              <div className="brand-section-label">03 · Color</div>
              <div className="brand-palette-block" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Palette builder
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    {projectPalette.length}/8 · saved on project
                  </span>
                </div>

                <div className="brand-palette-bleed">
                  {projectPalette.map((c, i) => (
                    <div
                      key={`${c}-${i}`}
                      style={{ flex: 1, background: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="direction-hex">
                  {projectPalette.join(' · ')}
                </div>

                <ul className="palette-editor">
                  {projectPalette.map((hex, index) => {
                    const display =
                      hexDrafts[index] != null ? hexDrafts[index] : hex
                    return (
                      <li key={index} className="palette-row">
                        <label
                          className="palette-swatch-wrap"
                          title="Pick color"
                        >
                          <input
                            type="color"
                            className="palette-color-input"
                            value={normalizeHex(hex) || '#888888'}
                            onChange={(e) => {
                              const n = normalizeHex(e.target.value)
                              if (n) {
                                updatePaletteColor(index, n)
                                setHexDrafts((d) => {
                                  const next = { ...d }
                                  delete next[index]
                                  return next
                                })
                              }
                            }}
                            aria-label={`Color ${index + 1} picker`}
                          />
                          <span
                            className="palette-swatch"
                            style={{
                              background: normalizeHex(hex) || hex,
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          className="palette-hex-input"
                          value={display}
                          onChange={(e) =>
                            handleHexChange(index, e.target.value)
                          }
                          onBlur={() => commitHex(index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                          spellCheck={false}
                          aria-label={`Color ${index + 1} hex`}
                        />
                        <span
                          className="palette-preview-chip"
                          style={{
                            background: normalizeHex(hex) || hex,
                            color: bestTextOn(hex),
                          }}
                        >
                          Aa
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost palette-remove"
                          disabled={projectPalette.length <= 2}
                          onClick={() => removePaletteColor(index)}
                          aria-label={`Remove color ${index + 1}`}
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <div className="palette-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={projectPalette.length >= 8}
                    onClick={() => addPaletteColor('#888888')}
                  >
                    Add color
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setProjectPalette([...DEFAULT_PALETTE])}
                  >
                    Reset default
                  </button>
                </div>
              </div>

              <div className="palette-checker" style={{ marginTop: '1.15rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Contrast checker
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    WCAG 2.1 · AA ≥ 4.5:1 body · ≥ 3:1 large
                  </span>
                </div>
                <label className="field-label" htmlFor="check-bg">
                  Background color
                </label>
                <select
                  id="check-bg"
                  className="palette-bg-select"
                  value={checkBgIndex}
                  onChange={(e) => setCheckBgIndex(Number(e.target.value))}
                >
                  {projectPalette.map((c, i) => (
                    <option key={`${c}-bg-${i}`} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
                <div
                  className="palette-check-preview"
                  style={{ background: checkBg }}
                >
                  <p
                    className="palette-check-preview-text"
                    style={{ color: bestTextOn(checkBg) }}
                  >
                    Sample text on this background
                  </p>
                </div>
                <ul className="palette-check-list">
                  {contrastPairs.length === 0 ? (
                    <li className="panel-hint">
                      Add at least two different colors to check contrast.
                    </li>
                  ) : (
                    contrastPairs.map((pair) => (
                      <li
                        key={`${pair.fg}-${pair.bg}`}
                        className="palette-check-row"
                      >
                        <span className="palette-check-pair">
                          <span
                            className="palette-check-fg"
                            style={{
                              background: pair.fg,
                              color: bestTextOn(pair.fg),
                            }}
                          >
                            Aa
                          </span>
                          <span className="palette-check-on">on</span>
                          <span
                            className="palette-check-bg-chip"
                            style={{ background: pair.bg }}
                          />
                        </span>
                        <span className="palette-check-ratio">
                          {formatRatio(pair.ratio)}
                        </span>
                        <span
                          className={`palette-check-badge ${pair.label.level}`}
                        >
                          {pair.label.text}
                        </span>
                        <span className="palette-check-detail">
                          {pair.grade.aaNormal
                            ? 'Body text OK'
                            : pair.grade.aaLarge
                              ? 'Large text only'
                              : 'Too low for text'}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            {/* 04 Type */}
            <section className="panel brand-section">
              <div className="brand-section-label">04 · Typography</div>
              <div className="brand-type-pair">
                <div className="field-block">
                  <label className="field-label" htmlFor="type-heading">
                    Heading face
                  </label>
                  <input
                    id="type-heading"
                    className="field-input"
                    value={
                      activeProject?.typeHeading || 'Plus Jakarta Sans Bold'
                    }
                    onChange={(e) =>
                      updateBrandField('typeHeading', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-display"
                    style={{ marginTop: '0.65rem' }}
                  >
                    {activeProject?.typeHeading || 'Plus Jakarta Sans Bold'}
                  </div>
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="type-body">
                    Body face
                  </label>
                  <input
                    id="type-body"
                    className="field-input"
                    value={
                      activeProject?.typeBody || 'Plus Jakarta Sans Regular'
                    }
                    onChange={(e) =>
                      updateBrandField('typeBody', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-body"
                    style={{ marginTop: '0.65rem' }}
                  >
                    {activeProject?.typeBody || 'Plus Jakarta Sans Regular'} —
                    The quick brown fox keeps the brief honest.
                  </div>
                </div>
              </div>
            </section>

            {/* 05 Logo direction */}
            <section className="panel brand-section">
              <div className="brand-section-label">05 · Logo direction</div>
              <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
                Pick a direction note — not a fake logo generator.
              </p>
              <div className="link-list">
                <button
                  type="button"
                  className={`link-row${
                    activeProject?.logoDirection?.startsWith('Concept 1')
                      ? ' is-primary'
                      : ''
                  }`}
                  onClick={() =>
                    chooseLogoDirection(
                      'Concept 1',
                      'Abstract geometric mark with your initial'
                    )
                  }
                >
                  <span className="link-row-label">Concept 1</span>
                  <span className="link-row-meta">
                    {activeProject?.logoDirection?.startsWith('Concept 1')
                      ? 'Saved'
                      : 'Geometric mark'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`link-row${
                    activeProject?.logoDirection?.startsWith('Concept 2')
                      ? ' is-primary'
                      : ''
                  }`}
                  onClick={() =>
                    chooseLogoDirection(
                      'Concept 2',
                      'Hand-drawn wordmark + icon'
                    )
                  }
                >
                  <span className="link-row-label">Concept 2</span>
                  <span className="link-row-meta">
                    {activeProject?.logoDirection?.startsWith('Concept 2')
                      ? 'Saved'
                      : 'Wordmark'}
                  </span>
                </button>
              </div>
              <div className="field-block" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                <label className="field-label" htmlFor="logo-custom">
                  Or write your own direction
                </label>
                <input
                  id="logo-custom"
                  className="field-input"
                  value={activeProject?.logoDirection || ''}
                  onChange={(e) => setLogoDirection(e.target.value)}
                  placeholder="e.g. Soft monoline bird mark · no drop shadows"
                />
              </div>
            </section>

            {/* 06 Mood from board */}
            <section className="panel brand-section">
              <div className="brand-section-label">06 · Mood (from board)</div>
              {deskMood.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  No pins yet.{' '}
                  <button
                    type="button"
                    className="text-link"
                    style={{ marginTop: 0 }}
                    onClick={() => setActiveView('studio')}
                  >
                    Open mood board
                  </button>
                </p>
              ) : (
                <div className="brand-mood-row">
                  {deskMood.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="brand-mood-thumb"
                      style={
                        p.type === 'image'
                          ? {
                              backgroundImage: `url(${p.visual})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {
                              background:
                                typeof p.visual === 'string' &&
                                p.visual.includes('gradient')
                                  ? p.visual
                                  : p.visual || '#0B1220',
                            }
                      }
                      title={p.note}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="brand-export-bar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={openExportPanel}
              >
                Export identity pack
              </button>
              <span className="panel-hint" style={{ margin: 0 }}>
                Print / PDF or download HTML
              </span>
            </div>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {activeView === 'settings' && (
          <div className="settings-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to Work
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-sub">
                  Control stimulation, presence, and your data. Everything saves
                  on this device only — no account, no cloud.
                </p>
              </div>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">01 · Appearance</div>
              <div className="settings-row">
                <div>
                  <strong>Theme</strong>
                  <span>Light or dark screen comfort</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleTheme()}
                >
                  {theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Reduce motion</strong>
                  <span>Less animation (easier on focus)</span>
                </div>
                <button
                  type="button"
                  className={`btn ${reduceMotion ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPref('reduceMotion', !reduceMotion)}
                >
                  {reduceMotion ? 'On' : 'Off'}
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">02 · Presence &amp; sound</div>
              <div className="settings-row">
                <div>
                  <strong>Body double</strong>
                  <span>Quiet company while you work — not a chatbot</span>
                </div>
                <button
                  type="button"
                  className={`btn ${bodyDoubling ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleBodyDoubling()}
                >
                  {bodyDoubling ? 'On' : 'Off'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Silent presence</strong>
                  <span>Header badge only — no floating message card</span>
                </div>
                <button
                  type="button"
                  className={`btn ${bodyDoubleSilent ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPref('bodyDoubleSilent', !bodyDoubleSilent)}
                >
                  {bodyDoubleSilent ? 'On' : 'Off'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Timer sound</strong>
                  <span>Soft chime when a focus session ends</span>
                </div>
                <button
                  type="button"
                  className={`btn ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPref('soundEnabled', !soundEnabled)}
                >
                  {soundEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">03 · Work loop</div>
              <div className="settings-row">
                <div>
                  <strong>Collapse queue by default</strong>
                  <span>Hide waiting steps so you only see the current one</span>
                </div>
                <button
                  type="button"
                  className={`btn ${queueCollapsed ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPref('queueCollapsed', !queueCollapsed)}
                >
                  {queueCollapsed ? 'On' : 'Off'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Show “How this works”</strong>
                  <span>Intro card on the Work screen</span>
                </div>
                <button
                  type="button"
                  className={`btn ${showHowItWorks ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPref('showHowItWorks', !showHowItWorks)}
                >
                  {showHowItWorks ? 'On' : 'Off'}
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">04 · Your data</div>
              <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                All projects, tasks, pins, and brand fields live in this
                browser&apos;s storage. Clearing site data or switching devices
                can wipe them — download a backup if it matters.
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={downloadDataBackup}
                >
                  Download JSON backup
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset to demo projects and sample tasks? Your current data will be replaced.'
                      )
                    ) {
                      clearAllData()
                      setShowOnboarding(true)
                      setActiveView('flow')
                      flashToast('Reset to demo data')
                    }
                  }}
                >
                  Reset to demo data
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Start completely empty (one blank project, no tasks)? This cannot be undone unless you have a backup.'
                      )
                    ) {
                      clearToEmpty()
                      setActiveView('flow')
                      flashToast('Started empty')
                    }
                  }}
                >
                  Start empty
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== PROJECTS ===== */}
        {activeView === 'project' && (
          <div className="project-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Back to desk
            </button>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h1 className="panel-title page-title-in-panel">Projects</h1>
                  <p className="panel-hint">
                    Switch project, edit brief, break overwhelm into micro-steps
                  </p>
                </div>
                {projectPills}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginBottom: '1rem' }}
                onClick={openBreakdown}
              >
                Break this project into micro-steps
              </button>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="project-brief">
                  Brief
                </label>
                <textarea
                  id="project-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is this for? What should it feel like?"
                  rows={3}
                />
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="proj-deadline-field">
                  Project deadline
                </label>
                <div className="deadline-edit-row">
                  <input
                    id="proj-deadline-field"
                    type="date"
                    className="field-input"
                    value={projectDeadline}
                    onChange={(e) => setProjectDeadline(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setActiveView('calendar')}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <div className="capture-row" style={{ marginBottom: '1.15rem' }}>
                <input
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                  placeholder="Quick add to this project’s desk…"
                  aria-label="Add to desk"
                />
                <button
                  type="button"
                  onClick={addQuickTask}
                  className="btn btn-primary"
                >
                  Add idea
                </button>
              </div>

              <p className="list-heading">Jump to</p>
              <div className="link-list">
                <button
                  type="button"
                  className="link-row is-primary"
                  onClick={() => setActiveView('flow')}
                >
                  <span className="link-row-label">Desk</span>
                  <span className="link-row-meta">
                    {deskTasks.filter((t) => !t.completed).length} open
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('studio')}
                >
                  <span className="link-row-label">Mood board</span>
                  <span className="link-row-meta">
                    {deskMood.length} pins
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('brand')}
                >
                  <span className="link-row-label">Brand &amp; export</span>
                  <span className="link-row-meta">Pack</span>
                </button>
              </div>
            </section>

            <section className="panel panel-compact">
              <p className="list-heading">On the desk</p>
              {deskTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  Nothing open. Add an idea above.
                </p>
              ) : (
                <ul className="desk-snapshot">
                  {deskTasks.slice(0, 5).map((t) => (
                    <li
                      key={t.id}
                      className={t.completed ? 'is-done' : undefined}
                    >
                      <span className="desk-snapshot-mark" aria-hidden="true">
                        {t.completed ? '✓' : '·'}
                      </span>
                      <span>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      {showOnboarding && (
        <div className="export-overlay" role="dialog" aria-modal="true">
          <div className="export-panel onboard-panel">
            <h2 style={{ marginTop: 0 }}>Name your first project</h2>
            <p className="view-lede">
              Creative Companion is a work loop for ADHD creative work: dump
              ideas, break into micro-steps, do one next step. Not a chatbot.
              Data stays on this device only.
            </p>
            <label className="onboard-label">
              Project name
              <input
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="e.g. 100 Families spring booklet"
                className="onboard-input"
              />
            </label>
            <label className="onboard-label">
              Brief (optional)
              <textarea
                value={onboardBrief}
                onChange={(e) => setOnboardBrief(e.target.value)}
                placeholder="Who is this for? What should it feel like?"
                rows={3}
                className="onboard-input"
              />
            </label>
            <div className="export-panel-actions" style={{ justifyContent: 'stretch' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => finishOnboarding('demo')}
              >
                Use demo projects
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!onboardName.trim()}
                onClick={() => finishOnboarding('custom')}
              >
                Start with this project
              </button>
            </div>
          </div>
        </div>
      )}

      {savePulse && (
        <div className="autosave-chip">✓ Saved on this device</div>
      )}

      {actionToast && (
        <div className="action-toast" role="status">
          {actionToast}
        </div>
      )}

      {exportPanel && (
        <div
          className="export-overlay no-print-hide"
          role="dialog"
          aria-modal="true"
          aria-label="Brand direction pack"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportPanel(null)
          }}
        >
          <div className="export-panel portfolio-export">
            <div className="export-panel-header no-print">
              <div>
                <h3 style={{ margin: 0 }}>Export pack</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setExportPanel(null)}
              >
                Close
              </button>
            </div>

            <article className="direction-sheet" id="direction-sheet">
              <div
                className="export-identity-cover"
                style={{
                  background: exportPanel.palette[0] || '#4F46E5',
                  color: bestTextOn(exportPanel.palette[0] || '#4F46E5'),
                }}
              >
                <div className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>
                  Brand identity template
                </div>
                <h1 className="direction-title" style={{ color: 'inherit' }}>
                  {exportPanel.projectName}
                </h1>
                <p className="direction-brief" style={{ color: 'inherit', opacity: 0.92 }}>
                  {exportPanel.tagline || 'Tagline TBD'}
                </p>
              </div>

              <div className="kicker">Positioning</div>
              <p className="direction-brief">
                {exportPanel.brief || 'No brief yet.'}
              </p>
              {exportPanel.voice && (
                <>
                  <div className="kicker">Voice</div>
                  <p className="direction-brief">{exportPanel.voice}</p>
                </>
              )}

              <div className="kicker">Palette</div>
              <div className="direction-palette">
                {exportPanel.palette.map((c, i) => (
                  <div key={`${c}-${i}`} style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="direction-hex">
                {exportPanel.palette.join(' · ')}
              </div>

              <div className="kicker">Typography</div>
              <p className="direction-type">
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {exportPanel.typeHeading}
                </span>
                <span className="surface-meta"> · {exportPanel.typeBody}</span>
              </p>

              {exportPanel.logoDirection && (
                <>
                  <div className="kicker">Logo direction</div>
                  <p className="direction-brief">{exportPanel.logoDirection}</p>
                </>
              )}

              <div className="export-do-dont">
                <div>
                  <div className="kicker">Do</div>
                  <p className="direction-brief">
                    {exportPanel.doUse || '—'}
                  </p>
                </div>
                <div>
                  <div className="kicker">Don&apos;t</div>
                  <p className="direction-brief">
                    {exportPanel.dontUse || '—'}
                  </p>
                </div>
              </div>

              <div className="kicker">Mood direction</div>
              {exportPanel.pins.length === 0 ? (
                <p className="surface-meta">No pins in this project yet.</p>
              ) : (
                <div className="direction-pins">
                  {exportPanel.pins.map((p) => (
                    <div key={p.id} className="direction-pin">
                      <div
                        className="direction-pin-visual"
                        style={{
                          backgroundImage:
                            p.type === 'image' ? `url(${p.visual})` : 'none',
                          backgroundColor:
                            p.type === 'quote' ? p.visual : '#EDE6FF',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="direction-pin-note">{p.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="kicker">Open work</div>
              <ul className="direction-tasks">
                {exportPanel.openTasks.length === 0 ? (
                  <li>Desk clear for this project</li>
                ) : (
                  exportPanel.openTasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))
                )}
              </ul>

              <footer className="direction-foot">
                Creative Companion · Brand identity ·{' '}
                {new Date().toLocaleDateString()}
              </footer>
            </article>

            <div className="export-panel-actions no-print">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={downloadExportHtml}
              >
                Download HTML
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body double — presence only, NOT a chatbot */}
      {bodyDoubling && !bodyDoubleSilent && (
        <div
          className="studio-mate"
          role="status"
          aria-live="polite"
          style={{
            animation:
              isFocusRunning && !reduceMotion
                ? 'softPulse 4s infinite ease-in-out'
                : 'none',
          }}
        >
          <div className="studio-mate-top">
            <div>
              <strong>Body double</strong>
              <span className="studio-mate-live">
                {isFocusRunning ? 'With you in focus' : 'Present · not a chat'}
              </span>
            </div>
            <button
              type="button"
              className="studio-mate-x"
              onClick={() => setBodyDoubling(false)}
              aria-label="Turn off body double"
            >
              ×
            </button>
          </div>
          <p className="studio-mate-msg">
            {isFocusRunning
              ? 'Timer on. Stay with the top desk item.'
              : 'I’m just here so you’re not alone at the desk. No replies.'}
          </p>
        </div>
      )}

      {showBreakdown && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Break project into micro-steps"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBreakdown(false)
          }}
        >
          <div className="export-panel breakdown-panel">
            <div className="export-panel-header">
              <div>
                <p className="field-label" style={{ marginBottom: 4 }}>
                  ADHD project breakdown
                </p>
                <h3 style={{ margin: 0 }}>
                  Micro-steps for {activeProject?.name || 'this project'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowBreakdown(false)}
              >
                Close
              </button>
            </div>

            <div className="breakdown-progress" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`breakdown-dot${
                    breakdownStep >= i ? ' is-on' : ''
                  }`}
                />
              ))}
            </div>

            {breakdownStep === 0 && (
              <div className="breakdown-step">
                <p className="breakdown-lead">
                  Overwhelm usually means the project is still one giant blob.
                  We&apos;ll turn it into tiny, doable desk steps you can check
                  off one at a time.
                </p>
                <ol className="breakdown-how">
                  <li>Name the goal</li>
                  <li>Write what “done” looks like</li>
                  <li>Pick how many steps (5 / 8 / 12)</li>
                  <li>Edit the list, then add to your Work queue</li>
                </ol>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setBreakdownStep(1)}
                >
                  Start breakdown
                </button>
              </div>
            )}

            {breakdownStep === 1 && (
              <div className="breakdown-step">
                <label className="field-label" htmlFor="bd-goal">
                  1 · What are we making?
                </label>
                <input
                  id="bd-goal"
                  className="field-input"
                  value={bdGoal}
                  onChange={(e) => setBdGoal(e.target.value)}
                  placeholder="e.g. Spring booklet cover directions"
                />
                <label
                  className="field-label"
                  htmlFor="bd-done"
                  style={{ marginTop: '0.85rem' }}
                >
                  2 · What does “done enough” look like?
                </label>
                <textarea
                  id="bd-done"
                  className="field-textarea"
                  rows={2}
                  value={bdDone}
                  onChange={(e) => setBdDone(e.target.value)}
                  placeholder="e.g. 3 cover options ready to show the client"
                />
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(0)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!bdGoal.trim()}
                    onClick={() => setBreakdownStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 2 && (
              <div className="breakdown-step">
                <p className="field-label">3 · How broken-down do you need?</p>
                <div className="breakdown-depth-list">
                  {BREAKDOWN_DEPTHS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`breakdown-depth${
                        bdDepth === d.id ? ' is-active' : ''
                      }`}
                      onClick={() => setBdDepth(d.id)}
                    >
                      <strong>{d.label}</strong>
                      <span>{d.hint}</span>
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="bd-energy">
                  Energy for these steps
                </label>
                <select
                  id="bd-energy"
                  className="palette-bg-select"
                  value={bdEnergy}
                  onChange={(e) => setBdEnergy(e.target.value)}
                >
                  <option value="low">Low — tiny actions only</option>
                  <option value="med">Med — normal creative work</option>
                  <option value="high">High — deep focus later</option>
                </select>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={buildBreakdownPreview}
                  >
                    Generate micro-steps
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 3 && (
              <div className="breakdown-step">
                <p className="field-label">
                  4 · Edit anything · delete · add your own
                </p>
                <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                  These become real desk entries. You only ever do the top open
                  one.
                </p>
                <ul className="breakdown-edit-list">
                  {bdSteps.map((line, i) => (
                    <li key={i}>
                      <span className="breakdown-edit-num">{i + 1}</span>
                      <input
                        className="field-input"
                        value={line}
                        onChange={(e) =>
                          updateBdStepLine(i, e.target.value)
                        }
                        aria-label={`Micro-step ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeBdStepLine(i)}
                        aria-label={`Remove step ${i + 1}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="text-link"
                  onClick={addBdStepLine}
                >
                  + Add another micro-step
                </button>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!bdSteps.some((s) => s.trim())}
                    onClick={commitBreakdown}
                  >
                    Add {bdSteps.filter((s) => s.trim()).length} steps to Work
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 4 && (
              <div className="breakdown-step">
                <p className="session-done" style={{ marginTop: 0 }}>
                  Added {breakdownAdded} micro-steps. Queue is collapsed so you
                  only see step #1.
                </p>
                <p className="breakdown-lead">
                  Do <strong>only the current step</strong>. Mark complete when
                  finished — the next micro-step rises automatically.
                </p>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openBreakdown}
                  >
                    Break down more
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={finishBreakdownToStep}
                  >
                    Start current step
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreativeReset && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Stuck? Pick one move"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreativeReset(false)
          }}
        >
          <div className="export-panel reset-panel">
            <h3 className="reset-title">Stuck? Pick one</h3>
            <p className="view-lede reset-lede">Esc to close.</p>
            <div className="reset-list">
              {creativeResetItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.action}
                  className="reset-row"
                >
                  <span className="reset-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="reset-label">{item.label}</span>
                  <span className="reset-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCreativeReset(false)}
              className="text-link reset-dismiss"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
