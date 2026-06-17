import { useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'
import { useAuth, LEVEL_CETA, LEVEL_DBADMIN, canWrite } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

interface TimelineItem {
  id: number
  date: string
  type: 'CPSS Baseline' | 'CPSS Followup' | 'CETA Baseline' | 'CETA Session'
  title: string
  subtitle: string
  notes?: string
  raw: any
}

export default function ClientDetail() {
  const { clientId: clientIdFromParams } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const clientId = clientIdFromParams || searchParams.get('clientId') || ''
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { locale } = useLanguage()

  const isSupervisor = user?.level === LEVEL_CETA || user?.level === LEVEL_DBADMIN
  const portalPrefix = location.pathname.startsWith('/field') 
    ? '/field' 
    : location.pathname.startsWith('/clinic') 
      ? '/clinic' 
      : '/supervisor'

  // Modal states for previewing details
  const [previewItem, setPreviewItem] = useState<TimelineItem | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  const client = useLiveQuery(async () => {
    if (!clientId) return null
    const cpss = await db.cpss_baseline.where('ClientID').equals(clientId).first()
    if (cpss) {
      return {
        Client_ID: cpss.ClientID,
        Client_Name: cpss.ClientName,
        Client_Age: cpss.Age,
        Client_Gender: cpss.Gender,
        Client_Phone: 'N/A',
        Client_StartDate: cpss.Date,
        VillageName: cpss.VillageName,
        ClinicName: cpss.ClinicName,
        notes: cpss.Notes
      }
    }
    const ceta = await db.ceta_baseline.where('ClientID').equals(clientId).first()
    if (ceta) {
      return {
        Client_ID: ceta.ClientID,
        Client_Name: ceta.ClientName,
        Client_Age: ceta.Age,
        Client_Gender: ceta.Gender,
        Client_Phone: 'N/A',
        Client_StartDate: ceta.AssessmentDate,
        VillageName: ceta.VillageName,
        ClinicName: ceta.ClinicName,
        notes: ceta.ClientBackground
      }
    }
    return null
  }, [clientId])

  const data = useLiveQuery(async () => {
    if (!clientId) return null

    const [cpssBaselines, cpssFollowups, cetaBaselines, cetaFollowups] = await Promise.all([
      db.cpss_baseline.where('ClientID').equals(clientId).toArray(),
      db.cpss_followups.where('ClientID').equals(clientId).toArray(),
      db.ceta_baseline.where('ClientID').equals(clientId).toArray(),
      db.ceta_followups.where('ClientID').equals(clientId).toArray()
    ])

    const items: TimelineItem[] = []

    cpssBaselines.forEach(b => {
      items.push({
        id: b.AutoSr!,
        date: b.Date,
        type: 'CPSS Baseline',
        title: locale === 'en' ? `CPSS Baseline Intake` : 'CPSS အခြေခံစစ်ဆေးမှုပုံစံ',
        subtitle: `Score: ${b.ProblemScore} · Safety: ${b.Safety} · Substance Use: ${b.SubstanceUse}`,
        notes: b.Notes,
        raw: b
      })
    })

    cpssFollowups.forEach(f => {
      items.push({
        id: f.AutoSr!,
        date: f.FollowupDate,
        type: 'CPSS Followup',
        title: locale === 'en' ? `CPSS Follow-up` : 'CPSS နောက်ဆက်တွဲမှတ်တမ်း',
        subtitle: `Score: ${f.FollowupProblemScore} · Safety: ${f.FinalResultSafety} · Refer CETA: ${f.ReferCETA}`,
        notes: f.ActionTakenSafety,
        raw: f
      })
    })

    cetaBaselines.forEach(b => {
      items.push({
        id: b.AutoSr!,
        date: b.AssessmentDate,
        type: 'CETA Baseline',
        title: locale === 'en' ? `CETA Baseline Intake` : 'CETA ကုသမှုစတင်လက်ခံဆန်းစစ်ချက်',
        subtitle: `Score: ${b.BaselineCMFProgblemScore} · Counselor: ${b.CounselorName} · Flow: ${b.FinalFlow}`,
        notes: b.ClientBackground,
        raw: b
      })
    })

    cetaFollowups.forEach(f => {
      items.push({
        id: f.AutoSr!,
        date: f.SessionDate,
        type: 'CETA Session',
        title: locale === 'en' ? `CETA Session #${f.SessionNumber}` : `CETA ဆွေးနွေးမှု #${f.SessionNumber}`,
        subtitle: `Score: ${f.WeeklyCMFProblemScore} · Type: ${f.SessionType} · Elements: ${f.Component1Done}${f.Component2Done !== 'None' ? `, ${f.Component2Done}` : ''}`,
        notes: f.CaseNotes,
        raw: f
      })
    })

    items.sort((a, b) => b.date.localeCompare(a.date))

    return {
      timeline: items,
      rawCpssBaseline: cpssBaselines,
      rawCpssFollowup: cpssFollowups,
      rawCetaBaseline: cetaBaselines,
      rawCetaFollowup: cetaFollowups
    }
  }, [clientId, locale])

  if (!client) {
    return (
      <div>
        <Navbar title="Patient Profile" showBack backTo={portalPrefix} />
        <div className="page">
          <div className="alert alert-error">Patient file not found.</div>
        </div>
      </div>
    )
  }

  // Calculate coordinates for SVG Progress Chart (Symptom Improvement Chart)
  const renderImprovementChart = () => {
    if (!data) return null

    // Gather points. Let's merge assessment intake scores + session scores chronologically
    const cpssTrend: { date: string; val: number; label: string }[] = []
    const cetaTrend: { date: string; val: number; label: string }[] = []

    // 1. CPSS
    data.rawCpssBaseline.forEach(a => {
      cpssTrend.push({ date: a.Date, val: a.ProblemScore, label: 'Base' })
    })
    data.rawCpssFollowup.forEach(s => {
      cpssTrend.push({ date: s.FollowupDate, val: s.FollowupProblemScore, label: 'FU' })
    })

    // 2. CETA
    data.rawCetaBaseline.forEach(a => {
      cetaTrend.push({ date: a.AssessmentDate, val: a.BaselineCMFProgblemScore, label: 'Base' })
    })
    data.rawCetaFollowup.forEach(s => {
      cetaTrend.push({ date: s.SessionDate, val: s.WeeklyCMFProblemScore, label: `S${s.SessionNumber}` })
    })

    // Sort trends chronologically
    cpssTrend.sort((a, b) => a.date.localeCompare(b.date))
    cetaTrend.sort((a, b) => a.date.localeCompare(b.date))

    if (cpssTrend.length === 0 && cetaTrend.length === 0) {
      return (
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Symptom Monitoring Score Chart</h3>
          <div className="alert alert-info" style={{ margin: 0 }}>No intakes or session symptom scores logged to build progress charts.</div>
        </div>
      )
    }

    const width = 600
    const height = 240
    const paddingLeft = 35
    const paddingRight = 20
    const paddingTop = 20
    const paddingBottom = 40

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom
    const maxVal = 51 // CMF max is 51

    const getY = (score: number) => paddingTop + chartHeight - (score / maxVal) * chartHeight

    const makePath = (trend: { val: number }[]) => {
      if (trend.length === 0) return ''
      return trend.reduce((acc, p, idx) => {
        const x = paddingLeft + (idx / Math.max(1, trend.length - 1)) * chartWidth
        const y = getY(p.val)
        return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y} `
      }, '')
    }

    return (
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>
          {locale === 'en' ? 'Symptom Improvement Chart' : 'စိတ်ကျန်းမာရေးတိုးတက်မှုပြဇယား'}
        </h3>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '450px' }}>
            {/* Grid */}
            {[0, 17, 34, 51].map(v => (
              <g key={v}>
                <line x1={paddingLeft} y1={getY(v)} x2={width - paddingRight} y2={getY(v)} stroke="var(--md-sys-color-outline)" strokeDasharray="3 3" opacity="0.5" />
                <text x={paddingLeft - 8} y={getY(v) + 4} textAnchor="end" fontSize="0.75rem" fill="var(--md-sys-color-on-surface-variant)">{v}</text>
              </g>
            ))}

            {/* CPSS Line & Points */}
            <path d={makePath(cpssTrend)} fill="none" stroke="var(--md-sys-color-primary)" strokeWidth="3" strokeLinecap="round" />
            {cpssTrend.map((p, idx) => {
              const x = paddingLeft + (idx / Math.max(1, cpssTrend.length - 1)) * chartWidth
              return (
                <g key={`cpss-${idx}`}>
                  <circle cx={x} cy={getY(p.val)} r="5" fill="var(--md-sys-color-primary)" stroke="#fff" strokeWidth="1.5" />
                  <text x={x} y={getY(p.val) - 9} textAnchor="middle" fontSize="0.7rem" fontWeight="700" fill="var(--md-sys-color-primary)">{p.val}</text>
                  <text x={x} y={height - paddingBottom + 16} textAnchor="middle" fontSize="0.65rem" fill="var(--md-sys-color-on-surface-variant)">CPSS {p.label}</text>
                </g>
              )
            })}

            {/* CETA Line & Points */}
            <path d={makePath(cetaTrend)} fill="none" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
            {cetaTrend.map((p, idx) => {
              const x = paddingLeft + (idx / Math.max(1, cetaTrend.length - 1)) * chartWidth
              return (
                <g key={`ceta-${idx}`}>
                  <circle cx={x} cy={getY(p.val)} r="5" fill="#6d28d9" stroke="#fff" strokeWidth="1.5" />
                  <text x={x} y={getY(p.val) - 9} textAnchor="middle" fontSize="0.7rem" fontWeight="700" fill="#6d28d9">{p.val}</text>
                  <text x={x} y={height - paddingBottom + 30} textAnchor="middle" fontSize="0.65rem" fill="var(--md-sys-color-on-surface-variant)">CETA {p.label}</text>
                </g>
              )
            })}
          </svg>
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px', fontSize: '0.75rem' }}>
          {cpssTrend.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '6px', background: 'var(--md-sys-color-primary)' }}></span>
              <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>CPSS (Clinic Level)</span>
            </div>
          )}
          {cetaTrend.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '6px', background: '#6d28d9' }}></span>
              <span style={{ color: '#6d28d9', fontWeight: 700 }}>CETA (Counsellor Level)</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle supervisor feedback submission in CETA logs preview modal
  const handleFeedbackSubmit = async () => {
    if (!previewItem || !feedbackText.trim()) return
    try {
      if (previewItem.type === 'CETA Session') {
        const existing = await db.ceta_followups.get(previewItem.id)
        if (existing) {
          const notesWithFeedback = (existing.CaseNotes || '') + `\n\n[Supervisor Feedback]: ${feedbackText.trim()}`
          await db.ceta_followups.update(previewItem.id, { CaseNotes: notesWithFeedback })
          alert('Feedback submitted successfully!')
          setPreviewItem(prev => prev ? { ...prev, raw: { ...prev.raw, CaseNotes: notesWithFeedback } } : null)
          setFeedbackText('')
        }
      }
    } catch (err) {
      alert('Feedback submission failed.')
    }
  }

  return (
    <div>
      <Navbar title={locale === 'en' ? 'Client Details Summary' : 'လူနာကိုယ်ရေးအချက်အလက် စုစည်းမှု'} showBack backTo={portalPrefix} />
      <div className="page">

        {/* Demographics Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--md-sys-color-primary)' }}>{client.Client_Name}</h2>
              <p style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem' }}>Client ID: {client.Client_ID}</p>
            </div>
            {canWrite(user?.level ?? 0) && (
              <button 
                onClick={() => {
                  if (portalPrefix === '/clinic') {
                    navigate(`/clinic/intake?clientId=${client.Client_ID}`)
                  } else if (portalPrefix === '/supervisor') {
                    navigate(`/supervisor/ceta-plan?clientId=${client.Client_ID}`)
                  }
                }}
                className="btn btn-outline" 
                style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                ✏️ Edit Intake Profile
              </button>
            )}
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{locale === 'en' ? 'Age / Gender' : 'အသက် / ကျား၊မ'}</span>
              <span className="detail-value">{client.Client_Age} yrs / {client.Client_Gender}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{locale === 'en' ? 'Village Location' : 'ကျေးရွာ တည်နေရာ'}</span>
              <span className="detail-value">📍 {client.VillageName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{locale === 'en' ? 'Assigned Clinic' : 'သတ်မှတ်ဆေးခန်း'}</span>
              <span className="detail-value">{client.ClinicName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{locale === 'en' ? 'Registered Date' : 'မှတ်ပုံတင်သည့် ရက်စွဲ'}</span>
              <span className="detail-value">{client.Client_StartDate}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Symptom Score Chart */}
        {renderImprovementChart()}

        {/* Historical contacts timeline */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>
            {locale === 'en' ? 'Clinical Contacts Timeline' : 'ဆေးခန်းပြသမှု မှတ်တမ်းသမိုင်း'}
          </h3>
          
          {data === undefined && <div className="spinner">Loading timeline…</div>}

          {data?.timeline.length === 0 && (
            <div className="alert alert-info" style={{ margin: 0 }}>No contact records logged for this client yet.</div>
          )}

          {data?.timeline && data.timeline.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.timeline.map((item, idx) => (
                <div 
                  key={`${item.type}-${item.id}`} 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingBottom: '12px',
                    borderBottom: idx === data.timeline.length - 1 ? 'none' : '1px solid var(--md-sys-color-outline)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-blue">{item.type}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{item.date}</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{item.subtitle}</p>
                  {item.notes && <p style={{ fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--md-sys-color-surface-variant)', padding: '6px 10px', borderRadius: '6px' }}>"{item.notes.slice(0, 100)}{item.notes.length > 100 ? '...' : ''}"</p>}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                    >
                      👁️ View Details
                    </button>
                    {canWrite(user?.level ?? 0) && (
                      <button
                        onClick={() => {
                          if (item.type === 'CPSS Baseline') navigate(`/clinic/intake?clientId=${clientId}`)
                          else if (item.type === 'CPSS Followup') navigate(`/clinic/followup?autoSr=${item.id}`)
                          else if (item.type === 'CETA Baseline') navigate(`/supervisor/ceta-plan?clientId=${clientId}`)
                          else if (item.type === 'CETA Session') navigate(`/supervisor/ceta-session?autoSr=${item.id}`)
                        }}
                        className="btn btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', borderColor: 'var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface-variant)' }}
                      >
                        ✏️ Edit Entry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Preview Modal */}
        {previewItem && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '16px'
            }}
          >
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--md-sys-color-outline)', paddingBottom: '10px' }}>
                <span className="badge badge-blue">{previewItem.type} Details</span>
                <button 
                  onClick={() => { setPreviewItem(null); setFeedbackText(''); }}
                  style={{ background: 'none', border: 'none', fontSize: '1.25rem', fontWeight: 'bold', cursor: 'pointer', color: 'var(--md-sys-color-on-surface)' }}
                >
                  ✕
                </button>
              </div>

              {/* Dynamic Modal Content by Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                <div><strong>Log Date:</strong> {previewItem.date}</div>

                {previewItem.type === 'CPSS Baseline' && (
                  <>
                    <div><strong>Specialist Provider:</strong> {previewItem.raw.ProviderName}</div>
                    <div><strong>Client ID:</strong> {previewItem.raw.ClientID}</div>
                    <div><strong>Client Name:</strong> {previewItem.raw.ClientName}</div>
                    <div><strong>Age / Gender:</strong> {previewItem.raw.Age} / {previewItem.raw.Gender}</div>
                    <div><strong>Client Type:</strong> {previewItem.raw.ClientType}</div>
                    <div><strong>How Heard:</strong> {previewItem.raw.CPSSHowHear}</div>
                    <div><strong>Baseline Problem Score:</strong> {previewItem.raw.ProblemScore}</div>
                    <div><strong>Safety Flag:</strong> {previewItem.raw.Safety}</div>
                    <div><strong>Substance Use Risk:</strong> {previewItem.raw.SubstanceUse}</div>
                    <div><strong>Clinical Intake Notes:</strong></div>
                    <div style={{ background: 'var(--md-sys-color-surface-variant)', padding: '10px', borderRadius: '8px' }}>{previewItem.raw.Notes || 'None'}</div>
                    <div><strong>Followup Permission:</strong> {previewItem.raw.FollowUpPermission}</div>
                    {previewItem.raw.DenyReason && <div><strong>Decline Reason:</strong> {previewItem.raw.DenyReason}</div>}
                  </>
                )}

                {previewItem.type === 'CPSS Followup' && (
                  <>
                    <div><strong>Session ID:</strong> {previewItem.raw.SessionID}</div>
                    <div><strong>Followup Provider:</strong> {previewItem.raw.ProviderID}</div>
                    <div><strong>Final Result (Safety):</strong> {previewItem.raw.FinalResultSafety}</div>
                    {previewItem.raw.ActionTakenSafety && (
                      <>
                        <div><strong>Action Taken (Safety):</strong></div>
                        <div style={{ background: 'var(--md-sys-color-surface-variant)', padding: '10px', borderRadius: '8px' }}>{previewItem.raw.ActionTakenSafety}</div>
                      </>
                    )}
                    <div><strong>Assessment Status:</strong> {previewItem.raw.FinalResultAssess}</div>
                    <div><strong>Follow-up Problem Score:</strong> {previewItem.raw.FollowupProblemScore}</div>
                    <div><strong>Substance Use Treatment:</strong> {previewItem.raw.SUTreatment}</div>
                    <div><strong>Referred to CETA:</strong> {previewItem.raw.ReferCETA} {previewItem.raw.ReferCETA === 'Yes' && `(Date: ${previewItem.raw.ReferCETADate})`}</div>
                    {previewItem.raw.ReferCETA === 'Yes' && <div><strong>CETA Status:</strong> {previewItem.raw.CETATreatment}</div>}
                    {previewItem.raw.ReferCETA === 'No' && previewItem.raw.DenyReason && (
                      <div><strong>No CETA Reason:</strong> {previewItem.raw.DenyReason}</div>
                    )}
                  </>
                )}

                {previewItem.type === 'CETA Baseline' && (
                  <>
                    <div><strong>Counselor Name:</strong> {previewItem.raw.CounselorName}</div>
                    <div><strong>Client Name:</strong> {previewItem.raw.ClientName}</div>
                    <div><strong>Age / Gender:</strong> {previewItem.raw.Age} / {previewItem.raw.Gender}</div>
                    <div><strong>CETA Baseline Score:</strong> {previewItem.raw.BaselineCMFProgblemScore} / 45</div>
                    <div><strong>Baseline Substance Score:</strong> {previewItem.raw.BaselineCMFSU} / 8</div>
                    <div><strong>Baseline TLFB:</strong> {previewItem.raw.BaselineTLFB}</div>
                    <div><strong>High Risk:</strong> {previewItem.raw.HighRisk}</div>
                    <div><strong>Safety Plan:</strong> {previewItem.raw.SafetyPlan}</div>
                    <div><strong>Final Flow Decided:</strong> {previewItem.raw.FinalFlow}</div>
                    <div><strong>CETA Outcome:</strong> {previewItem.raw.Outcome}</div>
                    {previewItem.raw.Outcome === 'Dropout' && <div><strong>Dropout Reason:</strong> {previewItem.raw.DropoutReason}</div>}
                    <div><strong>Intake Background Notes:</strong></div>
                    <div style={{ background: 'var(--md-sys-color-surface-variant)', padding: '10px', borderRadius: '8px' }}>{previewItem.raw.ClientBackground || 'None'}</div>
                  </>
                )}

                {previewItem.type === 'CETA Session' && (
                  <>
                    <div><strong>Session ID:</strong> {previewItem.raw.SessionID}</div>
                    <div><strong>Counselor ID:</strong> {previewItem.raw.ProviderID}</div>
                    <div><strong>Session Number:</strong> #{previewItem.raw.SessionNumber}</div>
                    <div><strong>Session Type:</strong> {previewItem.raw.SessionType}</div>
                    <div><strong>Weekly CMF Problem Score:</strong> {previewItem.raw.WeeklyCMFProblemScore}</div>
                    <div><strong>Substance Score (Alcohol / Drug):</strong> {previewItem.raw.CMFSU1} / {previewItem.raw.CMFSU2}</div>
                    <div><strong>SI / HI / IPV Flags:</strong> {previewItem.raw.SI} / {previewItem.raw.HI} / {previewItem.raw.IPV}</div>
                    <div><strong>Component 1:</strong> {previewItem.raw.Component1Done} ({previewItem.raw.Component1Time} min)</div>
                    {previewItem.raw.Component2Done !== 'None' && (
                      <div><strong>Component 2:</strong> {previewItem.raw.Component2Done} ({previewItem.raw.Component2Time} min)</div>
                    )}
                    <div><strong>Total Duration:</strong> {previewItem.raw.TotalSessionDuration} minutes</div>
                    <div><strong>Case Notes:</strong></div>
                    <div style={{ background: 'var(--md-sys-color-surface-variant)', padding: '10px', borderRadius: '8px', fontStyle: 'italic' }}>
                      {previewItem.raw.CaseNotes || 'No notes.'}
                    </div>
                    {previewItem.raw.NextPlan && <div><strong>Next Session Plan:</strong> {previewItem.raw.NextPlan}</div>}

                    {/* Add Supervisor Feedback form inside CETA modal */}
                    {isSupervisor && (
                      <div style={{ marginTop: '12px', background: 'var(--md-sys-color-surface-variant)', padding: '10px', borderRadius: '8px', border: '1px solid var(--md-sys-color-outline)' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Add Supervisor Feedback Remarks</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Feedback comments..."
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', border: '1.5px solid var(--md-sys-color-outline)', borderRadius: '6px', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)' }}
                          />
                          <button
                            onClick={handleFeedbackSubmit}
                            className="btn btn-primary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button 
                onClick={() => { setPreviewItem(null); setFeedbackText(''); }}
                className="btn btn-primary btn-full"
                style={{ padding: '10px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
