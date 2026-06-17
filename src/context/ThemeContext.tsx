import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type ThemeSeed = 'teal' | 'sage' | 'lavender' | 'blue'
export type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  themeSeed: ThemeSeed
  setThemeSeed: (seed: ThemeSeed) => void
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSeed, setThemeSeedState] = useState<ThemeSeed>(() => {
    const saved = localStorage.getItem('theme_seed')
    return (saved === 'teal' || saved === 'sage' || saved === 'lavender' || saved === 'blue') ? saved : 'teal'
  })

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme_mode')
    return (saved === 'light' || saved === 'dark') ? saved : 'light'
  })

  const setThemeSeed = (seed: ThemeSeed) => {
    localStorage.setItem('theme_seed', seed)
    setThemeSeedState(seed)
  }

  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem('theme_mode', mode)
    setThemeModeState(mode)
  }

  const toggleMode = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light')
  }

  useEffect(() => {
    const root = document.documentElement
    
    // Remove previous theme/mode classes
    root.className = ''
    
    // Add current theme & mode classes
    root.classList.add(`theme-${themeSeed}`)
    root.classList.add(`mode-${themeMode}`)
  }, [themeSeed, themeMode])

  return (
    <ThemeContext.Provider value={{ themeSeed, setThemeSeed, themeMode, setThemeMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
