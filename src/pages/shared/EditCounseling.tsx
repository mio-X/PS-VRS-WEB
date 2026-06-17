import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function EditCounseling() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''

  const [sessionDate, setSessionDate] = useState('')
  const [sessionNumber, setSessionNumber] = useState('1')
  const [sessionType, setSessionType] = useState('Supportive Counseling')
  const [sessionNotes, setSessionNotes] = useState('')
  const [nextSessionDate, setNextSessionDate] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const log = useLiveQuery(async () => {
    if (!recordId) return null
    const l = await db.counseling_logs.get(Number(recordId))
    if (l) {
      setSessionDate(l.Session_Date)
      setSessionNumber(String(l.Session_Number))
      setSessionType(l.Session_Type)
      setSessionNotes(l.Session_Notes)
      setNextSessionDate(l.Next_Session_Date || '')
    }
    return l
  }, [recordId])

  const client = useLiveQuery(async () => {
    if (!log) return null
    return await db.clients.where('Client_ID').equals(log.Client_ID).first()
  }, [log])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!log || !log.AutoSr) { setError('Log not found'); return }
    if (!sessionNotes.trim()) { setError('Session notes are required'); return }

    setSaving(true)
    setError('')
    try {
      await db.counseling_logs.update(log.AutoSr, {
        Session_Date: sessionDate,
        Session_Number: Number(sessionNumber),
        Session_Type: sessionType,
        Session_Notes: sessionNotes.trim(),
        Next_Session_Date: nextSessionDate || undefined,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (log === undefined) return <div className="spinner">Loading log details…</div>
  if (!log) return <div className="page"><div className="alert alert-error">Log not found.</div></div>

  return (
    <div>
      <Navbar title="Edit Counseling Log" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Session Log</h2>

            <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Patient: {client ? `${client.Client_Name} (${client.Client_ID})` : log.Client_ID}
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

            <div className="form-group">
              <label>Session Type / Modality *</label>
              <select value={sessionType} onChange={e => setSessionType(e.target.value)} required>
                <option value="Psychoeducation">Psychoeducation & Coping Skills</option>
                <option value="Supportive Counseling">Supportive Counseling</option>
                <option value="Problem Solving Therapy">Problem Solving Therapy (PST)</option>
                <option value="Crisis Counseling">Crisis Counseling</option>
                <option value="CBT Session">Cognitive Behavioral (CBT) Session</option>
                <option value="Discharge Session">Discharge / Completion Session</option>
              </select>
            </div>

            <div className="form-group">
              <label>Session Clinical Notes *</label>
              <textarea 
                value={sessionNotes} 
                onChange={e => setSessionNotes(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Scheduled Next Session Date</label>
              <input type="date" value={nextSessionDate} onChange={e => setNextSessionDate(e.target.value)} />
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
