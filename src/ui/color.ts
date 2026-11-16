/** Utilità di contrasto (WCAG 2.x) per derivare colori leggibili dal colore principale scelto. */

type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((char) => char + char).join('') : value
  const number = Number.parseInt(full, 16)
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

/** Miscela `color` verso `target` (0 = color, 1 = target). */
export function mix(color: string, target: string, amount: number): string {
  const a = hexToRgb(color)
  const b = hexToRgb(target)
  return rgbToHex(a.map((channel, index) => channel + (b[index]! - channel) * amount) as Rgb)
}

/** Testo da usare sopra un fondo colorato: bianco o quasi nero, quello con più contrasto. */
export function onColor(background: string): string {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111114', background) ? '#ffffff' : '#111114'
}

/**
 * Variante del colore leggibile come testo su `background` (contrasto ≥ `min`):
 * scurita su fondi chiari, schiarita su fondi scuri, il minimo indispensabile.
 */
export function readableOn(color: string, background: string, min = 4.5): string {
  const target = luminance(background) > 0.5 ? '#000000' : '#ffffff'
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(color, target, step / 20)
    if (contrastRatio(candidate, background) >= min) return candidate
  }
  return target
}

/** Varianti del colore principale per un tema: fondo tenue e testo leggibile su card, sfondo e fondo tenue. */
export function accentVariants(accent: string, surface: string, background: string, softAmount: number) {
  const soft = mix(accent, surface, 1 - softAmount)
  const strong = [surface, background, soft].reduce((color, base) => readableOn(color, base), accent)
  return { soft, strong, on: onColor(accent) }
}
