import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { accentVariants } from '../ui/color'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'

/** Palette storica del colore principale. */
export const accentPalette = [
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
]

const THEME_KEY = 'mygesture-theme'
const COLOR_KEY = 'mygesture-color'
export const SURFACES: Record<ResolvedMode, string> = { light: '#ffffff', dark: '#1c1c1e' }
export const BACKGROUNDS: Record<ResolvedMode, string> = { light: '#f2f2f7', dark: '#000000' }
/** Quanto colore principale c'è nel fondo tenue (chip, pulsanti secondari, icone). */
export const SOFT_AMOUNT: Record<ResolvedMode, number> = { light: 0.12, dark: 0.22 }

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage non disponibile (es. navigazione privata): la scelta vale solo per questa sessione.
  }
}

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

function useSystemMode(): ResolvedMode {
  const [mode, setMode] = useState<ResolvedMode>(() => (darkQuery()?.matches ? 'dark' : 'light'))
  useEffect(() => {
    const query = darkQuery()
    if (!query) return
    const update = () => setMode(query.matches ? 'dark' : 'light')
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mode
}

/** Applica tema e colore al documento (variabili CSS, data-mode, theme-color per la barra di stato). */
export function applyTheme(mode: ResolvedMode, theme: ThemeMode, accent: string) {
  const root = document.documentElement
  root.dataset.mode = mode
  root.dataset.theme = theme
  // Il testo colorato deve restare leggibile sia sulle card sia sullo sfondo.
  const { soft, strong, on } = accentVariants(accent, SURFACES[mode], BACKGROUNDS[mode], SOFT_AMOUNT[mode])
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-soft', soft)
  root.style.setProperty('--accent-strong', strong)
  root.style.setProperty('--on-accent', on)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BACKGROUNDS[mode])
}

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  mode: ResolvedMode
  color: string
  setColor: (color: string) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => read(THEME_KEY, 'system') as ThemeMode)
  const [color, setColor] = useState(() => read(COLOR_KEY, accentPalette[0]!))
  const systemMode = useSystemMode()
  const mode: ResolvedMode = theme === 'system' ? systemMode : theme

  useEffect(() => {
    applyTheme(mode, theme, color)
    write(THEME_KEY, theme)
    write(COLOR_KEY, color)
  }, [mode, theme, color])

  return <ThemeContext.Provider value={{ theme, setTheme, mode, color, setColor }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme va usato dentro ThemeProvider')
  return value
}
