import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function PharmacotherapyForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const drugs = useLiveQuery(() => db.sys_drug.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [prescribedDate, setPrescribedDate] = useState(new Date().toISOString().slice(0, 10))
  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('20mg')
  const [frequency, setFrequency] = useState('Once daily (morning)')
  const [adherenceLevel, setAdherenceLevel] = useState('High')
  const [sideEffects, setSideEffects] = useState('')
  const [prescriber, setPrescriber] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (!medicationName) { setError('Please select a medication'); return }
    if (!prescriber.trim()) { setError('Prescriber name is required'); return }

    setSaving(true)
    setError('')
    try {
      await db.pharmacotherapy.add({
        Client_ID: selectedClient.Client_ID,
        Prescribed_Date: prescribedDate,
        Medication_Name: medicationName,
        Dosage: dosage,
        Frequency: frequency,
        Adherence_Level: adherenceLevel,
        Side_Effects: sideEffects.trim() || undefined,
        Prescriber: prescriber.trim(),
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
      <Navbar title="Pharmacotherapy Coordination" showBack backTo="/clinic" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Log Medication coordination</h2>

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
                <label>Date Prescribed / Reviewed *</label>
                <input type="date" value={prescribedDate} onChange={e => setPrescribedDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Prescribing Physician *</label>
                <input type="text" value={prescriber} onChange={e => setPrescriber(e.target.value)} required placeholder="MD / Psychiatrist Name" />
              </div>
            </div>

            <div className="form-group">
              <label>Medication Name *</label>
              <select value={medicationName} onChange={e => setMedicationName(e.target.value)} required>
                <option value="">– Select Medication –</option>
                {drugs?.map(d => (
                  <option key={d.DrugID} value={d.DrugDesp}>{d.DrugDesp}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dosage *</label>
                <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} required placeholder="e.g. 20mg, 50mg" />
              </div>
              <div className="form-group">
                <label>Frequency *</label>
                <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)} required placeholder="e.g. Once daily, twice daily" />
              </div>
            </div>

            <div className="form-group">
              <label>Adherence Level *</label>
              <select value={adherenceLevel} onChange={e => setAdherenceLevel(e.target.value)} required>
                <option value="High">High (Takes as directed, misses rarely)</option>
                <option value="Medium">Medium (Takes mostly, misses occasionally)</option>
                <option value="Low">Low (Frequently misses, or stopped medication)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Observed Side Effects</label>
              <textarea 
                value={sideEffects} 
                onChange={e => setSideEffects(e.target.value)} 
                placeholder="Include details on sleep issues, nausea, headaches, tremors, lethargy..." 
              />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Logging medication…' : 'Save Medication Log'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
