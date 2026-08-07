/**
 * `cc export` — the brand pack, written to disk instead of to a download.
 *
 * Every artefact here comes from the same functions the Pack page calls. The
 * PDF is `downloadBrandPackVectorPdf` with `returnBlobOnly`, which is the mode
 * that never touches the DOM; the markdown, HTML, tokens and mark files are
 * pure builders. Nothing is re-implemented, so a book exported from the
 * terminal and a book downloaded from the app are the same document.
 *
 * The one honest limitation, stated in the output rather than hidden: images
 * that are not already PNG/JPEG data URLs are dropped from the PDF, because
 * `rasterizeToPngDataUrl` needs a canvas and returns '' without one.
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { load, MOD } from '../runtime.mjs'
import { readWorkspace, resolveProject, scopeTo, WorkspaceError } from '../workspace.mjs'
import { c, heading, table, bytes, tick, gap } from '../ui.mjs'

const ALL_ARTEFACTS = ['pdf', 'md', 'brief', 'html', 'json', 'css', 'tokens', 'mark', 'zip']

export const help = `
${c.bold('cc export')} — write the brand pack to disk

  cc export [workspace] [options]

  workspace          a backup .json, a demo name (harbor, soft-signal),
                     or omitted to find the newest backup here

Options
  --project <x>      project by name, id, or position (#2). Default: current
  --all-projects     export every project in the file
  --out <dir>        output directory (default: ./cc-export)
  --only <list>      comma-separated: ${ALL_ARTEFACTS.join(', ')}
  --no-zip           skip the zip (it is included by default)
  --quiet            paths only

Artefacts
  brand-book.pdf     the vector brand book
  brand.md           the written pack
  brief.md           the brief on its own
  brand.html         the pack as a standalone page
  tokens.css         CSS custom properties
  tokens.json        design tokens
  pack.json          the full snapshot the exporters read
  logo.<ext>         the mark, when one was uploaded
  <slug>-brand-kit.zip
`

export async function run(argv) {
  const opts = parseArgs(argv)
  if (opts.help) {
    console.log(help)
    return 0
  }

  const { workspace, path, label } = readWorkspace(opts.workspace)

  const [exportFiles, brandSystem, studioIdentity, markSourceMod] =
    await Promise.all([
      load(MOD.exportFiles),
      load(MOD.brandSystem),
      load(MOD.studioIdentity),
      load(MOD.markSource),
    ])
  const { markSource, markGapSentence } = markSourceMod

  /* One studio per workspace, so this is resolved once rather than per
     project. `resolveStudioName` is the app's own, which means the fallback to
     the invoice identity behaves identically here — a designer who typed their
     name into Invoice and nowhere else still gets credited on a CLI export. */
  const studio = studioIdentity.resolveStudioName(workspace.prefs || {})

  const targets = opts.allProjects
    ? workspace.projects
    : [resolveProject(workspace, opts.project)]

  if (!opts.quiet) {
    console.log(c.grey(`Reading ${shortPath(path)} · ${label}`))
  }

  const outRoot = resolve(process.cwd(), opts.out)
  let failures = 0

  for (const project of targets) {
    const { tasks, moodItems } = scopeTo(workspace, project)
    /* `studioName` is why a CLI export used to carry no credit at all: this
       call omitted it, so every terminal-made book printed the project and
       date and there was no flag that could add a name. Read from the same
       workspace prefs the app writes, through the same resolver, so the
       invoice-identity fallback applies here too. */
    const pack = exportFiles.buildBrandPackSnapshot({
      project,
      tasks,
      moodItems,
      studioName: studio,
    })
    const slug = exportFiles.slugifyFilename(pack.projectName, 'brand-pack')
    const dir = targets.length > 1 ? join(outRoot, slug) : outRoot
    mkdirSync(dir, { recursive: true })

    if (!opts.quiet) console.log(heading(pack.projectName))

    const written = []
    const notes = []
    const want = (id) => opts.only.includes(id)

    const put = (name, data) => {
      const file = join(dir, name)
      writeFileSync(file, data)
      written.push({ name, size: statSync(file).size })
    }

    if (want('md')) put('brand.md', exportFiles.brandPackToMarkdown(pack))
    if (want('brief')) put('brief.md', exportFiles.packBriefMarkdown(pack))
    if (want('html')) put('brand.html', exportFiles.brandPackToHtml(pack))
    if (want('css')) put('tokens.css', brandSystem.buildCssTokens(pack))
    if (want('tokens')) {
      put('tokens.json', JSON.stringify(brandSystem.buildJsonTokens(pack), null, 2))
    }
    if (want('json')) put('pack.json', JSON.stringify(slimPack(pack), null, 2))

    if (want('mark')) {
      const { files, hasMark } = exportFiles.markPackFiles(pack)
      for (const f of files) {
        put(f.name, f.base64 ? Buffer.from(f.content, 'base64') : f.content)
      }
      if (!hasMark) {
        /* "No mark uploaded" is a claim, and it was made without checking. A
           mark stored as a link (cloud sync offloads images to Storage URLs)
           is a mark that exists — saying it was never uploaded sends the
           designer to look at artwork that is already there. */
        const mark = markSource(pack.logoImage)
        notes.push(
          mark.state === 'fetch'
            ? 'Mark is in cloud storage — the client package collects it; this quick pack does not.'
            : mark.state === 'held'
              ? `Mark not written — ${mark.reason}. README explains.`
              : 'No mark uploaded — logo file skipped, README explains.'
        )
      }
    }

    let pdfBuffer = null
    if (want('pdf') || want('zip')) {
      const result = await exportFiles.downloadBrandPackVectorPdf(pack, null, {
        returnBlobOnly: true,
        book: project.bookBuilder || undefined,
      })
      if (result?.blob) {
        pdfBuffer = Buffer.from(await result.blob.arrayBuffer())
        if (want('pdf')) put('brand-book.pdf', pdfBuffer)
        if (result.pages) notes.push(`Brand book: ${result.pages} pages.`)
      } else {
        failures += 1
        console.error(
          c.red(`  Brand book failed — ${result?.error || 'no PDF was produced'}`)
        )
      }
      const dropped = countUnrasterisable(pack)
      if (dropped > 0) {
        notes.push(
          `${dropped} image${dropped === 1 ? '' : 's'} left out of the PDF — ` +
            'only PNG/JPEG data URLs survive a headless export.'
        )
      }
    }

    if (want('zip')) {
      const zipName = `${slug}-brand-kit.zip`
      const buf = await buildKitZip({
        pack,
        slug,
        pdfBuffer,
        exportFiles,
        brandSystem,
        markSource,
        markGapSentence,
      })
      put(zipName, buf)
    }

    if (opts.quiet) {
      written.forEach((w) => console.log(join(dir, w.name)))
    } else {
      console.log(
        table(
          ['', 'file', 'size'],
          written.map((w) => [tick(), w.name, c.grey(bytes(w.size))])
        )
      )
      for (const n of notes) console.log(`${gap()} ${c.grey(n)}`)
      console.log(c.grey(`→ ${shortPath(dir)}`))
    }
  }

  return failures ? 1 : 0
}

/**
 * A path the reader can act on: relative when that is shorter and still points
 * somewhere sensible, absolute when the relative form would be a chain of `..`.
 */
function shortPath(p) {
  const rel = relative(process.cwd(), p)
  return !rel || rel.startsWith('..') ? p : rel
}

/**
 * The zip, assembled in Node.
 *
 * Same contents as `downloadBrandKitZip`, which cannot be reused directly: its
 * last two steps are `generateAsync({type:'blob'})` and an anchor click. The
 * PDF is passed in rather than regenerated so the copy in the zip and the copy
 * beside it are byte-identical — the app takes the same care for the same
 * reason.
 */
async function buildKitZip({
  pack,
  slug,
  pdfBuffer,
  exportFiles,
  brandSystem,
  markSource,
  markGapSentence,
}) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const folder = zip.folder(slug) || zip

  folder.file('brand.md', exportFiles.brandPackToMarkdown(pack))
  folder.file('tokens.css', brandSystem.buildCssTokens(pack))
  folder.file('tokens.json', JSON.stringify(brandSystem.buildJsonTokens(pack), null, 2))
  folder.file('pack.json', JSON.stringify(slimPack(pack), null, 2))

  /* One decision about the mark, shared with the app — see
     src/lib/deliver/markSource.js. This was a private regex whose only failure
     mode was writing nothing and saying nothing. */
  const mark = markSource(pack.logoImage)
  if (mark.state === 'ready') {
    folder.file(`logo.${mark.ext}`, mark.base64, { base64: true })
  } else if (mark.state === 'held') {
    folder.file(
      'logo-NOT-INCLUDED.txt',
      `The mark is on the project but is not in this kit.\n\n${markGapSentence(mark.reason)}.\n`
    )
  }

  if (pdfBuffer) folder.file('brand-book.pdf', pdfBuffer)

  return zip.generateAsync({ type: 'nodebuffer' })
}

/** pack.json without the pin binaries, matching what the app's zip writes. */
function slimPack(pack) {
  return {
    ...pack,
    pins: (pack.pins || []).map((p) => ({
      id: p.id,
      note: p.note,
      type: p.type,
      packHero: p.packHero,
      visual:
        String(p.visual || '').startsWith('data:') && String(p.visual).length > 8000
          ? '[embedded in brand-book.pdf / mood pins]'
          : p.visual,
    })),
  }
}

/** Images the headless PDF path will silently skip, so it can be said out loud. */
function countUnrasterisable(pack) {
  const candidates = [pack.logoImage, ...(pack.pins || []).map((p) => p.visual)]
  return candidates.filter((src) => {
    const s = String(src || '')
    if (!s) return false
    if (!s.startsWith('data:')) return /^https?:|^blob:/.test(s)
    return !/^data:image\/(png|jpe?g);base64,/i.test(s)
  }).length
}

function parseArgs(argv) {
  const opts = {
    workspace: null,
    project: null,
    allProjects: false,
    out: 'cc-export',
    only: [...ALL_ARTEFACTS],
    quiet: false,
    help: false,
  }
  let zipOff = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--project' || a === '-p') opts.project = argv[++i]
    else if (a === '--all-projects') opts.allProjects = true
    else if (a === '--out' || a === '-o') opts.out = argv[++i]
    else if (a === '--only') {
      const list = String(argv[++i] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const unknown = list.filter((x) => !ALL_ARTEFACTS.includes(x))
      if (unknown.length) {
        throw new WorkspaceError(
          `Unknown artefact${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}\n` +
            `Choose from: ${ALL_ARTEFACTS.join(', ')}`
        )
      }
      opts.only = list
    } else if (a === '--no-zip') zipOff = true
    else if (a === '--no-watermark') {
      /* Accepted only to say it is gone. Silently ignoring a flag someone has
         in a script is worse than the no-op it replaced: the PDF changes and
         nothing explains why. There is no watermark to drop any more — the
         footer carries the studio's own name, or nothing. */
      throw new WorkspaceError(
        [
          '--no-watermark no longer exists.',
          '',
          'There is no Creative Companion watermark to remove. The footer now',
          "carries your studio's name, taken from the workspace file (Settings",
          '→ Your studio). With no name set it prints the project and date.',
        ].join('\n')
      )
    }
    else if (a === '--quiet' || a === '-q') opts.quiet = true
    else if (a.startsWith('-')) throw new WorkspaceError(`Unknown option: ${a}`)
    else if (!opts.workspace) opts.workspace = a
    else throw new WorkspaceError(`Unexpected argument: ${a}`)
  }
  if (zipOff) opts.only = opts.only.filter((x) => x !== 'zip')
  return opts
}
