import { useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { useLanguage } from '../../context/LanguageContext'
import SystemPage from './SystemPage'
import ClientDetail from '../shared/ClientDetail'
import CETABaselineForm from './CETABaselineForm'
import CETAFollowupForm from './CETAFollowupForm'
import DataVisualization from '../shared/DataVisualization'

function CETADashboard() {
  const { user } = useAuth()
  const { locale } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'referrals' | 'cases' | 'visualization'>('referrals')

  const data = useLiveQuery(async () => {
    const refs = await db.referrals.toArray()
    const clients = await db.ceta_baseline.toArray()
    const cetaSessions = await db.ceta_followups.toArray()

    const clientMap = new Map(clients.map(c => [c.ClientID, c]))

    const cetaReferrals = refs
      .filter(r => r.Target_Tier === 'CETA')
      .map(r => ({
        ...r,
        client: clients.find(c => c.ClientID === r.Client_ID) || { ClientName: r.Client_Name || 'Referred Patient', ClientID: r.Client_ID }
      })).sort((a, b) => b.Referral_Date.localeCompare(a.Referral_Date))

    const cetaClients = clients.map(c => {
      const sessions = cetaSessions
        .filter(s => s.ClientID === c.ClientID)
        .sort((a, b) => b.SessionNumber - a.SessionNumber)

      return {
        ...c,
        Client_ID: c.ClientID, // alias
        Client_Name: c.ClientName,
        Client_Age: c.Age,
        Client_Gender: c.Gender,
        latestSession: sessions[0],
        sessionCount: sessions.length,
      }
    })

    // 1. Average Symptom Improvement Rate
    let problemDeltas: number[] = []
    let problemIntakes: number[] = []

    cetaClients.forEach(c => {
      const clientSessions = cetaSessions
        .filter(s => s.ClientID === c.ClientID && s.WeeklyCMFProblemScore !== undefined)
        .sort((a, b) => b.SessionNumber - a.SessionNumber) // latest first

      if (clientSessions.length > 0) {
        const intakeVal = c.BaselineCMFProgblemScore
        const latestVal = clientSessions[0].WeeklyCMFProblemScore
        problemIntakes.push(intakeVal)
        problemDeltas.push(latestVal - intakeVal)
      }
    })

    const avgIntake = problemIntakes.length > 0 ? problemIntakes.reduce((a, b) => a + b, 0) / problemIntakes.length : 0
    const avgDelta = problemDeltas.length > 0 ? problemDeltas.reduce((a, b) => a + b, 0) / problemDeltas.length : 0
    const improvementPercent = avgIntake > 0 ? Math.round((-avgDelta / avgIntake) * 100) : 0

    // 2. High Risk count
    let highRiskCount = 0
    cetaClients.forEach(c => {
      if (c.latestSession ? c.latestSession.SI === 'Yes' || c.latestSession.HI === 'Yes' : c.HighRisk === 'Yes') {
        highRiskCount++
      }
    })

    // 3. Components breakdown
    const elementCounts: Record<string, number> = {}
    cetaSessions.forEach(s => {
      if (s.Component1Done && s.Component1Done !== 'None') {
        elementCounts[s.Component1Done] = (elementCounts[s.Component1Done] || 0) + 1
      }
      if (s.Component2Done && s.Component2Done !== 'None') {
        elementCounts[s.Component2Done] = (elementCounts[s.Component2Done] || 0) + 1
      }
    })

    return {
      referrals: cetaReferrals,
      cases: cetaClients,
      stats: {
        improvementPercent,
        avgDelta: Math.abs(avgDelta).toFixed(1),
        totalSessionsCount: cetaSessions.length,
        highRiskCount,
        elementCounts
      }
    }
  }, [])

  const handleDeclineReferral = async (id: number) => {
    if (confirm('Decline CETA referral?')) {
      await db.referrals.update(id, { Status: 'Completed', Outcome_Notes: 'Declined by CETA team.' })
    }
  }

  const handleAcceptReferral = async (referralId: number, clientId: string) => {
    await db.referrals.update(referralId, {
      Status: 'Completed',
      Outcome_Notes: 'Referral accepted by CETA specialist.'
    })
    navigate(`/supervisor/ceta-plan?referralId=${referralId}`)
  }

  return (
    <div>
      <Navbar title="Mindvibe – CETA Portal" />
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Hello, {user?.username}</h1>
            <p style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>CETA Specialist / Case Supervisor</p>
          </div>
          <Link to="/supervisor/system" className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '8px' }}>
            ⚙️ System Admin
          </Link>
        </div>

        {/* Supervisor Figures & Analytics Dashboard */}
        {data && data.stats && (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-value">
                  {data.stats.improvementPercent >= 0 ? `+${data.stats.improvementPercent}%` : `${data.stats.improvementPercent}%`}
                </div>
                <div className="metric-label">{locale === 'en' ? 'CMF Score Improvement' : 'ပျမ်းမျှ စိတ်ကျန်းမာရေး သက်သာနှုန်း'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {locale === 'en' ? `Reduction of ${data.stats.avgDelta} points` : `ရမှတ် ${data.stats.avgDelta} ကျဆင်းသွားပါသည်`}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{data.stats.highRiskCount}</div>
                <div className="metric-label">{locale === 'en' ? 'Active High Risk cases' : 'တက်ကြွ စိုးရိမ်ရလူနာဦးရေ'}</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{data.stats.totalSessionsCount}</div>
                <div className="metric-label">{locale === 'en' ? 'Total Sessions Logged' : 'နှစ်သိမ့်ဆွေးနွေးမှုစုစုပေါင်း'}</div>
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
            CETA Referrals Inbox ({data?.referrals.filter(r => r.Status === 'Pending').length || 0})
          </button>
          <button
            className={`tab ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => setActiveTab('cases')}
          >
            Active CETA Cases ({data?.cases.length || 0})
          </button>
          <button
            className={`tab ${activeTab === 'visualization' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualization')}
          >
            {locale === 'en' ? 'Data Visualization' : 'အချက်အလက် စာရင်းဇယားပြသမှု'}
          </button>
        </div>

        {/* Tab: Referrals */}
        {activeTab === 'referrals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Referrals Requesting CETA</h3>

            {data === undefined && <div className="spinner">Loading inbox…</div>}

            {data?.referrals.length === 0 && (
              <div className="alert alert-info">No pending CETA referrals.</div>
            )}

            {data?.referrals && data.referrals.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Patient ID</th>
                      <th>Source</th>
                      <th>Urgency</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrals.map(r => (
                      <tr key={r.AutoSr}>
                        <td>{r.Referral_Date}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.client?.ClientName || 'Referred Patient'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>ID: {r.Client_ID}</div>
                        </td>
                        <td>{r.Source_Tier}</td>
                        <td>
                          <span className={`badge ${r.Urgency === 'Crisis' ? 'badge-red' : r.Urgency === 'Urgent' ? 'badge-yellow' : 'badge-blue'}`}>
                            {r.Urgency}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', fontSize: '0.85rem' }} title={r.Reason}>
                          {r.Reason}
                        </td>
                        <td>
                          {r.Status === 'Pending' && r.AutoSr ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleAcceptReferral(r.AutoSr!, r.Client_ID)}
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

        {/* Tab: Cases */}
        {activeTab === 'cases' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title" style={{ margin: 0 }}>CETA Case Management</h3>
              <button 
                onClick={() => navigate('/supervisor/ceta-plan')}
                className="btn btn-primary"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                ➕ Intake Patient
              </button>
            </div>

            {data === undefined && <div className="spinner">Loading cases…</div>}

            {data?.cases.length === 0 && (
              <div className="alert alert-info">No active CETA cases.</div>
            )}

            {data?.cases && data.cases.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.cases.map(c => (
                  <div key={c.AutoSr} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div onClick={() => navigate(`/supervisor/case-summary?clientId=${c.ClientID}`)} style={{ cursor: 'pointer' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--md-sys-color-primary)' }}>{c.ClientName}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', display: 'flex', gap: '10px', marginTop: '4px' }}>
                          <span>ID: {c.ClientID}</span>
                          <span>Age: {c.Age} ({c.Gender})</span>
                        </div>
                      </div>

                      <div>
                        <span className="badge badge-blue">
                          Score: {c.latestSession ? c.latestSession.WeeklyCMFProblemScore : c.BaselineCMFProgblemScore}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', background: 'var(--md-sys-color-surface-variant)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      <div>📋 CETA Treatment Flow: <strong>{c.FinalFlow}</strong></div>
                      <div>💬 Sessions Completed: <strong>{c.sessionCount}</strong></div>
                      {c.latestSession && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span>Latest session: <strong>#{c.latestSession.SessionNumber} ({c.latestSession.SessionDate})</strong></span>
                          <span>·</span>
                          <span>SI: <strong>{c.latestSession.SI}</strong></span>
                          <span>·</span>
                          <span>HI: <strong>{c.latestSession.HI}</strong></span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', borderTop: '1px solid var(--md-sys-color-outline)', paddingTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/supervisor/ceta-plan?clientId=${c.ClientID}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}
                      >
                        📋 Edit Intake
                      </button>
                      <button
                        onClick={() => navigate(`/supervisor/ceta-session?clientId=${c.ClientID}`)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}
                      >
                        💬 Log Session
                      </button>
                      <button
                        onClick={() => navigate(`/supervisor/case-summary?clientId=${c.ClientID}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', marginLeft: 'auto' }}
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

        {/* Tab: Visualization */}
        {activeTab === 'visualization' && (
          <ErrorBoundary title="Data Visualization" backTo="/supervisor">
            <DataVisualization tier="CETA" />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}

export default function SupervisorHome() {
  return (
    <Routes>
      <Route index element={<CETADashboard />} />
      <Route path="ceta-plan"     element={<ErrorBoundary title="CETA Intake Baseline" backTo="/supervisor"><CETABaselineForm /></ErrorBoundary>} />
      <Route path="ceta-session"  element={<ErrorBoundary title="CETA Session Log"      backTo="/supervisor"><CETAFollowupForm /></ErrorBoundary>} />
      <Route path="case-summary"  element={<ErrorBoundary title="Case Summary"          backTo="/supervisor"><ClientDetail /></ErrorBoundary>} />
      <Route path="system"        element={<ErrorBoundary title="System Administration" backTo="/supervisor"><SystemPage /></ErrorBoundary>} />
    </Routes>
  )
}
