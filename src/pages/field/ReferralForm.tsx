import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function ReferralForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [referralDate, setReferralDate] = useState(new Date().toISOString().slice(0, 10))
  const [targetTier, setTargetTier] = useState('CPSS') // Default target is Clinic Level
  const [urgency, setUrgency] = useState('Routine')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (!reason.trim()) { setError('Please provide a reason for referral'); return }

    setSaving(true)
    setError('')
    try {
      await db.referrals.add({
        Client_ID: selectedClient.Client_ID,
        Source_Tier: 'Focal Point', // Since this is village portal
        Target_Tier: targetTier,
        Referral_Date: referralDate,
        Reason: reason.trim(),
        Urgency: urgency,
        Status: 'Pending',
        Outcome_Notes: notes.trim() || undefined,
      })
      navigate('/field/clients')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Outpatient Referral" showBack backTo="/field" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Send Client Referral Request</h2>

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

            <div className="form-row">
              <div className="form-group">
                <label>Referral Date *</label>
                <input type="date" value={referralDate} onChange={e => setReferralDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Target Facility / Tier *</label>
                <select value={targetTier} onChange={e => setTargetTier(e.target.value)} required>
                  <option value="CPSS">CPSS (Clinic Level)</option>
                  <option value="CETA">CETA (Counsellor Level)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Urgency Level *</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value)} required>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Crisis">Crisis / Immediate Risk</option>
              </select>
            </div>

            <div className="form-group">
              <label>Reason for Referral *</label>
              <textarea 
                value={reason} 
                onChange={e => setReason(e.target.value)} 
                required 
                placeholder="Describe key symptoms, screening scores, or behavioral issues..." 
              />
            </div>

            <div className="form-group">
              <label>Additional Notes / Direct Observations</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Include details about client's safety, home situation, or willingness to visit clinic..." 
              />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Submitting Referral…' : 'Submit Referral Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
