/**
 * Starter brand kits — quick direction seeds for new projects.
 * Stone-first palettes; apply on Project without inventing fake clients.
 */

export const BRAND_KITS = [
  {
    id: 'stone-calm',
    name: 'Stone calm',
    blurb: 'Quiet editorial · ink + growth',
    palette: ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9'],
    tagline: '',
    voice: 'Warm, plain, unhurried. Short sentences. No hype.',
    typeHeading: 'Plus Jakarta Sans Bold',
    typeBody: 'Plus Jakarta Sans Regular',
    doUse: 'Generous space · one strong accent · readable type',
    dontUse: 'Neon gradients · twin primaries · jargon walls',
  },
  {
    id: 'paper-warm',
    name: 'Paper warm',
    blurb: 'Craft desk · cream + charcoal',
    palette: ['#292524', '#B45309', '#D6D3D1', '#FAF7F2'],
    tagline: '',
    voice: 'Friendly expert. Concrete nouns. One idea per line.',
    typeHeading: 'Fraunces',
    typeBody: 'Source Sans 3',
    doUse: 'Paper textures · soft shadow · honest photos',
    dontUse: 'Glassmorphism · stock purple · tiny captions',
  },
  {
    id: 'signal-bold',
    name: 'Signal bold',
    blurb: 'Product-forward · high contrast',
    palette: ['#0C0A09', '#0F766E', '#FAFAF9', '#E7E5E4'],
    tagline: '',
    voice: 'Direct. Outcome first. Never cute for its own sake.',
    typeHeading: 'Space Grotesk',
    typeBody: 'Plus Jakarta Sans Regular',
    doUse: 'Clear hierarchy · one CTA · sharp icons',
    dontUse: 'Decorative lines · competing accents · vague CTAs',
  },
  {
    id: 'soft-field',
    name: 'Soft field',
    blurb: 'Airy brand · sage field',
    palette: ['#1C1917', '#6F7F6C', '#E7E5E4', '#FFFcf7'],
    tagline: '',
    voice: 'Gentle and precise. Protect attention.',
    typeHeading: 'Libre Baskerville',
    typeBody: 'Lato',
    doUse: 'Soft fields · serif titles sparingly · real photography',
    dontUse: 'Hard sell · busy boards · stacked badges',
  },
]

export function getBrandKit(id) {
  return BRAND_KITS.find((k) => k.id === id) || null
}
