import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function SessionList() {
  const { locale } = useLanguage()
  const navigate = useNavigate()

  const sessions = useLiveQuery(async () => {
    return await db.focal_point_sessions.reverse().toArray()
  }, [])

  const handleDelete = async (autoSr: number) => {
    if (confirm(locale === 'en' ? 'Are you sure you want to delete this session log?' : 'ဤမှတ်တမ်းအား ဖျက်လိုပါသလား။')) {
      await db.focal_point_sessions.delete(autoSr)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">{locale === 'en' ? 'Focal Point Session logs' : 'အဖွဲ့လိုက် စည်းဝေးဆွေးနွေးမှု မှတ်တမ်းများ'}</h2>
        <button 
          onClick={() => navigate('/field/sessions/new')} 
          className="btn btn-primary"
          style={{ padding: '8px 16px', borderRadius: '8px' }}
        >
          ➕ {locale === 'en' ? 'Add Session' : 'မှတ်တမ်းအသစ်ထည့်ရန်'}
        </button>
      </div>

      {sessions === undefined && <div className="spinner">Loading sessions…</div>}

      {sessions && sessions.length === 0 && (
        <div className="alert alert-info">
          {locale === 'en' ? 'No session logs recorded yet.' : 'မှတ်တမ်းများ မရှိသေးပါ။'}
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{locale === 'en' ? 'Date' : 'ရက်စွဲ'}</th>
                <th>{locale === 'en' ? 'Session ID' : 'ဆွေးနွေးမှု ID'}</th>
                <th>{locale === 'en' ? 'Focal Point' : 'ဝန်ထမ်း'}</th>
                <th>{locale === 'en' ? 'Location' : 'ဆေးခန်း/ကျေးရွာ'}</th>
                <th>{locale === 'en' ? 'Attendees' : 'တက်ရောက်သူ'}</th>
                <th>{locale === 'en' ? 'Actions' : 'ဆောင်ရွက်ချက်များ'}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.AutoSr}>
                  <td>{s.Date}</td>
                  <td><strong style={{ fontSize: '0.85rem' }}>{s.SessionID}</strong></td>
                  <td>{s.ProviderName}</td>
                  <td>
                    <div>{s.ClinicName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>📍 {s.VillageName}</div>
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ marginRight: '4px' }}>M: {s.Male}</span>
                    <span className="badge badge-green">F: {s.Female}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => navigate(`/field/sessions/new?autoSr=${s.AutoSr}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        ✏️ {locale === 'en' ? 'Edit' : 'ပြင်ရန်'}
                      </button>
                      {s.AutoSr && (
                        <button
                          onClick={() => handleDelete(s.AutoSr!)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', background: 'transparent', color: 'var(--md-sys-color-error)', border: '1px solid var(--md-sys-color-error)' }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
