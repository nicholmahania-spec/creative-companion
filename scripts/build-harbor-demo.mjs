/**
 * Rebuild Harbor & Hearth demo assets as real PNGs (jsPDF cannot embed SVG)
 * and regenerate the sample brand book into Downloads.
 */
import zlib from 'node:zlib'
import { writeFileSync, readFileSync } from 'node:fs'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from '../src/lib/exportFiles.js'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function pngRGBA(w, h, paint) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 255] = paint(x, y, w, h)
      const i = y * (w * 4 + 1) + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const idat = zlib.deflateSync(raw, { level: 9 })
  return (
    'data:image/png;base64,' +
    Buffer.concat([
      sig,
      chunk('IHDR', ihdr),
      chunk('IDAT', idat),
      chunk('IEND', Buffer.alloc(0)),
    ]).toString('base64')
  )
}
function hex(h) {
  const s = h.replace('#', '')
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ]
}
function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}

const cream = hex('#E8DCC8')
const gold = hex('#C4A574')
const green = hex('#1B3A2F')
const linen = hex('#F7F3EC')

// Transparent mark: cream ring + gold arc (reads on cream, green, gold fields)
const logo = pngRGBA(256, 256, (x, y) => {
  const cx = 128
  const cy = 120
  const dx = x - cx
  const dy = y - cy
  const dist = Math.hypot(dx, dy)
  if (Math.abs(dist - 52) < 6.5) return [...cream, 255]
  const arcCy = cy + 28
  const ad = Math.hypot(x - cx, (y - arcCy) * 1.15)
  if (y > cy + 8 && Math.abs(ad - 58) < 5.5 && Math.abs(x - cx) < 58) {
    return [...gold, 255]
  }
  return [0, 0, 0, 0]
})

function pinPhoto(bgA, bgB, accent) {
  return pngRGBA(640, 480, (x, y, w, h) => {
    const t = (x / w) * 0.55 + (y / h) * 0.45
    const base = mix(bgA, bgB, t)
    const vx = (x / w - 0.5) * 2
    const vy = (y / h - 0.5) * 2
    const vig = Math.min(1, Math.hypot(vx, vy) * 0.35)
    const c = mix(base, [20, 20, 18], vig * 0.4)
    const lx = w * 0.32
    const ly = h * 0.28
    const ld = Math.hypot(x - lx, y - ly) / (w * 0.45)
    const light = Math.max(0, 1 - ld)
    const lit = mix(c, [255, 250, 240], light * 0.22)
    if (y > h * 0.62 && y < h * 0.64) return [...mix(lit, accent, 0.35), 255]
    if (y > h * 0.78 && y < h * 0.8) return [...mix(lit, accent, 0.2), 255]
    if (x < 10 || y < 10 || x > w - 11 || y > h - 11) {
      return [...mix(lit, [0, 0, 0], 0.25), 255]
    }
    return [...lit, 255]
  })
}

const pinDefs = [
  {
    id: 9201,
    note: 'Morning counter — window light on cups',
    visual: pinPhoto(green, hex('#3D5C4E'), gold),
    packHero: true,
    packOrder: 0,
  },
  {
    id: 9202,
    note: 'Shelf rhythm — cream labels, calm gaps',
    visual: pinPhoto(cream, linen, gold),
    packHero: false,
    packOrder: 1,
  },
  {
    id: 9203,
    note: 'Ceramic + linen texture study',
    visual: pinPhoto(gold, hex('#8B7355'), cream),
    packHero: false,
    packOrder: 2,
  },
  {
    id: 9204,
    note: 'Quiet exterior — timber door, no neon',
    visual: pinPhoto(hex('#2C4A3E'), green, cream),
    packHero: false,
    packOrder: 3,
  },
  {
    id: 9205,
    note: 'Cover green field',
    visual: '#1B3A2F',
    type: 'color',
    packHero: false,
    packOrder: 4,
  },
  {
    id: 9206,
    note: 'Accent gold for CTAs only',
    visual: '#C4A574',
    type: 'color',
    packHero: false,
    packOrder: 5,
  },
]

const ws = JSON.parse(
  readFileSync(
    new URL('../public/demos/harbor-hearth-workspace.json', import.meta.url),
    'utf8'
  )
)
ws.projects[0].logoImage = logo
ws.moodItems = pinDefs.map((p) => ({
  id: p.id,
  projectId: 9101,
  type: p.type || 'image',
  note: p.note,
  visual: p.visual,
  inPack: true,
  packHero: !!p.packHero,
  packOrder: p.packOrder,
}))
const outPath = new URL(
  '../public/demos/harbor-hearth-workspace.json',
  import.meta.url
)
writeFileSync(outPath, JSON.stringify(ws, null, 2))
console.log('wrote workspace', outPath.pathname)

const project = ws.projects[0]
const pack = buildBrandPackSnapshot({
  project,
  tasks: ws.tasks,
  moodItems: ws.moodItems,
})
const r = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
if (!r.ok) {
  console.error(r)
  process.exit(1)
}
const buf = Buffer.from(await r.blob.arrayBuffer())
const dest = '/Users/macadmin/Downloads/harbor-hearth-brand-book.pdf'
writeFileSync(dest, buf)
console.log('pages', r.pages, 'bytes', buf.length, '→', dest)
