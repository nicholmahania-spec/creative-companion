import { deflateSync } from 'node:zlib'

/**
 * A real PNG, built here rather than checked in as a fixture.
 *
 * The colour check reads PIXELS, so a test of it has to hand the browser an
 * actual image. Generating it means the expected colour is written in the
 * spec next to the assertion, instead of living in a binary nobody can read
 * in a diff — and it means a test can ask for any colour it needs without
 * someone opening an image editor.
 */

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/**
 * A mark on white paper: a solid block of `hex` covering the middle, the rest
 * white. That is the shape of a real logo export, and it exercises the
 * substrate filter — the white must be discarded as paper, leaving the block
 * as the only colour reported.
 *
 * `stripes` makes a different shape on purpose: fine alternating bands of the
 * two colours, in an image large enough that sampling must downscale it. That
 * is the only way to catch `imageSmoothingEnabled` being switched on — with
 * smoothing the bands average into a third colour present nowhere in the
 * artwork, which is the invented-colour failure `sampleImage.js` warns about
 * in its own header and which nothing else in the suite can see.
 *
 * @param {string} hex e.g. '#B91C1C'
 * @param {{ size?: number, coverage?: number, second?: string, stripes?: number }} [opts]
 * @returns {Buffer} PNG bytes
 */
export function markPng(hex, { size = 64, coverage = 0.5, second, stripes } = {}) {
  const [r, g, b] = rgb(hex)
  const [r2, g2, b2] = second ? rgb(second) : [r, g, b]
  const inkRows = Math.max(1, Math.round(size * coverage))
  const rows = []
  for (let y = 0; y < size; y++) {
    // Filter byte 0 (None) — no prediction, so the bytes below are the pixels.
    const row = Buffer.alloc(1 + size * 3)
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 3
      if (y < inkRows) {
        // Split the ink band between the two colours when a second is given —
        // in halves normally, in fine bands when `stripes` is set.
        const useSecond = second && (stripes
          ? Math.floor(x / stripes) % 2 === 1
          : x >= size / 2)
        row[i] = useSecond ? r2 : r
        row[i + 1] = useSecond ? g2 : g
        row[i + 2] = useSecond ? b2 : b
      } else {
        row[i] = 255
        row[i + 1] = 255
        row[i + 2] = 255
      }
    }
    rows.push(row)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type 2 = truecolour RGB
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
