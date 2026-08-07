#!/usr/bin/env node
/**
 * `cc` — the Creative Companion command line.
 *
 * Thin on purpose: everything lives in scripts/cli/ so the entry point stays a
 * shebang and an exit code.
 */
import { cli } from '../scripts/cli/index.mjs'

process.exitCode = await cli(process.argv.slice(2))
