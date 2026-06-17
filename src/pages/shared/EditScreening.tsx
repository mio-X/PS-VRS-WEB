import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function EditScreening() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''

  const [screeningDate, setScreeningDate] = useState('')
  const [phq2_1, setPhq2_1] = useState(0)
  const [phq2_2, setPhq2_2] = useState(0)
  const [gad2_1, setGad2_1] = useState(0)
  const [gad2_2, setGad2_2] = useState(0)
  const [substanceUse, setSubstanceUse] = useState(false)
  const [suicideRisk, setSuicideRisk] = useState(false)
  const [notes, setNotes] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const screening = useLiveQuery(async () => {
    if (!recordId) return null
    const s = await db.screenings.get(Number(recordId))
    if (s) {
      setScreeningDate(s.Screening_Date)
      setPhq2_1(s.PHQ2_1)
      setPhq2_2(s.PHQ2_2)
      setGad2_1(s.GAD2_1)
      setGad2_2(s.GAD2_2)
      setSubstanceUse(s.Substance_Use)
      setSuicideRisk(s.Suicide_Risk)
      setNotes(s.Notes || '')
    }
    return s
  }, [recordId])

  const client = useLiveQuery(async () => {
    if (!screening) return null
    return await db.clients.where('Client_ID').equals(screening.Client_ID).first()
  }, [screening])

  const phq2Score = phq2_1 + phq2_2
  const gad2Score = gad2_1 + gad2_2
  const referralNeeded = phq2Score >= 3 || gad2Score >= 3 || substanceUse || suicideRisk

  const options = [
    { label: 'Not at all', value: 0 },
    { label: 'Several days', value: 1 },
    { label: 'More than half the days', value: 2 },
    { label: 'Nearly every day', value: 3 },
  ]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!screening || !screening.AutoSr) { setError('Screening record not found'); return }

    setSaving(true)
    setError('')
    try {
      await db.screenings.update(screening.AutoSr, {
        Screening_Date: screeningDate,
        PHQ2_1: phq2_1,
        PHQ2_2: phq2_2,
        PHQ2_Score: phq2Score,
        GAD2_1: gad2_1,
        GAD2_2: gad2_2,
        GAD2_Score: gad2Score,
        Substance_Use: substanceUse,
        Suicide_Risk: suicideRisk,
        Referral_Needed: referralNeeded,
        Notes: notes.trim() || undefined,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (screening === undefined) return <div className="spinner">Loading screening details…</div>
  if (!screening) return <div className="page"><div className="alert alert-error">Screening record not found.</div></div>

  return (
    <div>
      <Navbar title="Edit Mental Health Screening" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Screening Log</h2>
            
            <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Patient: {client ? `${client.Client_Name} (${client.Client_ID})` : screening.Client_ID}
            </div>

            <div className="form-group">
              <label>Screening Date</label>
              <input type="date" value={screeningDate} onChange={e => setScreeningDate(e.target.value)} required />
            </div>

            <p className="section-title">PHQ-2 (Depression Screening)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                  1. Little interest or pleasure in doing things over the last 2 weeks:
                </label>
                <select value={phq2_1} onChange={e => setPhq2_1(Number(e.target.value))}>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                  2. Feeling down, depressed, or hopeless over the last 2 weeks:
                </label>
                <select value={phq2_2} onChange={e => setPhq2_2(Number(e.target.value))}>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                </select>
              </div>
            </div>

            <p className="section-title">GAD-2 (Anxiety Screening)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                  1. Feeling nervous, anxious, or on edge over the last 2 weeks:
                </label>
                <select value={gad2_1} onChange={e => setGad2_1(Number(e.target.value))}>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                  2. Not being able to stop or control worrying over the last 2 weeks:
                </label>
                <select value={gad2_2} onChange={e => setGad2_2(Number(e.target.value))}>
                  {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                </select>
              </div>
            </div>

            <p className="section-title">Risk Flags & Safety Checks</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="check-label">
                <input type="checkbox" checked={substanceUse} onChange={e => setSubstanceUse(e.target.checked)} />
                <span>Substance use issues or drug/alcohol misuse risk</span>
              </label>

              <label className="check-label" style={suicideRisk ? { border: '1.5px solid var(--danger)', background: '#fff1f2' } : {}}>
                <input type="checkbox" checked={suicideRisk} onChange={e => setSuicideRisk(e.target.checked)} />
                <span style={suicideRisk ? { color: 'var(--danger)', fontWeight: 600 } : {}}>
                  Self-harm or suicide thoughts/risk
                </span>
              </label>
            </div>

            {/* Results Live Scoring Banner */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '10px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>PHQ-2 Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{phq2Score} / 6</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '10px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>GAD-2 Score</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{gad2Score} / 6</div>
                </div>
              </div>

              {referralNeeded ? (
                <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                  <strong>⚠️ Referral Recommended:</strong> Distress criteria met.
                </div>
              ) : (
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                  <strong>✅ Supportive Care:</strong> Distress level is below referral threshold.
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Additional Screening Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Saving Changes…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
