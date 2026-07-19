import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, toISODate } from '../lib/dates'
import { createBreakItem } from '../lib/breakKit'

/** Real creative prompts — tools, not fake user data */
export const sparkPrompts = [
  'What if the mark worked in one color at sticker size and still felt human?',
  'Name the feeling the cover must land — one sentence, no jargon.',
  'Design a visual system that protects quiet attention, not hustle energy.',
  'What is the one thing a viewer must understand in three seconds?',
  'Strip one decorative layer. Does hierarchy still hold?',
]

export const defaultProjectPalette = [
  '#4F46E5',
  '#0D9488',
  '#0B1220',
  '#F4F5F9',
]

/** Default brand identity template fields on each project */
export const defaultBrandIdentity = {
  tagline: '',
  voice: '',
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  doUse: '',
  dontUse: '',
  /** Optional overrides; null/empty keys fall back to mapPaletteRoles(palette) */
  colorRoles: null,
  /** data URL mark for pack cover */
  logoImage: '',
  conceptPackage: {
    audience: '',
    outcome: '',
    concept: '',
    voice: '',
    visualDirection: '',
    doUse: '',
    dontUse: '',
    notes: '',
  },
}

/** Fresh real desk — no sample clients or fake tasks */
export function createBlankProject(name = 'My project', brief = '') {
  const id = Date.now()
  return {
    id,
    name: name || 'My project',
    active: true,
    brief: brief || '',
    logoDirection: '',
    palette: [...defaultProjectPalette],
    deadline: '',
    ...defaultBrandIdentity,
    tasks: [],
  }
}

export function blankWorkspaceState() {
  const project = createBlankProject('My project', '')
  return {
    projects: [project],
    currentProjectId: project.id,
    tasks: [],
    moodItems: [],
    conceptItems: [],
    breakKit: [],
    theme: 'warm',
    bodyDoubling: false,
    onboarded: false,
    sparkIndex: 0,
    currentSpark: sparkPrompts[0],
    prefs: {
      soundEnabled: true,
      reduceMotion: false,
      bodyDoubleSilent: false,
      forceBreaksEnabled: true,
      queueCollapsed: true,
      showHowItWorks: true,
      /** XP / quest bar — off by default (redesign brief) */
      showProgress: false,
    },
  }
}

/** @deprecated kept for migration only — never seed into new installs */
export const seedTasks = []
export const seedProjects = []
export const seedMoodItems = []

const initial = blankWorkspaceState()

const useAppStore = create(
  persist(
    (set, get) => ({
      ...initial,
      projects: initial.projects,
      currentProjectId: initial.currentProjectId,
      tasks: [],
      moodItems: [],
      conceptItems: [],
      breakKit: [],
      theme: 'warm',
      bodyDoubling: false,
      onboarded: false,
      sparkIndex: 0,
      currentSpark: sparkPrompts[0],
      prefs: { ...initial.prefs },

      addBreakKitItem: (payload) => {
        const item = createBreakItem(payload || {})
        if (!item) return { ok: false, error: 'Add a short title' }
        set((state) => ({
          breakKit: [item, ...(state.breakKit || [])],
        }))
        return { ok: true, item }
      },

      removeBreakKitItem: (id) =>
        set((state) => ({
          breakKit: (state.breakKit || []).filter((i) => i.id !== id),
        })),

      updateBreakKitItem: (id, patch) =>
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) =>
            i.id === id ? { ...i, ...patch, id: i.id } : i
          ),
        })),

      /**
       * Mark a break-kit item done (during break or anytime).
       * Recurring → stamps lastDoneAt for today; one-shot → completed.
       */
      completeBreakKitItem: (id) => {
        const now = new Date().toISOString()
        let found = null
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) => {
            if (i.id !== id) return i
            found = i
            if (i.recurring) {
              return { ...i, lastDoneAt: now }
            }
            return { ...i, completed: true, lastDoneAt: now }
          }),
        }))
        return { ok: Boolean(found), item: found }
      },

      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects.map((p) => ({ ...p, active: false })),
            {
              logoDirection: '',
              palette: [...defaultProjectPalette],
              deadline: '',
              ...defaultBrandIdentity,
              ...project,
              active: true,
            },
          ],
          currentProjectId: project.id,
        })),

      setCurrentProject: (id) =>
        set((state) => ({
          currentProjectId: id,
          projects: state.projects.map((p) => ({
            ...p,
            active: p.id === id,
          })),
        })),

      updateProjectBrief: (brief) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, brief } : p
          ),
        })),

      setProjectDeadline: (deadline) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, deadline: deadline || '' }
              : p
          ),
        })),

      setLogoDirection: (direction) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, logoDirection: direction }
              : p
          ),
        })),

      /** Replace full palette for active project (max 8) */
      setProjectPalette: (palette) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? {
                  ...p,
                  palette: (palette || []).slice(0, 8),
                }
              : p
          ),
        })),

      updatePaletteColor: (index, hex) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (index < 0 || index >= next.length) return p
            next[index] = hex
            return { ...p, palette: next }
          }),
        })),

      addPaletteColor: (hex = '#888888') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length >= 8) return p
            next.push(hex)
            return { ...p, palette: next }
          }),
        })),

      removePaletteColor: (index) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length <= 2) return p
            next.splice(index, 1)
            return { ...p, palette: next }
          }),
        })),

      /** Partial update of brand identity template fields */
      updateBrandField: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, [field]: value } : p
          ),
        })),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'warm' ? 'deep' : 'warm',
        })),

      setTheme: (theme) => set({ theme }),

      toggleBodyDoubling: () =>
        set((state) => ({ bodyDoubling: !state.bodyDoubling })),

      setBodyDoubling: (bodyDoubling) => set({ bodyDoubling }),

      setOnboarded: (onboarded) => set({ onboarded }),

      setPref: (key, value) =>
        set((state) => ({
          prefs: {
            soundEnabled: true,
            reduceMotion: false,
            bodyDoubleSilent: false,
            forceBreaksEnabled: true,
            queueCollapsed: true,
            showHowItWorks: true,
            ...state.prefs,
            [key]: value,
          },
        })),

      exportAllData: () => {
        const s = get()
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          projects: s.projects,
          currentProjectId: s.currentProjectId,
          tasks: s.tasks,
          moodItems: s.moodItems,
          conceptItems: s.conceptItems || [],
          breakKit: s.breakKit || [],
          theme: s.theme,
          prefs: s.prefs,
          sparkIndex: s.sparkIndex,
          onboarded: s.onboarded,
          currentSpark: s.currentSpark,
        }
      },

      /**
       * Apply a workspace payload (cloud pull or import).
       * Empty / invalid payload returns { ok: false }.
       */
      hydrateFromPayload: (data) => {
        if (!data || typeof data !== 'object') {
          return { ok: false, error: 'Empty workspace' }
        }
        if (!Array.isArray(data.projects) || data.projects.length === 0) {
          return { ok: false, error: 'No projects in workspace' }
        }
        if (!Array.isArray(data.tasks)) {
          return { ok: false, error: 'No tasks in workspace' }
        }
        const projects = data.projects.map((p) => ({
          logoDirection: '',
          palette: [...defaultProjectPalette],
          deadline: '',
          ...defaultBrandIdentity,
          ...p,
        }))
        const currentProjectId =
          data.currentProjectId &&
          projects.some((p) => p.id === data.currentProjectId)
            ? data.currentProjectId
            : projects[0].id
        const sparkIndex =
          typeof data.sparkIndex === 'number' ? data.sparkIndex : 0
        set({
          projects: projects.map((p) => ({
            ...p,
            active: p.id === currentProjectId,
          })),
          currentProjectId,
          tasks: data.tasks,
          moodItems: Array.isArray(data.moodItems) ? data.moodItems : [],
          conceptItems: Array.isArray(data.conceptItems) ? data.conceptItems : [],
          breakKit: Array.isArray(data.breakKit) ? data.breakKit : [],
          theme: data.theme === 'deep' ? 'deep' : 'warm',
          prefs: {
            soundEnabled: true,
            reduceMotion: false,
            bodyDoubleSilent: false,
            forceBreaksEnabled: true,
            queueCollapsed: true,
            showHowItWorks: true,
            ...(data.prefs || {}),
          },
          sparkIndex,
          currentSpark:
            data.currentSpark ||
            sparkPrompts[sparkIndex % sparkPrompts.length] ||
            sparkPrompts[0],
          onboarded: data.onboarded !== false,
          bodyDoubling: false,
        })
        return { ok: true }
      },

      /**
       * Restore a JSON backup from exportAllData.
       * Returns { ok: true } or { ok: false, error: string }.
       */
      importAllData: (raw) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          return get().hydrateFromPayload(data)
        } catch (e) {
          return {
            ok: false,
            error: e?.message || 'Could not read backup',
          }
        }
      },

      renameProject: (id, name) => {
        const next = String(name || '').trim()
        if (!next) return
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name: next } : p
          ),
        }))
      },

      /** Delete a project and its tasks/pins. Keeps at least one project. */
      deleteProject: (id) => {
        const { projects, tasks, moodItems, conceptItems, currentProjectId } =
          get()
        if (projects.length <= 1) {
          return { ok: false, error: 'Keep at least one project' }
        }
        const remaining = projects.filter((p) => p.id !== id)
        if (remaining.length === projects.length) {
          return { ok: false, error: 'Project not found' }
        }
        const nextId =
          currentProjectId === id ? remaining[0].id : currentProjectId
        set({
          projects: remaining.map((p) => ({
            ...p,
            active: p.id === nextId,
          })),
          currentProjectId: nextId,
          tasks: tasks.filter((t) => t.projectId !== id),
          moodItems: moodItems.filter((m) => m.projectId !== id),
          conceptItems: (conceptItems || []).filter((c) => c.projectId !== id),
        })
        return { ok: true }
      },

      /** Soft-archive: hide from default lists, keep data. */
      archiveProject: (id) => {
        const { projects, currentProjectId } = get()
        const activeList = projects.filter((p) => !p.archived)
        if (activeList.length <= 1 && activeList[0]?.id === id) {
          return { ok: false, error: 'Keep at least one active project' }
        }
        const target = projects.find((p) => p.id === id)
        if (!target) return { ok: false, error: 'Project not found' }
        let nextId = currentProjectId
        if (currentProjectId === id) {
          nextId =
            projects.find((p) => p.id !== id && !p.archived)?.id ||
            projects.find((p) => p.id !== id)?.id
        }
        set({
          projects: projects.map((p) =>
            p.id === id
              ? { ...p, archived: true, active: false }
              : { ...p, active: p.id === nextId }
          ),
          currentProjectId: nextId,
        })
        return { ok: true }
      },

      unarchiveProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, archived: false } : p
          ),
        }))
        return { ok: true }
      },

      clearAllData: () => {
        const blank = blankWorkspaceState()
        set({ ...blank, onboarded: false })
        try {
          localStorage.removeItem('cc-hide-howto')
          localStorage.removeItem('cc-onboarded')
        } catch {
          /* ignore */
        }
      },

      clearToEmpty: () => {
        const blank = blankWorkspaceState()
        set({
          ...blank,
          onboarded: true,
          projects: blank.projects.map((p) => ({
            ...p,
            name: 'My project',
          })),
        })
      },

      setTasks: (tasks) => set({ tasks }),

      addTask: (task) =>
        set((state) => ({ tasks: [task, ...state.tasks] })),

      toggleTask: (id) =>
        set((state) => {
          const updated = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
          // Keep open work first, completed at the bottom
          const open = updated.filter((t) => !t.completed)
          const done = updated.filter((t) => t.completed)
          return { tasks: [...open, ...done] }
        }),

      updateTaskTitle: (id, title) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t
          ),
        })),

      setTaskDueDate: (id, dueDate) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, dueDate: dueDate || '' } : t
          ),
        })),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
        })),

      breakIntoSteps: (taskId) => {
        const { tasks, currentProjectId } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return
        const short =
          task.title.slice(0, 40) + (task.title.length > 40 ? '…' : '')
        const steps = [
          `Name the one feeling “${short}” must land (1 sentence)`,
          `Gather 3–5 refs that match that feeling (mood board)`,
          `Do a 15‑min messy first pass on “${short}” — ugly OK`,
        ]
        const newItems = steps.map((title, i) => ({
          id: Date.now() + i + 1,
          title,
          energy: 'low',
          meta: `Micro-step · from task`,
          completed: false,
          seeded: false,
          projectId: task.projectId ?? currentProjectId,
          parentId: taskId,
        }))
        // Parent moves to completed so micro-steps become the work queue
        const rest = tasks
          .filter((t) => t.id !== taskId)
          .map((t) => t)
        const parentDone = {
          ...task,
          completed: true,
          meta: 'Replaced by micro-steps',
        }
        set({
          tasks: [...newItems, ...rest.filter((t) => !t.completed), parentDone, ...rest.filter((t) => t.completed)],
        })
      },

      /** Add a batch of micro-steps for the active project (ADHD project breakdown) */
      addMicroStepsBatch: ({ steps, energy = 'low', goalLabel = '' }) => {
        const { currentProjectId, tasks, prefs } = get()
        const stamp = Date.now()
        const newItems = (steps || [])
          .map((title) => String(title || '').trim())
          .filter(Boolean)
          .map((title, i) => ({
            id: stamp + i + 1,
            title,
            energy,
            meta: goalLabel
              ? `Micro-step · ${goalLabel.slice(0, 32)}`
              : 'Micro-step · project breakdown',
            completed: false,
            seeded: false,
            projectId: currentProjectId,
            parentId: null,
            fromBreakdown: true,
          }))
        if (!newItems.length) return 0
        set({
          tasks: [...newItems, ...tasks],
          prefs: {
            ...prefs,
            queueCollapsed: true,
          },
        })
        return newItems.length
      },

      addMoodPin: (pin) =>
        set((state) => {
          const projectId = pin.projectId ?? state.currentProjectId
          const starred = (state.moodItems || []).filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          const inPack = !!pin.inPack
          const shift = pin.boardOrder == null
          const newPin = {
            ...pin,
            id: pin.id || Date.now(),
            projectId,
            note: pin.note || '',
            inPack,
            boardOrder: pin.boardOrder != null ? pin.boardOrder : 0,
            packOrder:
              pin.packOrder != null
                ? pin.packOrder
                : inPack
                  ? starred.length
                  : 0,
            packHero: !!pin.packHero,
          }
          return {
            moodItems: [
              newPin,
              ...state.moodItems.map((m) => {
                if (!shift) return m
                if (m.projectId != null && m.projectId !== projectId) return m
                return { ...m, boardOrder: (m.boardOrder ?? 0) + 1 }
              }),
            ],
          }
        }),

      updateMoodPinNote: (id, note) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, note } : m
          ),
        })),

      /**
       * Star/unstar a pin for the brand pack (max 6 per project).
       * @returns {{ ok: boolean, error?: string, inPack?: boolean }}
       */
      toggleMoodPinInPack: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin) return { ok: false, error: 'Pin not found' }
        const projectId = pin.projectId ?? state.currentProjectId
        if (pin.inPack) {
          const remaining = (state.moodItems || [])
            .filter(
              (m) =>
                m.id !== id &&
                m.inPack &&
                (m.projectId == null || m.projectId === projectId)
            )
            .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
          set({
            moodItems: state.moodItems.map((m) => {
              if (m.id === id) {
                return { ...m, inPack: false, packHero: false, packOrder: 0 }
              }
              const idx = remaining.findIndex((r) => r.id === m.id)
              if (idx >= 0) return { ...m, packOrder: idx }
              return m
            }),
          })
          return { ok: true, inPack: false }
        }
        const starred = (state.moodItems || []).filter(
          (m) =>
            m.inPack &&
            (m.projectId == null || m.projectId === projectId)
        )
        if (starred.length >= 6) {
          return { ok: false, error: 'Pack is full (6 pins max)' }
        }
        set({
          moodItems: state.moodItems.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inPack: true,
                  packOrder: starred.length,
                  packHero: starred.length === 0,
                }
              : m
          ),
        })
        return { ok: true, inPack: true }
      },

      /** Reorder starred pack pins; orderedIds = full starred list in new order */
      reorderPackPins: (orderedIds) => {
        const ids = (orderedIds || []).map(String)
        set((state) => {
          const heroId = (state.moodItems || []).find((m) => m.packHero)?.id
          return {
            moodItems: state.moodItems.map((m) => {
              const idx = ids.indexOf(String(m.id))
              if (idx < 0) return m
              return {
                ...m,
                inPack: true,
                packOrder: idx,
                // keep hero if still in list; else first becomes hero
                packHero: heroId
                  ? m.id === heroId
                  : idx === 0,
              }
            }),
          }
        })
        return { ok: true }
      },

      setPackHeroPin: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false, error: 'Star pin for pack first' }
        set({
          moodItems: state.moodItems.map((m) => ({
            ...m,
            packHero: m.id === id,
          })),
        })
        return { ok: true }
      },

      /**
       * Reorder all mood pins for a project (board grid order).
       * orderedIds = full list of pin ids in new visual order (project pins only).
       */
      reorderBoardPins: (orderedIds, projectId) => {
        const ids = (orderedIds || []).map(String)
        const pid = projectId ?? get().currentProjectId
        set((state) => {
          const mine = (state.moodItems || []).filter(
            (m) => m.projectId == null || m.projectId === pid
          )
          const others = (state.moodItems || []).filter(
            (m) => m.projectId != null && m.projectId !== pid
          )
          // Preserve any pin not in orderedIds at end
          const ordered = ids
            .map((id) => mine.find((m) => String(m.id) === id))
            .filter(Boolean)
          const leftover = mine.filter((m) => !ids.includes(String(m.id)))
          const nextMine = [...ordered, ...leftover].map((m, i) => ({
            ...m,
            boardOrder: i,
          }))
          return { moodItems: [...nextMine, ...others] }
        })
        return { ok: true }
      },

      movePackPin: (id, direction) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false }
        const projectId = pin.projectId ?? state.currentProjectId
        const starred = (state.moodItems || [])
          .filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
        const idx = starred.findIndex((m) => m.id === id)
        if (idx < 0) return { ok: false }
        const swapWith = direction === 'up' ? idx - 1 : idx + 1
        if (swapWith < 0 || swapWith >= starred.length) return { ok: false }
        const ids = starred.map((m) => m.id)
        ;[ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]]
        get().reorderPackPins(ids)
        return { ok: true }
      },

      setColorRole: (role, hex) => {
        const key = String(role || '')
        if (!['cover', 'text', 'accent', 'quiet'].includes(key)) {
          return { ok: false, error: 'Unknown role' }
        }
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              colorRoles: {
                ...(p.colorRoles || {}),
                [key]: hex,
              },
            }
          }),
        }))
        return { ok: true }
      },

      setLogoImage: (dataUrl) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, logoImage: dataUrl || '' }
              : p
          ),
        })),

      removeMoodPin: (id) =>
        set((state) => ({
          moodItems: state.moodItems.filter((m) => m.id !== id),
        })),

      setMoodItems: (moodItems) => set({ moodItems }),

      // ——— Concept pipeline (sketches → develop → iterate → lock → package) ———

      addConceptItem: (item) =>
        set((state) => ({
          conceptItems: [
            {
              id: item.id || Date.now() + Math.random(),
              projectId: item.projectId ?? state.currentProjectId,
              stage: item.stage || 'sketch',
              visual: item.visual || '',
              title: item.title || '',
              note: item.note || '',
              stepId: item.stepId || null,
              parentId: item.parentId || null,
              createdAt: item.createdAt || new Date().toISOString(),
            },
            ...(state.conceptItems || []),
          ],
        })),

      updateConceptItem: (id, patch) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),

      removeConceptItem: (id) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).filter(
            (c) => c.id !== id && c.parentId !== id
          ),
        })),

      /** Move sketch into develop lane */
      selectSketchToDevelop: (id) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id ? { ...c, stage: 'develop' } : c
          ),
        })),

      /** Lock idea into concept plan */
      lockConceptItem: (id, planNote = '') =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  stage: 'locked',
                  note: planNote?.trim() ? planNote.trim() : c.note,
                }
              : c
          ),
        })),

      updateConceptPackageField: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const pack = {
              audience: '',
              outcome: '',
              concept: '',
              voice: '',
              visualDirection: '',
              doUse: '',
              dontUse: '',
              notes: '',
              ...(p.conceptPackage || {}),
              [field]: value,
            }
            return { ...p, conceptPackage: pack }
          }),
        })),

      /**
       * Apply concept package + locked notes into Brand identity fields.
       * Returns patch summary for toast/UI.
       */
      applyConceptPackageToBrand: () => {
        const { projects, currentProjectId, conceptItems } = get()
        const project = projects.find((p) => p.id === currentProjectId)
        if (!project) return { ok: false, error: 'No project' }

        const draft = {
          audience: '',
          outcome: '',
          concept: '',
          voice: '',
          visualDirection: '',
          doUse: '',
          dontUse: '',
          notes: '',
          ...(project.conceptPackage || {}),
        }
        const locked = (conceptItems || []).filter(
          (c) =>
            c.projectId === currentProjectId &&
            (c.stage === 'locked' || c.stage === 'develop')
        )

        const briefParts = []
        if (draft.audience?.trim())
          briefParts.push(`Audience: ${draft.audience.trim()}`)
        if (draft.outcome?.trim())
          briefParts.push(`Outcome: ${draft.outcome.trim()}`)
        if (draft.notes?.trim()) briefParts.push(draft.notes.trim())
        const lockedLines = locked
          .map((c) => c.note || c.title)
          .filter(Boolean)
          .slice(0, 10)
        if (lockedLines.length) {
          briefParts.push(`Concept plan: ${lockedLines.join(' · ')}`)
        }

        const nextBrief =
          briefParts.join('\n\n') || project.brief || ''

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== currentProjectId) return p
            return {
              ...p,
              brief: nextBrief,
              tagline: draft.concept?.trim() || p.tagline || '',
              voice: draft.voice?.trim() || p.voice || '',
              logoDirection:
                draft.visualDirection?.trim() || p.logoDirection || '',
              doUse: draft.doUse?.trim() || p.doUse || '',
              dontUse: draft.dontUse?.trim() || p.dontUse || '',
            }
          }),
        }))
        return { ok: true }
      },

      nextSpark: () =>
        set((state) => {
          const next = (state.sparkIndex + 1) % sparkPrompts.length
          return {
            sparkIndex: next,
            currentSpark: sparkPrompts[next],
          }
        }),

      createNewProject: (name = 'My project', brief = '') => {
        const project = createBlankProject(
          name || 'My project',
          brief || ''
        )
        get().addProject(project)
        return project
      },

      // selectors helpers used via get in components
      getActiveProject: () => {
        const { projects, currentProjectId } = get()
        return projects.find((p) => p.id === currentProjectId)
      },
    }),
    {
      name: 'creative-companion-storage',
      version: 4,
      migrate: (persisted, fromVersion) => {
        // Keep real user data; only normalize missing arrays
        if (!persisted || typeof persisted !== 'object') {
          return blankWorkspaceState()
        }
        let moodItems = Array.isArray(persisted.moodItems)
          ? persisted.moodItems
          : []
        // v4: ensure boardOrder for stable board drag (old pins lacked it)
        if (fromVersion < 4 && moodItems.length) {
          const byProject = new Map()
          moodItems.forEach((m) => {
            const pid = m.projectId ?? '_none'
            if (!byProject.has(pid)) byProject.set(pid, [])
            byProject.get(pid).push(m)
          })
          const next = []
          byProject.forEach((list) => {
            list.forEach((m, i) => {
              next.push({
                ...m,
                boardOrder: m.boardOrder != null ? m.boardOrder : i,
              })
            })
          })
          moodItems = next
        }
        return {
          ...blankWorkspaceState(),
          ...persisted,
          tasks: Array.isArray(persisted.tasks) ? persisted.tasks : [],
          moodItems,
          conceptItems: Array.isArray(persisted.conceptItems)
            ? persisted.conceptItems
            : [],
          breakKit: Array.isArray(persisted.breakKit)
            ? persisted.breakKit
            : [],
          projects:
            Array.isArray(persisted.projects) && persisted.projects.length
              ? persisted.projects
              : blankWorkspaceState().projects,
        }
      },
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        tasks: state.tasks,
        moodItems: state.moodItems,
        conceptItems: state.conceptItems || [],
        breakKit: state.breakKit || [],
        theme: state.theme,
        onboarded: state.onboarded,
        sparkIndex: state.sparkIndex,
        currentSpark: state.currentSpark,
        prefs: state.prefs,
      }),
      onRehydrateStorage: () => (state) => {
        try {
          if (!state) return
          const onboardFlag = localStorage.getItem('cc-onboarded')
          if (onboardFlag === '1') state.onboarded = true
          if (!Array.isArray(state.tasks)) state.tasks = []
          if (!Array.isArray(state.moodItems)) state.moodItems = []
          if (!Array.isArray(state.conceptItems)) state.conceptItems = []
          if (!Array.isArray(state.breakKit)) state.breakKit = []
          // Normalize boardOrder for pins that predate board drag
          if (state.moodItems?.length) {
            const byProject = new Map()
            state.moodItems.forEach((m) => {
              const pid = m.projectId ?? '_none'
              if (!byProject.has(pid)) byProject.set(pid, [])
              byProject.get(pid).push(m)
            })
            const next = []
            byProject.forEach((list) => {
              list.forEach((m, i) => {
                next.push({
                  ...m,
                  boardOrder: m.boardOrder != null ? m.boardOrder : i,
                })
              })
            })
            state.moodItems = next
          }
          if (!Array.isArray(state.projects) || !state.projects.length) {
            const blank = blankWorkspaceState()
            state.projects = blank.projects
            state.currentProjectId = blank.currentProjectId
          }
          // Legacy bridge from earlier cc-desk shape (real user data only)
          const legacy = localStorage.getItem('cc-desk')
          if (!legacy) return
          const data = JSON.parse(legacy)
          if (Array.isArray(data.tasks) && data.tasks.length && !state.tasks?.length) {
            state.tasks = data.tasks
          }
          if (Array.isArray(data.moodItems) && data.moodItems.length && !state.moodItems?.length) {
            state.moodItems = data.moodItems
          }
          if (data.activeProjectId) state.currentProjectId = data.activeProjectId
          if (Array.isArray(data.projects) && data.projects.length) {
            state.projects = data.projects.map((p) => ({
              logoDirection: '',
              ...defaultBrandIdentity,
              ...p,
            }))
          }
        } catch {
          /* ignore */
        }
      },
    }
  )
)

export default useAppStore
