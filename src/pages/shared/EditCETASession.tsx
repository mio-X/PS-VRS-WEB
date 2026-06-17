import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

const CETA_ELEMENTS_LABELS: Record<string, string> = {
  PE: 'Psychoeducation (PE)',
  CC: 'Cognitive Coping (CC)',
  BA: 'Behavioral Activation (BA)',
  E: 'Exposure (E)',
  S: 'Safety (S)',
  SU: 'Substance Use (SU)'
}

export default function EditCETASession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''

  const [sessionDate, setSessionDate] = useState('')
  const [sessionNumber, setSessionNumber] = useState('1')
  const [deliveredElements, setDeliveredElements] = useState<string[]>([])
  const [phq9Score, setPhq9Score] = useState('')
  const [gad7Score, setGad7Score] = useState('')
  const [safetyChecked, setSafetyChecked] = useState(false)
  const [suicideRiskLevel, setSuicideRiskLevel] = useState('None')
  const [clientProgress, setClientProgress] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [notes, setNotes] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const session = useLiveQuery(async () => {
    if (!recordId) return null
    const s = await db.ceta_sessions.get(Number(recordId))
    if (s) {
      setSessionDate(s.Session_Date)
      setSessionNumber(String(s.Session_Number))
      setDeliveredElements(s.Elements_Delivered.split(',').map(e => e.trim()).filter(Boolean))
      setPhq9Score(s.PHQ9_Score !== undefined ? String(s.PHQ9_Score) : '')
      setGad7Score(s.GAD7_Score !== undefined ? String(s.GAD7_Score) : '')
      setSafetyChecked(s.Safety_Checked)
      setSuicideRiskLevel(s.Suicide_Risk_Level)
      setClientProgress(s.Client_Progress)
      setHomeworkAssigned(s.Homework_Assigned || '')
      setNotes(s.Notes || '')
    }
    return s
  }, [recordId])

  const client = useLiveQuery(async () => {
    if (!session) return null
    return await db.clients.where('Client_ID').equals(session.Client_ID).first()
  }, [session])

  const clientCetaData = useLiveQuery(async () => {
    if (!session) return null
    const plan = await db.ceta_plans.where('Client_ID').equals(session.Client_ID).first()
    return {
      plan,
      assignedElements: plan ? plan.CETA_Elements.split(',').map(e => e.trim()).filter(Boolean) : []
    }
  }, [session])

  const toggleElement = (code: string) => {
    if (deliveredElements.includes(code)) {
      setDeliveredElements(deliveredElements.filter(e => e !== code))
    } else {
      setDeliveredElements([...deliveredElements, code])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session || !session.AutoSr) { setError('Session not found'); return }
    if (deliveredElements.length === 0) { setError('Please select at least one CETA element delivered'); return }
    if (!clientProgress.trim()) { setError('Please describe client progress'); return }

    setSaving(true)
    setError('')
    try {
      await db.ceta_sessions.update(session.AutoSr, {
        Session_Date: sessionDate,
        Session_Number: Number(sessionNumber),
        Elements_Delivered: deliveredElements.join(','),
        Client_Progress: clientProgress.trim(),
        PHQ9_Score: phq9Score ? Number(phq9Score) : undefined,
        GAD7_Score: gad7Score ? Number(gad7Score) : undefined,
        Safety_Checked: safetyChecked,
        Suicide_Risk_Level: suicideRiskLevel,
        Homework_Assigned: homeworkAssigned.trim() || undefined,
        Notes: notes.trim() || undefined,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (session === undefined) return <div className="spinner">Loading session log…</div>
  if (!session) return <div className="page"><div className="alert alert-error">Session not found.</div></div>

  return (
    <div>
      <Navbar title="Edit CETA Session Log" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Session Log</h2>

            <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Patient: {client ? `${client.Client_Name} (${client.Client_ID})` : session.Client_ID}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Session Date *</label>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Session Number *</label>
                <input type="number" min="1" value={sessionNumber} onChange={e => setSessionNumber(e.target.value)} required />
              </div>
            </div>

            <p className="section-title">CETA Elements Delivered *</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {clientCetaData?.assignedElements.map(code => (
                <label key={code} className="check-label" style={deliveredElements.includes(code) ? { border: '1.5px solid var(--primary)', background: 'var(--primary-light)' } : {}}>
                  <input
                    type="checkbox"
                    checked={deliveredElements.includes(code)}
                    onChange={() => toggleElement(code)}
                  />
                  <span>{CETA_ELEMENTS_LABELS[code] || code}</span>
                </label>
              ))}
            </div>

            <p className="section-title">Session Symptom Severity Monitoring (Optional)</p>
            <div className="form-row">
              <div className="form-group">
                <label>PHQ-9 Score (0-27)</label>
                <input type="number" min="0" max="27" value={phq9Score} onChange={e => setPhq9Score(e.target.value)} />
              </div>
              <div className="form-group">
                <label>GAD-7 Score (0-21)</label>
                <input type="number" min="0" max="21" value={gad7Score} onChange={e => setGad7Score(e.target.value)} />
              </div>
            </div>

            <p className="section-title">Safety Check & Suicidality</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="check-label">
                <input type="checkbox" checked={safetyChecked} onChange={e => setSafetyChecked(e.target.checked)} />
                <span><strong>I have conducted a safety risk assessment</strong> this session</span>
              </label>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assessed Suicide Risk Level *</label>
                <select value={suicideRiskLevel} onChange={e => setSuicideRiskLevel(e.target.value)} required>
                  <option value="None">None (No current thoughts or intent)</option>
                  <option value="Low">Low (Passive thoughts, no plan or intent)</option>
                  <option value="Medium">Medium (Active thoughts, plan/triggers, but contracted safety)</option>
                  <option value="High">High (Immediate threat, intent or plan - execute safety plan!)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Client Response & Observations *</label>
              <textarea value={clientProgress} onChange={e => setClientProgress(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Homework / Home Practice Assigned</label>
              <textarea value={homeworkAssigned} onChange={e => setHomeworkAssigned(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Private Clinical Notes (Confidential)</label>
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
