/**
 * Photoreal full-body Helper Lottie reels.
 * Uses public/buddy/helper-body.png as an image layer with mood motion.
 * Consumers pass assetsPath: `${BASE_URL}buddy/` to lottie-web.
 */

export const HELPER_BODY_ASSET = {
  id: 'helper_body',
  w: 560,
  h: 662,
  u: '',
  p: 'helper-body.png',
  e: 0,
}

/** Composition sized to character aspect (half-res for crisp SVG scale-down). */
const COMP_W = 280
const COMP_H = 331
const FR = 30
const OP = 90 // 3s loop @ 30fps

function easeInOut() {
  return { x: 0.42, y: 1 }
}
function easeOut() {
  return { x: 0.42, y: 0 }
}

/** Image layer: asset centered in composition at 50% scale. */
function bodyLayer(ks) {
  return {
    ddd: 0,
    ind: 1,
    ty: 2,
    nm: 'HelperBody',
    refId: HELPER_BODY_ASSET.id,
    sr: 1,
    ks: {
      o: ks.o || { a: 0, k: 100 },
      r: ks.r || { a: 0, k: 0 },
      p: ks.p || { a: 0, k: [COMP_W / 2, COMP_H / 2 + 6, 0] },
      a: { a: 0, k: [HELPER_BODY_ASSET.w / 2, HELPER_BODY_ASSET.h / 2, 0] },
      s: ks.s || { a: 0, k: [50, 50, 100] },
    },
    ao: 0,
    ip: 0,
    op: OP,
    st: 0,
    bm: 0,
  }
}

function loopPos(y0, y1, mid = OP / 2) {
  return {
    a: 1,
    k: [
      {
        t: 0,
        s: [COMP_W / 2, y0, 0],
        e: [COMP_W / 2, y1, 0],
        i: easeInOut(),
        o: easeOut(),
      },
      {
        t: mid,
        s: [COMP_W / 2, y1, 0],
        e: [COMP_W / 2, y0, 0],
        i: easeInOut(),
        o: easeOut(),
      },
      { t: OP, s: [COMP_W / 2, y0, 0] },
    ],
  }
}

function loopScale(s0, s1, mid = OP / 2) {
  return {
    a: 1,
    k: [
      {
        t: 0,
        s: [s0, s0, 100],
        e: [s1, s1, 100],
        i: easeInOut(),
        o: easeOut(),
      },
      {
        t: mid,
        s: [s1, s1, 100],
        e: [s0, s0, 100],
        i: easeInOut(),
        o: easeOut(),
      },
      { t: OP, s: [s0, s0, 100] },
    ],
  }
}

function loopRot(r0, r1, mid = OP / 2) {
  return {
    a: 1,
    k: [
      {
        t: 0,
        s: [r0],
        e: [r1],
        i: easeInOut(),
        o: easeOut(),
      },
      {
        t: mid,
        s: [r1],
        e: [r0],
        i: easeInOut(),
        o: easeOut(),
      },
      { t: OP, s: [r0] },
    ],
  }
}

function reel(name, ks) {
  return {
    v: '5.7.4',
    fr: FR,
    ip: 0,
    op: OP,
    w: COMP_W,
    h: COMP_H,
    nm: name,
    ddd: 0,
    assets: [HELPER_BODY_ASSET],
    layers: [bodyLayer(ks)],
  }
}

/** Mood → full-body photoreal Lottie animationData */
export const HELPER_BODY_REELS = {
  /** Soft float + breathe */
  idle: reel('helper-body-idle', {
    p: loopPos(COMP_H / 2 + 8, COMP_H / 2 - 4),
    s: loopScale(49.5, 51.2),
    r: loopRot(-1.2, 1.2),
  }),
  /** Cheer bounce */
  happy: reel('helper-body-happy', {
    p: {
      a: 1,
      k: [
        {
          t: 0,
          s: [COMP_W / 2, COMP_H / 2 + 10, 0],
          e: [COMP_W / 2, COMP_H / 2 - 14, 0],
          i: { x: 0.33, y: 1 },
          o: { x: 0.33, y: 0 },
        },
        {
          t: 22,
          s: [COMP_W / 2, COMP_H / 2 - 14, 0],
          e: [COMP_W / 2, COMP_H / 2 + 6, 0],
          i: { x: 0.5, y: 1 },
          o: { x: 0.5, y: 0 },
        },
        {
          t: 44,
          s: [COMP_W / 2, COMP_H / 2 + 6, 0],
          e: [COMP_W / 2, COMP_H / 2 + 10, 0],
          i: easeInOut(),
          o: easeOut(),
        },
        { t: OP, s: [COMP_W / 2, COMP_H / 2 + 10, 0] },
      ],
    },
    s: loopScale(50, 53.5, 28),
    r: loopRot(-3.5, 3.5, 30),
  }),
  /** Thoughtful sway + lean */
  think: reel('helper-body-think', {
    p: loopPos(COMP_H / 2 + 4, COMP_H / 2 - 2, 50),
    s: loopScale(49.8, 50.6, 50),
    r: loopRot(-5.5, 4, 48),
  }),
  /** Settled, slow breath */
  rest: reel('helper-body-rest', {
    p: loopPos(COMP_H / 2 + 12, COMP_H / 2 + 6, 55),
    s: loopScale(48.5, 49.5, 55),
    r: { a: 0, k: -2 },
  }),
}

/**
 * Resolve mood string → body reel.
 * Aliases map product moods (win, coach, break…) onto the four reels.
 */
export function reelForMood(mood = 'idle') {
  const m = String(mood || 'idle').toLowerCase()
  if (
    m === 'happy' ||
    m === 'win' ||
    m === 'celebrate' ||
    m === 'cheer' ||
    m === 'levelup'
  ) {
    return HELPER_BODY_REELS.happy
  }
  if (
    m === 'think' ||
    m === 'focus' ||
    m === 'coach' ||
    m === 'nudge' ||
    m === 'hyper'
  ) {
    return HELPER_BODY_REELS.think
  }
  if (m === 'rest' || m === 'break' || m === 'tired' || m === 'calm') {
    return HELPER_BODY_REELS.rest
  }
  return HELPER_BODY_REELS.idle
}

/** Public path segment under BASE_URL for lottie assetsPath */
export const HELPER_BODY_ASSETS_PATH = 'buddy/'
