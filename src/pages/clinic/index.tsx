import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { useLanguage } from '../../context/LanguageContext'
import CPSSBaselineForm from './CPSSBaselineForm'
import CPSSFollowupForm from './CPSSFollowupForm'
import ClientDetail from '../shared/ClientDetail'
import DataVisualization from '../shared/DataVisualization'

function ClinicDashboard() {
  const { user } = useAuth()
  const { locale } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'referrals' | 'patients' | 'visualization'>('referrals')

  const dashboardData = useLiveQuery(async () => {
    const refs = await db.referrals.toArray()
    const clients = await db.cpss_baseline.toArray()
    const sessions = await db.cpss_followups.toArray()
    const villages = await db.sys_village.toArray()

    const clientMap = new Map(clients.map(c => [c.ClientID, c]))
    const villageMap = new Map(villages.map(v => [v.Village_Pcode, v.Village]))

    const referralsWithClient = refs.map(r => ({
      ...r,
      client: clients.find(c => c.ClientID === r.Client_ID) || { ClientName: r.Client_Name || 'Referred Patient', ClientID: r.Client_ID },
    })).sort((a, b) => b.Referral_Date.localeCompare(a.Referral_Date))

    const patientsWithStats = clients.map(c => {
      const pSessions = sessions
        .filter(s => s.ClientID === c.ClientID)
        .sort((a, b) => b.FollowupDate.localeCompare(a.FollowupDate))

      return {
        ...c,
        Client_ID: c.ClientID, // alias for details
        Client_Name: c.ClientName,
        Client_Age: c.Age,
        Client_Gender: c.Gender,
        villageName: c.VillageName,
        latestSession: pSessions[0],
        sessionCount: pSessions.length,
      }
    })

    // Calculate analytics metrics
    const completedIntakes = clients.length
    const activeClientsSet = new Set(sessions.map(s => s.ClientID))
    const activeTherapy = activeClientsSet.size
    const totalSessions = sessions.length

    // Calculate safety risk distribution
    let siCount = 0
    let hiCount = 0
    let noRiskCount = 0
    sessions.forEach(s => {
      if (s.FinalResultSafety?.includes('SI')) siCount++
      else if (s.FinalResultSafety?.includes('HI')) hiCount++
      else noRiskCount++
    })

    return {
      referrals: referralsWithClient,
      patients: patientsWithStats,
      stats: {
        completedIntakes,
        activeTherapy,
        totalSessions,
        siCount,
        hiCount,
        noRiskCount
      }
    }
  }, [])

  const handleDeclineReferral = async (id: number) => {
    if (confirm('Are you sure you want to decline this referral?')) {
      await db.referrals.update(id, { Status: 'Completed', Outcome_Notes: 'Declined by clinic.' })
    }
  }

  return (
    <div>
      <Navbar title="Mindvibe – CPSS Clinic" />
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Welcome, {user?.username}</h1>
          <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Clinic Specialist Portal (CPSS Level)</p>
        </div>

        {/* Clinic Figures & Analytics Dashboard */}
        {dashboardData && dashboardData.stats && (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-value">{dashboardData.stats.completedIntakes}</div>
                <div className="metric-label">{locale === 'en' ? 'Completed Intakes' : 'ဆန်းစစ်မှု စာရင်းများ'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{dashboardData.stats.activeTherapy}</div>
                <div className="metric-label">{locale === 'en' ? 'Active Therapy Clients' : 'နှစ်သိမ့်ဆွေးနွေးသူများ'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{dashboardData.stats.totalSessions}</div>
                <div className="metric-label">{locale === 'en' ? 'Follow-up Sessions' : 'ခြေရာခံဆွေးနွေးမှုစုစုပေါင်း'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Controls */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            Referrals Inbox ({dashboardData?.referrals.filter(r => r.Status === 'Pending').length || 0})
          </button>
          <button
            className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            Clinic Patients ({dashboardData?.patients.length || 0})
          </button>
          <button
            className={`tab ${activeTab === 'visualization' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualization')}
          >
            {locale === 'en' ? 'Data Visualization' : 'အချက်အလက် စာရင်းဇယားပြသမှု'}
          </button>
        </div>

        {/* Tab Content: Referrals */}
        {activeTab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Pending Referrals from Village</h3>
            
            {dashboardData === undefined && <div className="spinner">Loading inbox…</div>}

            {dashboardData?.referrals.length === 0 && (
              <div className="alert alert-info">No referrals received yet.</div>
            )}

            {dashboardData?.referrals && dashboardData.referrals.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient</th>
                      <th>Urgency</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.referrals.map(r => (
                      <tr key={r.AutoSr}>
                        <td>{r.Referral_Date}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.client?.ClientName || 'Unknown'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>ID: {r.Client_ID}</div>
                        </td>
                        <td>
                          <span className={`badge ${r.Urgency === 'Crisis' ? 'badge-red' : r.Urgency === 'Urgent' ? 'badge-yellow' : 'badge-blue'}`}>
                            {r.Urgency}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '0.85rem' }} title={r.Reason}>
                          {r.Reason}
                        </td>
                        <td>
                          <span className={`badge ${r.Status === 'Pending' ? 'badge-yellow' : 'badge-green'}`}>
                            {r.Status}
                          </span>
                        </td>
                        <td>
                          {r.Status === 'Pending' && r.AutoSr ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => navigate(`/clinic/intake?clientId=${r.Client_ID}&referralId=${r.AutoSr}`)}
                                className="btn btn-primary"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Accept & Intake
                              </button>
                              <button
                                onClick={() => handleDeclineReferral(r.AutoSr!)}
                                className="btn btn-danger"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', background: 'transparent', color: 'var(--md-sys-color-error)', border: '1px solid var(--md-sys-color-error)' }}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Patients */}
        {activeTab === 'patients' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Active Clinic Patients</h3>
              <button 
                onClick={() => navigate('/clinic/intake')}
                className="btn btn-primary"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                ➕ Intake Patient
              </button>
            </div>

            {dashboardData === undefined && <div className="spinner">Loading patients…</div>}

            {dashboardData?.patients.length === 0 && (
              <div className="alert alert-info">No patients currently active.</div>
            )}

            {dashboardData?.patients && dashboardData.patients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.patients.map(p => (
                  <div key={p.AutoSr} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div onClick={() => navigate(`/clinic/clients/${p.ClientID}`)} style={{ cursor: 'pointer' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--md-sys-color-primary)' }}>{p.ClientName}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', gap: '10px', marginTop: '4px' }}>
                          <span>ID: {p.ClientID}</span>
                          <span>Age: {p.Age} ({p.Gender})</span>
                          <span>📍 {p.VillageName}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span className="badge badge-blue" title="Problem Score">
                          Score: {p.latestSession ? p.latestSession.FollowupProblemScore : p.ProblemScore}
                        </span>
                        <span className="badge badge-yellow">{p.ClientType}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', background: 'var(--md-sys-color-surface-variant)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      <div>💬 Sessions Logged: <strong>{p.sessionCount}</strong> {p.latestSession && `(Latest: ${p.latestSession.FollowupDate})`}</div>
                      <div>⚠️ Safety: <strong>{p.latestSession ? p.latestSession.FinalResultSafety : p.Safety}</strong></div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/clinic/intake?clientId=${p.ClientID}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        📋 Edit Intake
                      </button>
                      <button
                        onClick={() => navigate(`/clinic/followup?clientId=${p.ClientID}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        💬 Log Follow-up
                      </button>
                      <button
                        onClick={() => navigate(`/clinic/clients/${p.ClientID}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', marginLeft: 'auto' }}
                      >
                        📊 View Progress
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Data Visualization */}
        {activeTab === 'visualization' && (
          <ErrorBoundary title="Data Visualization" backTo="/clinic">
            <DataVisualization tier="CPSS" />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}

export default function ClinicHome() {
  return (
    <Routes>
      <Route index element={<ClinicDashboard />} />
      <Route path="intake"            element={<ErrorBoundary title="Intake Assessment" backTo="/clinic"><CPSSBaselineForm /></ErrorBoundary>} />
      <Route path="followup"          element={<ErrorBoundary title="Follow-up Session"  backTo="/clinic"><CPSSFollowupForm /></ErrorBoundary>} />
      <Route path="clients/:clientId" element={<ErrorBoundary title="Patient Details"   backTo="/clinic"><ClientDetail /></ErrorBoundary>} />
    </Routes>
  )
}
