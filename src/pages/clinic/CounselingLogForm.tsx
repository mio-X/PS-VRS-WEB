import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function CounselingLogForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessionNumber, setSessionNumber] = useState('1')
  const [sessionType, setSessionType] = useState('Supportive Counseling')
  const [sessionNotes, setSessionNotes] = useState('')
  const [nextSessionDate, setNextSessionDate] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  // Query past sessions for this client to determine next session number
  useLiveQuery(async () => {
    if (!selectedClientId) return
    const logs = await db.counseling_logs.where('Client_ID').equals(selectedClientId).toArray()
    if (logs.length > 0) {
      const maxNum = Math.max(...logs.map(l => l.Session_Number))
      setSessionNumber(String(maxNum + 1))
    } else {
      setSessionNumber('1')
    }
  }, [selectedClientId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (!sessionNotes.trim()) { setError('Session notes are required'); return }

    setSaving(true)
    setError('')
    try {
      await db.counseling_logs.add({
        Client_ID: selectedClient.Client_ID,
        Session_Date: sessionDate,
        Session_Number: Number(sessionNumber),
        Session_Type: sessionType,
        Session_Notes: sessionNotes.trim(),
        Next_Session_Date: nextSessionDate || undefined,
      })
      navigate('/clinic')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Counseling Session Log" showBack backTo="/clinic" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Log Counseling Session</h2>

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

            {selectedClient && (
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                <div><strong>Age:</strong> {selectedClient.Client_Age}</div>
                <div><strong>Gender:</strong> {selectedClient.Client_Gender}</div>
                <div><strong>Village:</strong> {selectedClient.Client_Remark || 'N/A'}</div>
              </div>
            )}

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
                placeholder="Detail client state, progress, key interventions used, and plan for next session..." 
              />
            </div>

            <div className="form-group">
              <label>Scheduled Next Session Date</label>
              <input type="date" value={nextSessionDate} onChange={e => setNextSessionDate(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Logging Session…' : 'Save Session Log'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
