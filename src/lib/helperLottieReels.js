/**
 * Helper character Lottie reels — vector face moods (idle / happy / think / rest).
 * Compact bodymovin JSON; code-split via lottie-web consumer.
 */

function faceBase(ind, name, st, op, eyeY, mouth) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [50, 50, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      // head
      {
        ty: 'gr',
        it: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [72, 72] },
            nm: 'Head',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [0.96, 0.94, 0.9, 1] },
            o: { a: 0, k: 100 },
            nm: 'Fill',
          },
          {
            ty: 'st',
            c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3 },
            nm: 'Stroke',
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'Head',
      },
      // left eye
      {
        ty: 'gr',
        it: [
          {
            ty: 'el',
            p: { a: 0, k: [-14, eyeY] },
            s: { a: 0, k: [8, 10] },
            nm: 'L',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
            o: { a: 0, k: 100 },
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'EyeL',
      },
      // right eye
      {
        ty: 'gr',
        it: [
          {
            ty: 'el',
            p: { a: 0, k: [14, eyeY] },
            s: { a: 0, k: [8, 10] },
            nm: 'R',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
            o: { a: 0, k: 100 },
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'EyeR',
      },
      // mouth
      {
        ty: 'gr',
        it: [
          {
            ty: 'sh',
            ks: {
              a: 0,
              k: {
                i: mouth.i,
                o: mouth.o,
                v: mouth.v,
                c: false,
              },
            },
            nm: 'Mouth',
          },
          {
            ty: 'st',
            c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3 },
            lc: 2,
            lj: 2,
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'Mouth',
      },
    ],
    ip: st,
    op,
    st,
    bm: 0,
  }
}

const smile = {
  i: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  o: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  v: [
    [-16, 14],
    [0, 22],
    [16, 14],
  ],
}

const flat = {
  i: [
    [0, 0],
    [0, 0],
  ],
  o: [
    [0, 0],
    [0, 0],
  ],
  v: [
    [-14, 16],
    [14, 16],
  ],
}

const oMouth = {
  i: [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  o: [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  v: [
    [-8, 14],
    [0, 10],
    [8, 14],
    [0, 20],
  ],
}

function reel(name, eyeY, mouth, bounce = false) {
  const layers = [faceBase(1, 'face', 0, 60, eyeY, mouth)]
  if (bounce) {
    layers[0].ks.p = {
      a: 1,
      k: [
        {
          t: 0,
          s: [50, 52, 0],
          e: [50, 48, 0],
          i: { x: 0.4, y: 1 },
          o: { x: 0.4, y: 0 },
        },
        {
          t: 30,
          s: [50, 48, 0],
          e: [50, 52, 0],
          i: { x: 0.4, y: 1 },
          o: { x: 0.4, y: 0 },
        },
        { t: 60, s: [50, 52, 0] },
      ],
    }
  }
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  }
}

/** Mood → Lottie animationData */
export const HELPER_REELS = {
  idle: reel('idle', -8, flat, true),
  happy: reel('happy', -10, smile, true),
  think: reel('think', -6, oMouth, false),
  rest: reel('rest', -4, flat, false),
}

export function reelForMood(mood = 'idle') {
  const m = String(mood || 'idle')
  if (m === 'happy' || m === 'win' || m === 'celebrate') return HELPER_REELS.happy
  if (m === 'think' || m === 'focus' || m === 'coach') return HELPER_REELS.think
  if (m === 'rest' || m === 'break' || m === 'tired') return HELPER_REELS.rest
  return HELPER_REELS.idle
}
