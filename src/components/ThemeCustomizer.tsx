import { useState, useRef, useEffect } from 'react'
import { useTheme, type ThemeSeed } from '../context/ThemeContext'

export default function ThemeCustomizer() {
  const { themeSeed, setThemeSeed, themeMode, toggleMode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const seeds: { id: ThemeSeed; color: string; label: string }[] = [
    { id: 'teal', color: '#0f766e', label: 'Teal' },
    { id: 'sage', color: '#2e7d32', label: 'Sage' },
    { id: 'lavender', color: '#6d28d9', label: 'Lavender' },
    { id: 'blue', color: '#1d4ed8', label: 'Blue' },
  ]

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="navbar-action"
        style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
        title="Customize Theme"
      >
        🎨
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            background: 'var(--md-sys-color-surface)',
            border: '1.5px solid var(--md-sys-color-outline)',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            padding: '16px',
            width: '210px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Material 3 Theme
          </div>

          {/* Mode Toggle */}
          <button
            onClick={() => { toggleMode(); setIsOpen(false); }}
            className="btn btn-outline"
            style={{
              padding: '8px 12px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              borderColor: 'var(--md-sys-color-outline)',
              color: 'var(--md-sys-color-on-surface)'
            }}
          >
            {themeMode === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>

          <div style={{ borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
              PALETTE SEED
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {seeds.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setThemeSeed(s.id); setIsOpen(false); }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: themeSeed === s.id ? '2.5px solid var(--md-sys-color-on-surface)' : '1px solid transparent',
                    background: s.color,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                    padding: 0
                  }}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
