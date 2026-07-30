import { DEFAULT_PALETTE } from './color'
import { buildBrandPackSnapshot } from './exportFiles'

/**
 * The pack for the project currently on the desk.
 *
 * The pack is what the brand book is actually made of — `buildBrandPackSnapshot`
 * is where project fields become book fields — so anything that renders or
 * exports the book has to start from the same one. Until this existed, App.jsx
 * assembled it inline and the on-screen builder read the raw project instead,
 * which is half of why the book on screen and the exported PDF could disagree
 * about what the project contained.
 *
 * The desk filters live here rather than at each call site for the same reason
 * the page plan lives in bookDocument.js: a predicate copied into two files is
 * a predicate that will eventually mean two different things.
 */

/** Items belong to the desk if they are unassigned or match this project. */
export const onDesk = (item, projectId) =>
  item?.projectId == null || String(item.projectId) === String(projectId)

export const deskItems = (items, projectId) =>
  (items || []).filter((i) => onDesk(i, projectId))

/** The palette the book should use — the project's, or the app default. */
export const paletteFor = (project) =>
  project?.palette?.length > 0 ? project.palette : DEFAULT_PALETTE

/**
 * Build the current project's pack from raw store state.
 *
 * `tasks` is optional because the book doesn't read them; the export panel
 * does. Passing them keeps one pack shape rather than two near-identical ones.
 */
export function currentBrandPack({ project, projectId, tasks = [], moodItems = [] } = {}) {
  return buildBrandPackSnapshot({
    project,
    tasks: deskItems(tasks, projectId),
    moodItems: deskItems(moodItems, projectId),
    palette: paletteFor(project),
  })
}
