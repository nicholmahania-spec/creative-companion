/**
 * `cc` — Creative Companion from the terminal.
 *
 * The app is the place the work happens. This is for the parts that are better
 * as a command: re-exporting a pack after a tweak, gating a handoff in CI,
 * checking a palette without opening a browser.
 *
 * Commands are loaded on demand so `cc --help` does not start Vite.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { closeRuntime, PROJECT_ROOT } from './runtime.mjs'
import { c } from './ui.mjs'

const COMMANDS = {
  ls: { load: () => import('./commands/ls.mjs'), blurb: 'list the projects in a workspace' },
  info: { load: () => import('./commands/info.mjs'), blurb: 'one project in full' },
  check: { load: () => import('./commands/check.mjs'), blurb: 'what the pack is still missing' },
  contrast: { load: () => import('./commands/contrast.mjs'), blurb: 'WCAG reading of a palette' },
  export: { load: () => import('./commands/export.mjs'), blurb: 'write the brand pack to disk' },
}

const ALIASES = { list: 'ls', show: 'info', doctor: 'check', colours: 'contrast', colors: 'contrast' }

function version() {
  try {
    return JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'package.json'), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

function usage() {
  const width = Math.max(...Object.keys(COMMANDS).map((k) => k.length))
  return `
${c.bold('cc')} — Creative Companion ${c.grey(`v${version()}`)}

  ${c.grey('Usage:')} cc <command> [workspace] [options]

${Object.entries(COMMANDS)
  .map(([name, meta]) => `  ${c.cyan(name.padEnd(width))}  ${meta.blurb}`)
  .join('\n')}

  A ${c.bold('workspace')} is the JSON that Settings → Backup downloads. Pass a path,
  a demo name (${c.grey('harbor')}, ${c.grey('soft-signal')}), or nothing at all — with no argument
  cc uses the newest creative-companion-backup-*.json in this directory.

${c.grey('Examples')}
  cc ls harbor
  cc check harbor --project "Harbor & Hearth"
  cc contrast '#1C1917' '#0F766E' '#FAFAF9' --matrix
  cc export ~/Downloads/creative-companion-backup-2026-08-06.json --out ./delivery

  cc <command> --help  for the options of one command
`
}

export async function main(argv) {
  const [first, ...rest] = argv

  if (!first || first === '--help' || first === '-h' || first === 'help') {
    /* `cc help export` should reach the command's own help rather than print
       the index again — asking for help twice and getting the same page is a
       small thing that makes a tool feel like it is not listening. */
    const topic = first === 'help' ? rest[0] : null
    if (topic && (COMMANDS[topic] || ALIASES[topic])) {
      const mod = await COMMANDS[ALIASES[topic] || topic].load()
      console.log(mod.help)
      return 0
    }
    console.log(usage())
    return first ? 0 : 1
  }

  if (first === '--version' || first === '-v') {
    console.log(version())
    return 0
  }

  const name = ALIASES[first] || first
  const command = COMMANDS[name]
  if (!command) {
    console.error(c.red(`Unknown command: ${first}`))
    const near = Object.keys(COMMANDS).filter((k) => k.startsWith(first[0]))
    if (near.length) console.error(c.grey(`Did you mean: ${near.join(', ')}?`))
    console.error(c.grey('cc --help for the full list.'))
    return 1
  }

  const mod = await command.load()
  return mod.run(rest)
}

export async function cli(argv) {
  let code = 0
  try {
    code = await main(argv)
  } catch (err) {
    /* A workspace problem is the user's file, not a crash — say what is wrong
       and stop. Anything else keeps its stack, because a swallowed stack in a
       tool that generates client deliverables is worse than a noisy one. */
    if (err?.userFacing) {
      console.error(`\n${c.red(err.message)}\n`)
    } else {
      console.error(`\n${c.red('cc failed:')} ${err?.message || err}`)
      if (process.env.CC_DEBUG) console.error(err)
      else console.error(c.grey('CC_DEBUG=1 for the stack.'))
    }
    code = 1
  } finally {
    await closeRuntime()
  }
  return code
}
