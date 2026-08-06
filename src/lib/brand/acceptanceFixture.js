/**
 * REAL ARTWORK, MEASURED — the Phase 6 acceptance run, frozen.
 *
 * Six real client files (five CMYK print PDFs and one 11-artboard Illustrator
 * logo) were rendered page by page through the production sampling path —
 * longest edge 160px, smoothing off — giving these 22 renderings. Phase 6 is
 * gated on the false-positive rate against real work, and that gate is
 * meaningless if it can only be checked once.
 *
 * WHAT IS STORED HERE IS COLOUR, NOT ARTWORK. Each entry is a list of hexes
 * and their coverage. No image, no filename, no client name — the pieces are
 * labelled by what they are. The source files lived only in an ephemeral
 * sandbox and are gone; these numbers are what survives, and they are enough
 * to re-run the whole acceptance test on every commit forever.
 *
 * Three renderings are readable: false. They are blank artboards, and the
 * checker calling them unreadable rather than clean is the correct answer.
 */
export const ACCEPTANCE_RENDERINGS = [
  {
    piece: "identity",
    kind: "brand sheet",
    page: 1,
    of: 1,
    readable: true,
    colours: [
      { hex: "#ff2e17", coverage: 0.5886 },
      { hex: "#45cbdb", coverage: 0.2366 },
      { hex: "#ffdad6", coverage: 0.0181 },
      { hex: "#ffc7c0", coverage: 0.0181 },
      { hex: "#ff4530", coverage: 0.0173 },
    ],
  },
  {
    piece: "cards",
    kind: "table cards",
    page: 1,
    of: 1,
    readable: true,
    colours: [
      { hex: "#292961", coverage: 0.3441 },
      { hex: "#b92234", coverage: 0.2321 },
      { hex: "#483376", coverage: 0.068 },
      { hex: "#673d8c", coverage: 0.0578 },
      { hex: "#a82847", coverage: 0.0476 },
    ],
  },
  {
    piece: "plan",
    kind: "printed plan",
    page: 1,
    of: 4,
    readable: true,
    colours: [
      { hex: "#d1deec", coverage: 0.0228 },
      { hex: "#018081", coverage: 0.0086 },
      { hex: "#b2cdbc", coverage: 0.0086 },
      { hex: "#322933", coverage: 0.0071 },
      { hex: "#433745", coverage: 0.0057 },
    ],
  },
  {
    piece: "plan",
    kind: "printed plan",
    page: 2,
    of: 4,
    readable: true,
    colours: [
      { hex: "#b2cdbc", coverage: 0.2414 },
      { hex: "#018081", coverage: 0.2069 },
      { hex: "#322933", coverage: 0.1724 },
      { hex: "#433745", coverage: 0.1379 },
      { hex: "#9f5b77", coverage: 0.0345 },
    ],
  },
  {
    piece: "plan",
    kind: "printed plan",
    page: 3,
    of: 4,
    readable: true,
    colours: [
      { hex: "#b2cdbc", coverage: 0.2414 },
      { hex: "#018081", coverage: 0.2069 },
      { hex: "#322933", coverage: 0.1724 },
      { hex: "#433745", coverage: 0.1379 },
      { hex: "#9f5b77", coverage: 0.0345 },
    ],
  },
  {
    piece: "plan",
    kind: "printed plan",
    page: 4,
    of: 4,
    readable: true,
    colours: [
      { hex: "#b2cdbc", coverage: 0.2414 },
      { hex: "#018081", coverage: 0.2069 },
      { hex: "#322933", coverage: 0.1724 },
      { hex: "#433745", coverage: 0.1379 },
      { hex: "#9f5b77", coverage: 0.0345 },
    ],
  },
  {
    piece: "anniv",
    kind: "celebration piece",
    page: 1,
    of: 4,
    readable: true,
    colours: [
      { hex: "#024aa8", coverage: 0.1472 },
      { hex: "#045bbe", coverage: 0.0996 },
      { hex: "#0656af", coverage: 0.0465 },
      { hex: "#024bbb", coverage: 0.0422 },
      { hex: "#7a7c8e", coverage: 0.0292 },
    ],
  },
  {
    piece: "anniv",
    kind: "celebration piece",
    page: 2,
    of: 4,
    readable: true,
    colours: [
      { hex: "#165ea8", coverage: 0.1813 },
      { hex: "#022d79", coverage: 0.1299 },
      { hex: "#011c66", coverage: 0.0755 },
      { hex: "#044892", coverage: 0.0665 },
      { hex: "#2e71ba", coverage: 0.0544 },
    ],
  },
  {
    piece: "anniv",
    kind: "celebration piece",
    page: 3,
    of: 4,
    readable: true,
    colours: [
      { hex: "#055bc1", coverage: 0.0774 },
      { hex: "#0661d5", coverage: 0.0573 },
      { hex: "#0248be", coverage: 0.0541 },
      { hex: "#166fda", coverage: 0.0424 },
      { hex: "#462b17", coverage: 0.0414 },
    ],
  },
  {
    piece: "anniv",
    kind: "celebration piece",
    page: 4,
    of: 4,
    readable: true,
    colours: [
      { hex: "#045cc1", coverage: 0.1501 },
      { hex: "#0463d4", coverage: 0.0892 },
      { hex: "#0758ad", coverage: 0.0779 },
      { hex: "#0248bd", coverage: 0.0576 },
      { hex: "#0248aa", coverage: 0.0508 },
    ],
  },
  {
    piece: "info",
    kind: "infographic",
    page: 1,
    of: 1,
    readable: true,
    colours: [
      { hex: "#24275c", coverage: 0.1598 },
      { hex: "#429592", coverage: 0.1485 },
      { hex: "#18255e", coverage: 0.1369 },
      { hex: "#4f3791", coverage: 0.132 },
      { hex: "#312d75", coverage: 0.0917 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 1,
    of: 11,
    readable: false,
    colours: [],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 2,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2e17", coverage: 0.6771 },
      { hex: "#ff6150", coverage: 0.3229 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 3,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2e17", coverage: 0.973 },
      { hex: "#ff5f4d", coverage: 0.0063 },
      { hex: "#ff4833", coverage: 0.0052 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 4,
    of: 11,
    readable: false,
    colours: [],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 5,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2e17", coverage: 0.4172 },
      { hex: "#45cbdb", coverage: 0.2546 },
      { hex: "#ffc5bf", coverage: 0.0429 },
      { hex: "#7ddbe6", coverage: 0.0353 },
      { hex: "#ff5e4c", coverage: 0.0337 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 6,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2f19", coverage: 0.4958 },
      { hex: "#46ccdc", coverage: 0.1979 },
      { hex: "#ffd5d0", coverage: 0.0354 },
      { hex: "#a6e7ee", coverage: 0.0354 },
      { hex: "#7bdae6", coverage: 0.0354 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 7,
    of: 11,
    readable: true,
    colours: [
      { hex: "#45cbdb", coverage: 0.6734 },
      { hex: "#ff2e17", coverage: 0.1275 },
      { hex: "#abe8ef", coverage: 0.0604 },
      { hex: "#7bdae5", coverage: 0.0291 },
      { hex: "#61d3e0", coverage: 0.0246 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 8,
    of: 11,
    readable: true,
    colours: [
      { hex: "#45cbdb", coverage: 0.9742 },
      { hex: "#7edbe6", coverage: 0.0139 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 9,
    of: 11,
    readable: false,
    colours: [],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 10,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2e17", coverage: 0.4686 },
      { hex: "#45cbdb", coverage: 0.3755 },
      { hex: "#60d3e1", coverage: 0.031 },
      { hex: "#75d9e5", coverage: 0.0167 },
      { hex: "#ff968a", coverage: 0.0151 },
    ],
  },
  {
    piece: "identity",
    kind: "logo artboards",
    page: 11,
    of: 11,
    readable: true,
    colours: [
      { hex: "#ff2e18", coverage: 0.592 },
      { hex: "#45cbdb", coverage: 0.2884 },
      { hex: "#ffc8c2", coverage: 0.0231 },
      { hex: "#ff4430", coverage: 0.0109 },
      { hex: "#93e1eb", coverage: 0.0109 },
    ],
  },
];
