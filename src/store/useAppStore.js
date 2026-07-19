import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, toISODate } from '../lib/dates'

export const sparkPrompts = [
  'What if your next illustration series explored the feeling of quiet belonging?',
  'Design a visual system that feels both protective and hopeful for foster families.',
  'Make a single mark that says “you are not alone in this” without using those words.',
  'Three color stories for 100 Families that feel like a warm invitation, not a campaign.',
  'What does sustained joy look like as a repeating pattern or texture?',
]

export const seedTasks = [
  {
    id: 1,
    title:
      '100 Families booklet — cover directions that feel like invitation, not campaign',
    energy: 'med',
    meta: '1 of 3 micro-steps · thumbnails waiting in Figma',
    completed: false,
    seeded: true,
    projectId: 1,
  },
  {
    id: 2,
    title:
      'Sparrow’s Promise — foster parent appreciation carousel (warm, not corporate)',
    energy: 'low',
    meta: '0 of 3 · photo pull is the only next move',
    completed: false,
    seeded: true,
    projectId: 1,
  },
  {
    id: 3,
    title: 'Alayla Jade — wordmark explorations (hand-drawn, not template)',
    energy: 'med',
    meta: 'Brand lane · 2 marks pinned in Studio',
    completed: false,
    seeded: true,
    projectId: 2,
  },
  {
    id: 4,
    title: 'Personal series — “quiet belonging” gradient studies',
    energy: 'low',
    meta: 'No client · pure play',
    completed: false,
    seeded: true,
    projectId: 3,
  },
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
}

export const seedProjects = [
  {
    id: 1,
    name: '100 Families Booklet',
    active: true,
    brief:
      'Warm invitation for foster & family support — hope without campaign gloss.',
    logoDirection: '',
    palette: ['#5B4B8A', '#2A9D8F', '#1C1917', '#F6F1EB'],
    tagline: 'You are not alone in this.',
    voice: 'Warm, hopeful, plain-spoken. No campaign gloss.',
    typeHeading: 'Plus Jakarta Sans Bold',
    typeBody: 'Plus Jakarta Sans Regular',
    doUse: 'Soft invitation language · real photos · space to breathe',
    dontUse: 'Stock “diversity” clichés · corporate blue · hard sells',
    deadline: addDays(toISODate(), 14),
    tasks: [],
  },
  {
    id: 2,
    name: 'Alayla Jade Brand',
    active: false,
    brief:
      'Personal brand system: handmade marks, purple spark, quiet confidence.',
    logoDirection: '',
    palette: ['#4F46E5', '#7C3AED', '#0B1220', '#EEF2FF'],
    tagline: 'Handmade marks. Quiet confidence.',
    voice: 'Direct, creative, a little sparkly — never loud.',
    typeHeading: 'Plus Jakarta Sans Bold',
    typeBody: 'Plus Jakarta Sans Regular',
    doUse: 'Hand-drawn edges · indigo spark · short lines',
    dontUse: 'Template logos · generic scripts · clutter',
    deadline: addDays(toISODate(), 28),
    tasks: [],
  },
  {
    id: 3,
    name: 'Personal Illustrations',
    active: false,
    brief: 'Play lane — quiet belonging, gradient studies, no client clock.',
    logoDirection: '',
    palette: [...defaultProjectPalette],
    tagline: 'Quiet belonging, in color.',
    voice: 'Soft, curious, unhurried.',
    typeHeading: 'Plus Jakarta Sans Bold',
    typeBody: 'Plus Jakarta Sans Regular',
    doUse: 'Gradients · texture · one strong feeling',
    dontUse: 'Deadlines energy · over-explaining',
    deadline: '',
    tasks: [],
  },
]

/** Soft gradient “pins” so Studio isn’t an empty wall on first open */
export const seedMoodItems = [
  {
    id: 101,
    type: 'quote',
    note: 'Quiet belonging — soft gradients, hand-drawn line, no hard sell.',
    visual: 'linear-gradient(135deg, #5E2B8A, #C9B1E0)',
    projectId: 1,
    seeded: true,
  },
  {
    id: 102,
    type: 'quote',
    note: 'Mark that feels chosen, not campaign — purple spark + human warmth.',
    visual: 'linear-gradient(120deg, #863BFF, #2A9D8F)',
    projectId: 2,
    seeded: true,
  },
  {
    id: 103,
    type: 'quote',
    note: 'Personal series mood: twilight studio, sustained joy as texture.',
    visual: 'linear-gradient(160deg, #1A1625, #863BFF 80%)',
    projectId: 3,
    seeded: true,
  },
]

const useAppStore = create(
  persist(
    (set, get) => ({
      projects: seedProjects,
      currentProjectId: 1,
      tasks: seedTasks,
      moodItems: seedMoodItems,
      theme: 'warm', // warm | deep
      bodyDoubling: false,
      onboarded: false,
      sparkIndex: 0,
      currentSpark: sparkPrompts[0],
      // Preferences (persisted)
      prefs: {
        soundEnabled: true,
        reduceMotion: false,
        bodyDoubleSilent: false, // true = badge only, no floating card copy
        queueCollapsed: true, // collapse queue after breakdown / by default when busy
        showHowItWorks: true,
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
          theme: s.theme,
          prefs: s.prefs,
          sparkIndex: s.sparkIndex,
          onboarded: s.onboarded,
        }
      },

      clearAllData: () => {
        set({
          projects: seedProjects.map((p) => ({ ...p })),
          currentProjectId: 1,
          tasks: seedTasks.map((t) => ({ ...t })),
          moodItems: seedMoodItems.map((m) => ({ ...m })),
          theme: 'warm',
          bodyDoubling: false,
          onboarded: false,
          sparkIndex: 0,
          currentSpark: sparkPrompts[0],
          prefs: {
            soundEnabled: true,
            reduceMotion: false,
            bodyDoubleSilent: false,
            queueCollapsed: true,
            showHowItWorks: true,
          },
        })
        try {
          localStorage.removeItem('cc-hide-howto')
          localStorage.removeItem('cc-onboarded')
        } catch {
          /* ignore */
        }
      },

      clearToEmpty: () => {
        const id = Date.now()
        set({
          projects: [
            {
              id,
              name: 'My project',
              active: true,
              brief: '',
              logoDirection: '',
              palette: [...defaultProjectPalette],
              deadline: '',
              ...defaultBrandIdentity,
              tasks: [],
            },
          ],
          currentProjectId: id,
          tasks: [],
          moodItems: [],
          bodyDoubling: false,
          onboarded: true,
          sparkIndex: 0,
          currentSpark: sparkPrompts[0],
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
        set((state) => ({
          moodItems: [
            {
              ...pin,
              id: pin.id || Date.now(),
              projectId: pin.projectId ?? state.currentProjectId,
              note: pin.note || '',
            },
            ...state.moodItems,
          ],
        })),

      updateMoodPinNote: (id, note) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, note } : m
          ),
        })),

      removeMoodPin: (id) =>
        set((state) => ({
          moodItems: state.moodItems.filter((m) => m.id !== id),
        })),

      setMoodItems: (moodItems) => set({ moodItems }),

      nextSpark: () =>
        set((state) => {
          const next = (state.sparkIndex + 1) % sparkPrompts.length
          return {
            sparkIndex: next,
            currentSpark: sparkPrompts[next],
          }
        }),

      createNewProject: (name = 'New Creative Project', brief = '') => {
        const project = {
          id: Date.now(),
          name,
          active: true,
          brief:
            brief || 'Direction TBD — capture first, polish later.',
          logoDirection: '',
          palette: [...defaultProjectPalette],
          deadline: '',
          ...defaultBrandIdentity,
          tasks: [],
        }
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
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        tasks: state.tasks,
        moodItems: state.moodItems,
        theme: state.theme,
        onboarded: state.onboarded,
        sparkIndex: state.sparkIndex,
        currentSpark: state.currentSpark,
        prefs: state.prefs,
      }),
      onRehydrateStorage: () => (state) => {
        // One-time bridge from earlier cc-desk localStorage shape
        try {
          if (!state) return
          const legacy = localStorage.getItem('cc-desk')
          const onboardFlag = localStorage.getItem('cc-onboarded')
          if (onboardFlag === '1') state.onboarded = true
          if (!legacy) return
          const data = JSON.parse(legacy)
          if (Array.isArray(data.tasks) && data.tasks.length && state.tasks?.length <= seedTasks.length) {
            state.tasks = data.tasks
          }
          if (Array.isArray(data.moodItems) && data.moodItems.length) {
            state.moodItems = data.moodItems
          } else if (!state.moodItems?.length) {
            state.moodItems = seedMoodItems
          }
          if (data.activeProjectId) state.currentProjectId = data.activeProjectId
          if (Array.isArray(data.projects) && data.projects.length) {
            state.projects = data.projects.map((p) => ({
              logoDirection: '',
              ...p,
            }))
          }
          // Empty mood after rehydrate → seed demo pins once
          if (!state.moodItems?.length) {
            state.moodItems = seedMoodItems
          }
        } catch {
          /* ignore */
        }
      },
    }
  )
)

export default useAppStore
