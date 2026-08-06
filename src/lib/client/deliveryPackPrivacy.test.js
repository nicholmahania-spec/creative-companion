import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { PRIVATE_PACK_FIELDS } from './brandDelivery'

/**
 * Stripping a field out of the delivered pack must not change a single page of
 * the book.
 *
 * `buildDeliveryPack` removes the designer's private working data — their
 * to-do list, the feedback log, the revision count, the scope they argued
 * about — before the pack is written to a row a client can read. That is only
 * safe while the book renderer genuinely does not read those fields. If a
 * future page starts printing one, the designer would preview a book with it
 * and the client would receive a book without, silently.
 *
 * So this asserts the premise instead of trusting it: nothing under
 * `src/lib/book/` may read any stripped field off a pack. When this fails, the
 * question is which of the two is wrong — the new page, or the strip list —
 * and that is a decision worth being stopped for.
 */

const here = dirname(fileURLToPath(import.meta.url))
const BOOK = resolve(here, '../book')
const CODE = /\.(js|jsx)$/
const TEST = /\.test\.(js|jsx)$/

function bookSources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) bookSources(full, out)
    else if (CODE.test(name) && !TEST.test(name)) out.push(full)
  }
  return out
}

/* The file that BUILDS the pack obviously names every field in it — that is
   its job, and it is upstream of the strip. Only the renderers matter here. */
const BUILDER = resolve(BOOK, 'exportFiles.js')

describe('the delivered pack drops nothing the book prints', () => {
  const files = bookSources(BOOK).filter((f) => f !== BUILDER)

  for (const field of PRIVATE_PACK_FIELDS) {
    it(`no book page reads pack.${field}`, () => {
      const readers = files.filter((f) => {
        const src = readFileSync(f, 'utf8')
        return new RegExp(`pack\\??\\.${field}\\b`).test(src)
      })
      expect(
        readers.map((f) => f.replace(`${BOOK}/`, '')),
        `${field} is stripped from the client's copy but read by the book — the client would receive a different book to the one previewed`
      ).toEqual([])
    })
  }
})
