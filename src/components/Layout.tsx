import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import ThemeCustomizer from './ThemeCustomizer'

interface NavbarProps {
  title: string
  showBack?: boolean
  backTo?: string
}

export function Navbar({ title, showBack, backTo }: NavbarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { locale, toggleLanguage } = useLanguage()

  const handleBack = () => {
    if (backTo) navigate(backTo)
    else navigate(-1)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navbar">
      {showBack && (
        <button className="navbar-back" onClick={handleBack} aria-label="Back">
          ←
        </button>
      )}
      <span className="navbar-title">{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ThemeCustomizer />

        <button 
          className="navbar-action" 
          onClick={toggleLanguage} 
          style={{ fontWeight: 600 }}
        >
          {locale === 'en' ? 'မြန်မာ' : 'English'}
        </button>

        {user && (
          <button className="navbar-action" onClick={handleLogout} title={`${user.username} (${user.levelDesp})`}>
            {locale === 'en' ? 'Logout' : 'ထွက်ရန်'}
          </button>
        )}
      </div>
    </nav>
  )
}
