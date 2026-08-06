import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { CLOUD_REQUIRED } from './cloudRequired.js'
import { clientFacingError } from './clientFacingError.js'

describe('the cloud-required message', () => {
  it('never names a control that does not exist', () => {
    /* The old text said "Sign in (or set up sync in Settings)". A desk built
       without cloud credentials has NO sign-in anywhere — Settings included —
       so a cold-start tester followed the instruction, found nothing, and
       concluded the product was broken. Naming a remedy that is not there
       costs the designer the hunt and then their trust in every other
       instruction the app gives. */
    expect(CLOUD_REQUIRED).not.toMatch(/sign in/i)
    expect(CLOUD_REQUIRED).not.toMatch(/settings/i)
  })

  it('offers something the designer can actually do instead', () => {
    expect(CLOUD_REQUIRED).toMatch(/export|send it yourself/i)
  })

  it('is still translated away from clients', () => {
    /* It is studio plumbing. It must not reach the stranger opening a link
       on their phone as a favour — the mapping is keyed on this exact
       string, which is why the constant exists. */
    expect(clientFacingError(CLOUD_REQUIRED)).not.toBe(CLOUD_REQUIRED)
    expect(clientFacingError(CLOUD_REQUIRED)).toMatch(/isn’t working right now/i)
  })

  it('is declared once, never re-typed', () => {
    /* Eight hand-written copies plus a Map keyed on a ninth is exactly the
       drift this codebase keeps paying for: change one and the translation
       silently stops matching, and studio plumbing starts reaching a
       client. */
    const dir = join(process.cwd(), 'src/lib/client')
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
      .filter((f) => f !== 'cloudRequired.js')
      .filter((f) =>
        readFileSync(join(dir, f), 'utf8').includes(
          'Client links need an account'
        )
      )
    expect(offenders, 'these re-type the message instead of importing it').toEqual([])
  })
})
