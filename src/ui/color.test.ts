import { describe, expect, it } from 'vitest'
import { accentPalette, BACKGROUNDS, SOFT_AMOUNT, SURFACES } from '../app/theme'
import { accentVariants, contrastRatio, onColor, readableOn } from './color'

const surfaces = { light: '#ffffff', lightBg: '#f2f2f7', dark: '#1c1c1e', darkBg: '#000000' }

describe('contrasto dei colori principali (WCAG AA)', () => {
  it.each(accentPalette)('%s: testo sul colore ≥ 4.5', (accent) => {
    expect(contrastRatio(onColor(accent), accent)).toBeGreaterThanOrEqual(4.5)
  })
  it.each(accentPalette)('%s: variante testuale leggibile su tutte le superfici', (accent) => {
    for (const surface of Object.values(surfaces)) {
      expect(contrastRatio(readableOn(accent, surface), surface)).toBeGreaterThanOrEqual(4.5)
    }
  })
  it.each(accentPalette.flatMap((accent) => (['light', 'dark'] as const).map((mode) => [accent, mode] as const)))(
    '%s (%s): testo colorato leggibile anche sul fondo tenue',
    (accent, mode) => {
      const { soft, strong } = accentVariants(accent, SURFACES[mode], BACKGROUNDS[mode], SOFT_AMOUNT[mode])
      for (const base of [SURFACES[mode], BACKGROUNDS[mode], soft])
        expect(contrastRatio(strong, base)).toBeGreaterThanOrEqual(4.5)
    },
  )
  it('non modifica un colore già leggibile', () => {
    expect(readableOn('#4f46e5', '#ffffff')).toBe('#4f46e5')
  })
})

describe('colori di stato e testo secondario', () => {
  it.each([
    ['#1d7a3a', '#ffffff'],
    ['#c4262e', '#ffffff'],
    ['#5f5f66', '#f2f2f7'],
    ['#5f5f66', '#ffffff'],
    ['#9a5b00', '#ffffff'],
    ['#4ade80', '#1c1c1e'],
    ['#ffffff', '#c4262e'],
    ['#000000', '#ff8a8a'],
    ['#ff8a8a', '#1c1c1e'],
    ['#a8a8b0', '#1c1c1e'],
    ['#a8a8b0', '#2c2c2e'],
    ['#fbbf24', '#1c1c1e'],
  ])('%s su %s', (color, background) => {
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5)
  })
})
