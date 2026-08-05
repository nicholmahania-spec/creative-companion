/**
 * Colour difference the way the print industry measures it.
 *
 * RGB distance is not a measure of how different two colours LOOK — equal
 * steps in RGB are wildly unequal steps to the eye, badly so in blues, which
 * is where brand palettes spend much of their time. CIEDE2000 (ΔE00) is the
 * CIE's perceptual difference formula and the one ISO 12647-7 uses for print
 * verification, so it is also the number a printer would quote back at you.
 *
 * WHAT THE BANDS MEAN, and where they come from:
 *
 *   ΔE00 < 2    a match. Not "identical" — a match to the tolerance the print
 *               industry itself uses for brand spot colours (ISO 12647-7
 *               sits at ~2.5 for measured spot colours).
 *   2 – 5       close. Visibly related; a person looking for a difference
 *               will find one.
 *   > 5         different. NOTE: reported as a band, never as a number.
 *
 * That last line is a real constraint, not a stylistic one. Sharma, Wu & Dalal
 * (Color Research & Application 30(1), 2005) show CIEDE2000 is discontinuous,
 * and that the discontinuity — bounded near 0.27 for pairs within about 5
 * CIELAB units — grows sharply beyond that. The standard itself recommends
 * restricting the formula to SMALL colour differences. So inside 5 the number
 * is meaningful and we use it; past 5 the formula is out of its validated
 * range and quoting "ΔE00 = 41.2" would be false precision dressed as rigour.
 * Past 5 all we are entitled to say is: these are different colours.
 *
 * Verified against the reference pairs published with that paper — see
 * deltaE.test.js. Those pairs exist precisely because CIEDE2000 is easy to
 * implement subtly wrong (the hue-difference quadrant handling and the
 * 275° rotation term are the usual casualties) and an implementation that is
 * wrong only in blues would sail past any casual check.
 */

const rad = (deg) => (deg * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** sRGB (0–255) → linear-light RGB. The 0.04045 knee is part of the standard. */
function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

/** sRGB → CIEXYZ, D65 reference white (the white sRGB is defined against). */
export function rgbToXyz({ r, g, b }) {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  return {
    x: (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) * 100,
    y: (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) * 100,
    z: (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) * 100,
  }
}

/* D65, 2° observer — the white point sRGB is defined against. Using D50 here
   (the print default) would shift every result by more than the match band. */
const WHITE = { x: 95.047, y: 100.0, z: 108.883 }

export function xyzToLab({ x, y, z }) {
  const f = (t) =>
    t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29
  const fx = f(x / WHITE.x)
  const fy = f(y / WHITE.y)
  const fz = f(z / WHITE.z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

/** '#1B4C7E' → { r, g, b }, or null if it is not a hex colour. */
export function hexToRgb(hex) {
  const s = String(hex || '').trim().replace(/^#/, '')
  const full =
    s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function hexToLab(hex) {
  const rgb = hexToRgb(hex)
  return rgb ? xyzToLab(rgbToXyz(rgb)) : null
}

/**
 * CIEDE2000 between two CIELAB colours.
 *
 * Weighting factors kL/kC/kH are left at 1 (the "reference conditions" of the
 * standard). The textile industry commonly uses kL=2; we are not textiles.
 */
export function deltaE00(lab1, lab2, { kL = 1, kC = 1, kH = 1 } = {}) {
  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2

  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2

  // The G term expands low-chroma differences, which is why near-neutrals
  // separate properly instead of collapsing together.
  const C7 = Math.pow(Cbar, 7)
  const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + Math.pow(25, 7))))

  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)

  /* Hue angles. atan2(0, 0) is 0 in JS, but the standard defines the hue of a
     neutral as 0 anyway, and the hue-difference terms below are guarded on
     C1p*C2p — so a grey never contributes a spurious hue difference. */
  const h1p = C1p === 0 ? 0 : (deg(Math.atan2(b1, a1p)) + 360) % 360
  const h2p = C2p === 0 ? 0 : (deg(Math.atan2(b2, a2p)) + 360) % 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp
  if (C1p * C2p === 0) dhp = 0
  else {
    const diff = h2p - h1p
    if (Math.abs(diff) <= 180) dhp = diff
    else if (diff > 180) dhp = diff - 360
    else dhp = diff + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2)

  const Lbarp = (L1 + L2) / 2
  const Cbarp = (C1p + C2p) / 2

  let hbarp
  if (C1p * C2p === 0) hbarp = h1p + h2p
  else {
    const sum = h1p + h2p
    const absDiff = Math.abs(h1p - h2p)
    if (absDiff <= 180) hbarp = sum / 2
    else if (sum < 360) hbarp = (sum + 360) / 2
    else hbarp = (sum - 360) / 2
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63))

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2))
  const Cbarp7 = Math.pow(Cbarp, 7)
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)))
  const Rt = -Rc * Math.sin(2 * rad(dTheta))

  const Lm50sq = Math.pow(Lbarp - 50, 2)
  const Sl = 1 + (0.015 * Lm50sq) / Math.sqrt(20 + Lm50sq)
  const Sc = 1 + 0.045 * Cbarp
  const Sh = 1 + 0.015 * Cbarp * T

  return Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh))
  )
}

/** ΔE00 straight from two hex strings. Null if either is not a colour. */
export function deltaE00Hex(hexA, hexB) {
  const a = hexToLab(hexA)
  const b = hexToLab(hexB)
  return a && b ? deltaE00(a, b) : null
}

export const MATCH_MAX = 2
export const CLOSE_MAX = 5

/**
 * The band, and the words for it.
 *
 * Returns `value: null` past the close band on purpose — see the note at the
 * top. Callers must not print a ΔE00 they were not given, and having the
 * number simply absent is a stronger guarantee than a comment asking them not
 * to.
 */
export function compareToBrandColour(sampleHex, brandHex) {
  const value = deltaE00Hex(sampleHex, brandHex)
  if (value == null) return { band: 'unknown', value: null }
  if (value < MATCH_MAX) return { band: 'match', value }
  if (value <= CLOSE_MAX) return { band: 'close', value }
  return { band: 'different', value: null }
}

/** The nearest brand colour to a sample, by ΔE00. Null if nothing to compare. */
export function nearestBrandColour(sampleHex, brandHexes = []) {
  let best = null
  for (const brandHex of brandHexes) {
    const value = deltaE00Hex(sampleHex, brandHex)
    if (value == null) continue
    if (!best || value < best.value) best = { hex: brandHex, value }
  }
  if (!best) return null
  const { band } = compareToBrandColour(sampleHex, best.hex)
  return { hex: best.hex, band, value: band === 'different' ? null : best.value }
}
