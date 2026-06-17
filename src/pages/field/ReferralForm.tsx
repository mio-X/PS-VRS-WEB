import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function ReferralForm() {
  const navigate = useNavigate()

  const [clientName, setClientName] = useState('')
  const [clientID, setClientID] = useState('')
  const [referralDate, setReferralDate] = useState(new Date().toISOString().slice(0, 10))
  const [targetTier, setTargetTier] = useState('CPSS') // Default target is Clinic Level
  const [urgency, setUrgency] = useState('Routine')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Auto-generate a clinical client ID prefix on load
  useEffect(() => {
    const rand = Math.floor(10000 + Math.random() * 90000)
    setClientID(`REF-CL-${rand}`)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) { setError('Please enter a client name'); return }
    if (!clientID.trim()) { setError('Please enter a client ID'); return }
    if (!reason.trim()) { setError('Please provide a reason for referral'); return }

    setSaving(true)
    setError('')
    try {
      await db.referrals.add({
        Client_ID: clientID.trim(),
        Client_Name: clientName.trim(),
        Source_Tier: 'Focal Point', // Since this is village portal
        Target_Tier: targetTier,
        Referral_Date: referralDate,
        Reason: reason.trim(),
        Urgency: urgency,
        Status: 'Pending',
        Outcome_Notes: notes.trim() || undefined,
      })
      navigate('/field')
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

            <div className="form-row">
              <div className="form-group">
                <label>Client Name *</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)} 
                  required 
                  placeholder="e.g. Daw Mya"
                />
              </div>
              <div className="form-group">
                <label>Client ID (Generated/Manual) *</label>
                <input 
                  type="text" 
                  value={clientID} 
                  onChange={e => setClientID(e.target.value)} 
                  required 
                />
              </div>
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
