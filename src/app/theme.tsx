import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
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
    // Storage non disponibile (es. navigazione privata): il tema vale solo per questa sessione.
  }
}

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  color: string
  setColor: (color: string) => void
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => read(THEME_KEY, 'system') as ThemeMode)
  const [color, setColor] = useState(() => read(COLOR_KEY, accentPalette[0]!))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.setProperty('--accent-color', color)
    write(THEME_KEY, theme)
    write(COLOR_KEY, color)
  }, [theme, color])

  return <ThemeContext.Provider value={{ theme, setTheme, color, setColor }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme va usato dentro ThemeProvider')
  return value
}
