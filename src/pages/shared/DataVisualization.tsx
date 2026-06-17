import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

interface DataVisualizationProps {
  tier: 'CPSS' | 'CETA'
}

export default function DataVisualization({ tier }: DataVisualizationProps) {
  const { locale } = useLanguage()

  const data = useLiveQuery(async () => {
    const focalSessions = await db.focal_point_sessions.toArray()
    const cpssBaselines = await db.cpss_baseline.toArray()
    const cpssFollowups = await db.cpss_followups.toArray()
    const cetaBaselines = await db.ceta_baseline.toArray()
    const cetaFollowups = await db.ceta_followups.toArray()

    // ── CPSS Calculations ────────────────────────────────────────────────────
    let totalFPMale = 0
    let totalFPFemale = 0
    focalSessions.forEach(s => {
      totalFPMale += s.Male || 0
      totalFPFemale += s.Female || 0
    })

    const clientTypeCounts: Record<string, number> = {
      'CVD Patient': 0,
      'Family Member': 0,
      'Community Member': 0
    }
    cpssBaselines.forEach(b => {
      if (b.ClientType in clientTypeCounts) {
        clientTypeCounts[b.ClientType]++
      } else {
        clientTypeCounts[b.ClientType] = 1
      }
    })

    // Average CPSS score by visit number
    const cpssScoreSums: Record<number, number> = {}
    const cpssScoreCounts: Record<number, number> = {}

    // Baseline is visit 0
    cpssBaselines.forEach(b => {
      cpssScoreSums[0] = (cpssScoreSums[0] || 0) + b.ProblemScore
      cpssScoreCounts[0] = (cpssScoreCounts[0] || 0) + 1
    })

    // Followups are visits 1, 2, 3...
    // Group followups by client, sort chronologically, then assign index
    const clientFollowupsMap: Record<string, any[]> = {}
    cpssFollowups.forEach(f => {
      if (!clientFollowupsMap[f.ClientID]) clientFollowupsMap[f.ClientID] = []
      clientFollowupsMap[f.ClientID].push(f)
    })

    Object.values(clientFollowupsMap).forEach(list => {
      list.sort((a, b) => a.FollowupDate.localeCompare(b.FollowupDate))
      list.forEach((f, index) => {
        const visitNum = index + 1
        if (visitNum <= 5) { // Track up to 5 followup visits
          cpssScoreSums[visitNum] = (cpssScoreSums[visitNum] || 0) + f.FollowupProblemScore
          cpssScoreCounts[visitNum] = (cpssScoreCounts[visitNum] || 0) + 1
        }
      })
    })

    const avgCPSSScores = Object.keys(cpssScoreSums).map(visit => {
      const v = Number(visit)
      return {
        visit: v,
        avg: cpssScoreCounts[v] > 0 ? Number((cpssScoreSums[v] / cpssScoreCounts[v]).toFixed(1)) : 0,
        count: cpssScoreCounts[v]
      }
    }).sort((a, b) => a.visit - b.visit)

    // ── CETA Calculations ────────────────────────────────────────────────────
    const cetaElements: Record<string, number> = {}
    cetaFollowups.forEach(s => {
      if (s.Component1Done && s.Component1Done !== 'None') {
        cetaElements[s.Component1Done] = (cetaElements[s.Component1Done] || 0) + 1
      }
      if (s.Component2Done && s.Component2Done !== 'None') {
        cetaElements[s.Component2Done] = (cetaElements[s.Component2Done] || 0) + 1
      }
    })

    const cetaOutcomes: Record<string, number> = {
      'Completed CETA': 0,
      'Dropout': 0,
      'Active': 0
    }
    cetaBaselines.forEach(b => {
      if (b.Outcome === 'Completed CETA') cetaOutcomes['Completed CETA']++
      else if (b.Outcome === 'Dropout') cetaOutcomes['Dropout']++
      else cetaOutcomes['Active']++
    })

    // Average Weekly CMF score by session number
    const cetaScoreSums: Record<number, number> = {}
    const cetaScoreCounts: Record<number, number> = {}

    // Baseline is session 0
    cetaBaselines.forEach(b => {
      cetaScoreSums[0] = (cetaScoreSums[0] || 0) + b.BaselineCMFProgblemScore
      cetaScoreCounts[0] = (cetaScoreCounts[0] || 0) + 1
    })

    cetaFollowups.forEach(s => {
      const num = s.SessionNumber
      if (num <= 8) { // Track up to 8 sessions
        cetaScoreSums[num] = (cetaScoreSums[num] || 0) + s.WeeklyCMFProblemScore
        cetaScoreCounts[num] = (cetaScoreCounts[num] || 0) + 1
      }
    })

    const avgCETAScores = Object.keys(cetaScoreSums).map(sess => {
      const s = Number(sess)
      return {
        session: s,
        avg: cetaScoreCounts[s] > 0 ? Number((cetaScoreSums[s] / cetaScoreCounts[s]).toFixed(1)) : 0,
        count: cetaScoreCounts[s]
      }
    }).sort((a, b) => a.session - b.session)

    return {
      fpmMale: totalFPMale,
      fpmFemale: totalFPFemale,
      clientTypeCounts,
      avgCPSSScores,
      cetaElements,
      cetaOutcomes,
      avgCETAScores
    }
  }, [tier])

  if (!data) return <div className="spinner">Generating visualizations…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {tier === 'CPSS' && (
        <>
          {/* CPSS Baseline vs Followup symptom drop chart */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>
              {locale === 'en' ? 'Symptom Reduction Across Clinic Followups' : 'ဆေးခန်းပြသမှု အကြိမ်ရေအလိုက် ရောဂါလက္ခဏာ သက်သာမှုပြဇယား'}
            </h3>
            {data.avgCPSSScores.length <= 1 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', padding: '16px' }}>
                {locale === 'en' ? 'Log more followup sessions to generate score progress charts.' : 'တိုးတက်မှုဇယားများပြသရန် နောက်ဆက်တွဲမှတ်တမ်းများ ဖြည့်သွင်းပါ။'}
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', minWidth: '350px' }}>
                  {/* Grid */}
                  {[0, 15, 30, 45].map(v => (
                    <g key={v}>
                      <line x1="40" y1={170 - (v/45)*140} x2="480" y2={170 - (v/45)*140} stroke="var(--md-sys-color-outline)" strokeDasharray="3 3" opacity="0.4" />
                      <text x="30" y={174 - (v/45)*140} textAnchor="end" fontSize="10" fill="var(--md-sys-color-on-surface-variant)">{v}</text>
                    </g>
                  ))}
                  {/* Path */}
                  <path
                    d={data.avgCPSSScores.reduce((acc, p, idx) => {
                      const x = 50 + (idx / (data.avgCPSSScores.length - 1)) * 410
                      const y = 170 - (p.avg / 45) * 140
                      return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y} `
                    }, '')}
                    fill="none"
                    stroke="var(--md-sys-color-primary)"
                    strokeWidth="3"
                  />
                  {data.avgCPSSScores.map((p, idx) => {
                    const x = 50 + (idx / (data.avgCPSSScores.length - 1)) * 410
                    const y = 170 - (p.avg / 45) * 140
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="var(--md-sys-color-primary)" stroke="#fff" strokeWidth="1" />
                        <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--md-sys-color-primary)">{p.avg}</text>
                        <text x={x} y="185" textAnchor="middle" fontSize="9" fill="var(--md-sys-color-on-surface-variant)">
                          {p.visit === 0 ? 'Base' : `Visit ${p.visit}`}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Focal Point Attendees */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
                {locale === 'en' ? 'Village Session Attendees' : 'ကျေးရွာဆွေးနွေးပွဲ တက်ရောက်သူများ'}
              </h4>
              {data.fpmMale === 0 && data.fpmFemale === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No village session attendance data.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>{locale === 'en' ? 'Male Attendees' : 'အမျိုးသား'}</span>
                      <span>{data.fpmMale}</span>
                    </div>
                    <div className="m3-progress-bar">
                      <div className="m3-progress-fill" style={{ width: `${(data.fpmMale / (data.fpmMale + data.fpmFemale)) * 100}%`, background: 'var(--md-sys-color-primary)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                      <span>{locale === 'en' ? 'Female Attendees' : 'အမျိုးသမီး'}</span>
                      <span>{data.fpmFemale}</span>
                    </div>
                    <div className="m3-progress-bar">
                      <div className="m3-progress-fill" style={{ width: `${(data.fpmFemale / (data.fpmMale + data.fpmFemale)) * 100}%`, background: 'var(--md-sys-color-primary)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Client types */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
                {locale === 'en' ? 'Client Demographics Breakdown' : 'လူနာအမျိုးအစား ခွဲခြားမှု'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.clientTypeCounts).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{type}</span>
                    <span className="badge badge-blue">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tier === 'CETA' && (
        <>
          {/* CETA weekly progress chart */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--md-sys-color-primary)' }}>
              {locale === 'en' ? 'Average Score Improvement by CETA Session Number' : 'CETA ဆွေးနွေးမှုအကြိမ်အလိုက် ပျမ်းမျှရမှတ်ကျဆင်းမှု'}
            </h3>
            {data.avgCETAScores.length <= 1 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', textAlign: 'center', padding: '16px' }}>
                {locale === 'en' ? 'Log CETA followup sessions to display line charts.' : 'မျဉ်းကွေးပြဇယားများပြသရန် CETA နောက်ဆက်တွဲများကို ဖြည့်သွင်းပါ။'}
              </div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', minWidth: '350px' }}>
                  {/* Grid */}
                  {[0, 15, 30, 45].map(v => (
                    <g key={v}>
                      <line x1="40" y1={170 - (v/45)*140} x2="480" y2={170 - (v/45)*140} stroke="var(--md-sys-color-outline)" strokeDasharray="3 3" opacity="0.4" />
                      <text x="30" y={174 - (v/45)*140} textAnchor="end" fontSize="10" fill="var(--md-sys-color-on-surface-variant)">{v}</text>
                    </g>
                  ))}
                  {/* Path */}
                  <path
                    d={data.avgCETAScores.reduce((acc, p, idx) => {
                      const x = 50 + (idx / (data.avgCETAScores.length - 1)) * 410
                      const y = 170 - (p.avg / 45) * 140
                      return acc + `${idx === 0 ? 'M' : 'L'} ${x} ${y} `
                    }, '')}
                    fill="none"
                    stroke="#6d28d9"
                    strokeWidth="3"
                  />
                  {data.avgCETAScores.map((p, idx) => {
                    const x = 50 + (idx / (data.avgCETAScores.length - 1)) * 410
                    const y = 170 - (p.avg / 45) * 140
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="#6d28d9" stroke="#fff" strokeWidth="1" />
                        <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#6d28d9">{p.avg}</text>
                        <text x={x} y="185" textAnchor="middle" fontSize="9" fill="var(--md-sys-color-on-surface-variant)">
                          {p.session === 0 ? 'Base' : `S${p.session}`}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* CETA Elements distribution */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
                {locale === 'en' ? 'Therapeutic Components taught counts' : 'ပို့ချပြီးစီးသည့် ကုသမှုသင်ခန်းစာများ'}
              </h4>
              {Object.keys(data.cetaElements).length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  No component data recorded.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {Object.entries(data.cetaElements).map(([el, count]) => (
                    <div key={el} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{el}</span>
                      <span className="badge badge-blue">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CETA Outcomes pie/breakdown */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--md-sys-color-on-surface)' }}>
                {locale === 'en' ? 'CETA Client Outcomes' : 'ကုသမှုရလဒ် အချိုးအစားခွဲခြားမှု'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(data.cetaOutcomes).map(([outcome, count]) => (
                  <div key={outcome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{outcome}</span>
                    <span className="badge badge-green">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
