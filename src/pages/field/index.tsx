import { Routes, Route } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { useLanguage } from '../../context/LanguageContext'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import SessionList from './SessionList'
import SessionForm from './SessionForm'
import ReferralForm from './ReferralForm'

function FieldMenu() {
  const { user } = useAuth()
  const { t, locale } = useLanguage()

  const stats = useLiveQuery(async () => {
    const sessions = await db.focal_point_sessions.toArray()
    const totalSessions = sessions.length
    
    let totalMale = 0
    let totalFemale = 0
    let totalPeople5Signs = 0
    let totalHandouts = 0
    let totalCalls = 0

    sessions.forEach(s => {
      totalMale += s.Male || 0
      totalFemale += s.Female || 0
      totalPeople5Signs += s.People5Signs || 0
      totalHandouts += (s.StressHandoutShared || 0) + (s.ChangeHandoutShared || 0)
      totalCalls += (s.CPSSNew || 0) + (s.CPSSFollowup || 0)
    })

    const totalAttendees = totalMale + totalFemale
    const referralsCount = await db.referrals.filter(r => r.Source_Tier === 'Focal Point').count()

    return {
      totalSessions,
      totalAttendees,
      totalPeople5Signs,
      totalHandouts,
      totalCalls,
      referralsCount
    }
  }, [])

  const menuItems = [
    { icon: '👥', label: locale === 'en' ? 'Session Logs' : 'ဆွေးနွေးမှုမှတ်တမ်းများ', path: '/field/sessions' },
    { icon: '📝', label: locale === 'en' ? 'New Session' : 'မှတ်တမ်းသစ်ထည့်ရန်',  path: '/field/sessions/new' },
    { icon: '🚑', label: t('send_referral'),   path: '/field/referral/new' },
  ]

  return (
    <div>
      <Navbar title={t('app_name') + ' – ' + (user?.username || 'Focal Point')} />
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{t('hello')}, {user?.username}</h1>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{t('focal_point_title')}</p>
        </div>

        <div className="menu-grid">
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} className="menu-item">
              <span className="icon">{item.icon}</span>
              <span className="label" style={{ whiteSpace: 'pre-line' }}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Operational Statistics Dashboard */}
        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--md-sys-color-primary)' }}>
            {locale === 'en' ? 'Village Analytics & Figures' : 'ကျေးရွာအဆင့် စာရင်းဇယားနှင့် တိုးတက်မှုများ'}
          </h2>
          
          {stats === undefined ? (
            <div className="spinner">{t('loading')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-value">{stats.totalSessions}</div>
                  <div className="metric-label">{locale === 'en' ? 'Total Sessions' : 'ဆွေးနွေးမှုစုစုပေါင်း'}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{stats.totalAttendees}</div>
                  <div className="metric-label">{locale === 'en' ? 'Total Attendees' : 'တက်ရောက်သူစုစုပေါင်း'}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">{stats.referralsCount}</div>
                  <div className="metric-label">{locale === 'en' ? 'Clinic Referrals' : 'ဆေးခန်းလွှဲပြောင်းမှု'}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
                  {locale === 'en' ? 'Operational Performance Indicators' : 'အညွှန်းကိန်းများနှင့် ဆောင်ရွက်ချက်များ'}
                </h3>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span>{locale === 'en' ? 'Handouts & Brochures Distributed' : 'ဖြန့်ဝေခဲ့သည့် လက်ကမ်းစာစောင်များ'}</span>
                    <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>{stats.totalHandouts}</span>
                  </div>
                  <div className="m3-progress-bar">
                    <div className="m3-progress-fill" style={{ width: `${Math.min(100, (stats.totalHandouts / 100) * 100)}%`, background: 'var(--md-sys-color-primary)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span>{locale === 'en' ? 'Calls Completed to CPSS Clinics' : 'CPSS ဆေးခန်းသို့ ဆက်သွယ်မှု'}</span>
                    <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>{stats.totalCalls}</span>
                  </div>
                  <div className="m3-progress-bar">
                    <div className="m3-progress-fill" style={{ width: `${Math.min(100, (stats.totalCalls / 20) * 100)}%`, background: 'var(--md-sys-color-primary)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span>{locale === 'en' ? 'People displaying 5 Serious Signs' : 'စိုးရိမ်ရသည့် လက္ခဏာ (၅) ရပ်ပြသသူ'}</span>
                    <span style={{ color: 'var(--md-sys-color-error)', fontWeight: 700 }}>{stats.totalPeople5Signs}</span>
                  </div>
                  <div className="m3-progress-bar">
                    <div className="m3-progress-fill" style={{ width: `${Math.min(100, (stats.totalPeople5Signs / 10) * 100)}%`, background: 'var(--md-sys-color-error)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: '24px', background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '1rem', color: 'inherit' }}>💡 {t('quick_guide')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'inherit', opacity: 0.9, lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {t('guide_desc')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FieldHome() {
  const { t } = useLanguage()
  return (
    <Routes>
      <Route index element={<FieldMenu />} />
      <Route path="sessions"          element={<ErrorBoundary title="Sessions" backTo="/field"><SessionList /></ErrorBoundary>} />
      <Route path="sessions/new"      element={<ErrorBoundary title="New Session" backTo="/field"><SessionForm /></ErrorBoundary>} />
      <Route path="referral/new"      element={<ErrorBoundary title={t('send_referral')} backTo="/field"><ReferralForm /></ErrorBoundary>} />
    </Routes>
  )
}
