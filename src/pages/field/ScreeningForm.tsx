import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function ScreeningForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])
  
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [screeningDate, setScreeningDate] = useState(new Date().toISOString().slice(0, 10))
  
  // Question states (0 to 3 scale)
  const [phq2_1, setPhq2_1] = useState(0)
  const [phq2_2, setPhq2_2] = useState(0)
  
  const [gad2_1, setGad2_1] = useState(0)
  const [gad2_2, setGad2_2] = useState(0)
  
  const [substanceUse, setSubstanceUse] = useState(false)
  const [suicideRisk, setSuicideRisk] = useState(false)
  
  const [notes, setNotes] = useState('')
  const [autoCreateReferral, setAutoCreateReferral] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

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
    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    setSaving(true)
    setError('')
    try {
      // 1. Add screening record
      await db.screenings.add({
        Client_ID: selectedClient.Client_ID,
        Screening_Date: screeningDate,
        HW_ID: selectedClient.HW_ID,
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

      // 2. Proactively create referral if needed and requested
      if (referralNeeded && autoCreateReferral) {
        let reason = []
        if (phq2Score >= 3) reason.push('Elevated PHQ-2 score')
        if (gad2Score >= 3) reason.push('Elevated GAD-2 score')
        if (substanceUse) reason.push('Substance use risk flags')
        if (suicideRisk) reason.push('Self-harm / Suicide risk flags')

        await db.referrals.add({
          Client_ID: selectedClient.Client_ID,
          Source_Tier: 'Focal Point',
          Target_Tier: 'CPSS',
          Referral_Date: screeningDate,
          Reason: reason.join(', '),
          Urgency: suicideRisk ? 'Crisis' : 'Routine',
          Status: 'Pending',
          Outcome_Notes: 'Auto-referred from village screening.',
        })
      }

      navigate('/field/clients')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Mental Health Screening" showBack backTo="/field/clients" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Village Screening Form</h2>
            
            <div className="form-group">
              <label>Select Client *</label>
              {clientIdFromUrl ? (
                <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
                  {selectedClient ? `${selectedClient.Client_Name} (${selectedClient.Client_ID})` : 'Loading client...'}
                </div>
              ) : (
                <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} required>
                  <option value="">– Select Client –</option>
                  {clients?.map(c => (
                    <option key={c.Client_ID} value={c.Client_ID}>
                      {c.Client_Name} (ID: {c.Client_ID})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Screening Date</label>
              <input type="date" value={screeningDate} onChange={e => setScreeningDate(e.target.value)} required />
            </div>

            {selectedClient && (
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                <div><strong>Age:</strong> {selectedClient.Client_Age}</div>
                <div><strong>Gender:</strong> {selectedClient.Client_Gender}</div>
                <div><strong>Assigned Worker:</strong> {selectedClient.CHWAMW}</div>
              </div>
            )}

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
                  <strong>⚠️ Referral Recommended:</strong> Distress criteria met. Client should be referred to CPSS (Clinic Level) for diagnostic assessment.
                </div>
              ) : (
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                  <strong>✅ Supportive Care:</strong> Distress level is below referral threshold. Continue monitoring at village level.
                </div>
              )}

              {referralNeeded && (
                <label className="check-label" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)', marginBottom: '12px' }}>
                  <input type="checkbox" checked={autoCreateReferral} onChange={e => setAutoCreateReferral(e.target.checked)} />
                  <span><strong>Auto-create Referral Request</strong> to CPSS Clinic</span>
                </label>
              )}
            </div>

            <div className="form-group">
              <label>Additional Screening Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter details about client behavior, mood, context..." />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Saving Screening…' : 'Save Screening Log'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
