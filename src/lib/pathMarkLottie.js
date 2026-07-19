/**
 * Compact Lottie (bodymovin) for the path mark — three rising steps.
 * Drawn as stroked shape layers; small payload, no external assets.
 */
export const pathMarkLottie = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 45,
  w: 64,
  h: 64,
  nm: 'path-mark',
  ddd: 0,
  assets: [],
  layers: [
    // Rounded rect frame
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'frame',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'rc',
              d: 1,
              s: { a: 0, k: [50, 50] },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 12 },
              nm: 'Rect',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 3.5 },
              lc: 2,
              lj: 2,
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
          nm: 'Frame',
        },
      ],
      ip: 0,
      op: 45,
      st: 0,
      bm: 0,
    },
    // Step lines fade in staggered
    lineLayer(2, 'step1', 0, [18, 42], [31, 42], 0),
    lineLayer(3, 'step2', 6, [18, 32], [38, 32], 6),
    lineLayer(4, 'step3', 12, [18, 22], [46, 22], 12),
  ],
}

function lineLayer(ind, name, st, from, to, delay) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: delay, s: [0], e: [100], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: delay + 12, s: [100] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [0, 0, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          {
            ty: 'sh',
            ks: {
              a: 0,
              k: {
                i: [
                  [0, 0],
                  [0, 0],
                ],
                o: [
                  [0, 0],
                  [0, 0],
                ],
                v: [from, to],
                c: false,
              },
            },
            nm: 'Path',
          },
          {
            ty: 'st',
            c: { a: 0, k: [0.11, 0.1, 0.09, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3.5 },
            lc: 2,
            lj: 2,
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
        nm: name,
      },
    ],
    ip: st,
    op: 45,
    st,
    bm: 0,
  }
}
