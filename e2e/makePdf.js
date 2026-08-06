/**
 * A real PDF, built here rather than checked in as a fixture.
 *
 * Same rule as `makePng.js`, for the same reason: the application colour
 * check reads PIXELS off a rendered page, so a test of it has to hand the
 * browser actual PDF bytes. Generating them means the expected colour is
 * written in the spec beside the assertion instead of living in a binary
 * nobody can read in a diff, and a test can ask for any colour it needs.
 *
 * PDF is the format that matters here and nothing else in the suite produces
 * one from scratch — the brand-book specs render a PDF the app itself built,
 * which cannot stand in for "a file the designer exported from Illustrator".
 *
 * Deliberately minimal and uncompressed: no filters, no fonts, one content
 * stream per page of literal `re f` fills. Anything cleverer would be testing
 * the generator.
 */

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
]

const f = (n) => n.toFixed(6)

/**
 * One page per entry in `pages`: white stock with a band of `hex` across the
 * bottom `coverage` of the sheet. That is the shape of real printed work —
 * ink on paper, most of the sheet unprinted — and it exercises the substrate
 * filter, which must discard the white and leave the band as the reading.
 *
 * @param {Array<{hex: string, coverage?: number}>} pages
 * @param {{ width?: number, height?: number }} [opts]
 * @returns {Buffer} PDF bytes
 */
export function colourPdf(pages, { width = 288, height = 180 } = {}) {
  const list = pages.length ? pages : [{ hex: '#000000' }]
  const objects = []
  const push = (body) => {
    objects.push(body)
    return objects.length // 1-based object number
  }

  const catalogNum = 1
  const pagesNum = 2
  objects.push('') // reserve 1: catalog
  objects.push('') // reserve 2: pages

  const kids = []
  for (const { hex, coverage = 0.4 } of list) {
    const [r, g, b] = rgb(hex)
    const band = Math.max(1, Math.round(height * coverage))
    const stream = [
      '1 1 1 rg',
      `0 0 ${width} ${height} re f`,
      `${f(r)} ${f(g)} ${f(b)} rg`,
      `0 0 ${width} ${band} re f`,
      '',
    ].join('\n')
    const contentNum = push(
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
    )
    const pageNum = push(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${width} ${height}]` +
        ` /Resources << >> /Contents ${contentNum} 0 R >>`
    )
    kids.push(`${pageNum} 0 R`)
  }

  objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`
  objects[pagesNum - 1] =
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`

  let out = '%PDF-1.4\n'
  const offsets = []
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    out += `${String(off).padStart(10, '0')} 00000 n \n`
  }
  out +=
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\n` +
    `startxref\n${xref}\n%%EOF\n`

  // Latin-1: every byte written above is ASCII, so offsets equal byte counts.
  return Buffer.from(out, 'latin1')
}
