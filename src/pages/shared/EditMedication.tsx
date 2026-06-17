import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function EditMedication() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''

  const drugs = useLiveQuery(() => db.sys_drug.toArray(), [])

  const [prescribedDate, setPrescribedDate] = useState('')
  const [medicationName, setMedicationName] = useState('')
  const [dosage, setDosage] = useState('20mg')
  const [frequency, setFrequency] = useState('')
  const [adherenceLevel, setAdherenceLevel] = useState('High')
  const [sideEffects, setSideEffects] = useState('')
  const [prescriber, setPrescriber] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const med = useLiveQuery(async () => {
    if (!recordId) return null
    const m = await db.pharmacotherapy.get(Number(recordId))
    if (m) {
      setPrescribedDate(m.Prescribed_Date)
      setMedicationName(m.Medication_Name)
      setDosage(m.Dosage)
      setFrequency(m.Frequency)
      setAdherenceLevel(m.Adherence_Level)
      setSideEffects(m.Side_Effects || '')
      setPrescriber(m.Prescriber)
    }
    return m
  }, [recordId])

  const client = useLiveQuery(async () => {
    if (!med) return null
    return await db.clients.where('Client_ID').equals(med.Client_ID).first()
  }, [med])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!med || !med.AutoSr) { setError('Medication log not found'); return }
    if (!medicationName) { setError('Please select a medication'); return }
    if (!prescriber.trim()) { setError('Prescriber name is required'); return }

    setSaving(true)
    setError('')
    try {
      await db.pharmacotherapy.update(med.AutoSr, {
        Prescribed_Date: prescribedDate,
        Medication_Name: medicationName,
        Dosage: dosage,
        Frequency: frequency,
        Adherence_Level: adherenceLevel,
        Side_Effects: sideEffects.trim() || undefined,
        Prescriber: prescriber.trim(),
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (med === undefined) return <div className="spinner">Loading medication log…</div>
  if (!med) return <div className="page"><div className="alert alert-error">Medication log not found.</div></div>

  return (
    <div>
      <Navbar title="Edit Pharmacotherapy Log" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Medication Record</h2>

            <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Patient: {client ? `${client.Client_Name} (${client.Client_ID})` : med.Client_ID}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date Prescribed / Reviewed *</label>
                <input type="date" value={prescribedDate} onChange={e => setPrescribedDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Prescribing Physician *</label>
                <input type="text" value={prescriber} onChange={e => setPrescriber(e.target.value)} required />
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
                <input type="text" value={dosage} onChange={e => setDosage(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Frequency *</label>
                <input type="text" value={frequency} onChange={e => setFrequency(e.target.value)} required />
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
              <textarea value={sideEffects} onChange={e => setSideEffects(e.target.value)} />
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
