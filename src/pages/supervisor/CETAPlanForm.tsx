import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

const CETA_ELEMENTS_OPTIONS = [
  { code: 'PE', label: 'Psychoeducation (PE)', description: 'Education on symptoms, normalisation, treatment roadmap.' },
  { code: 'CC', label: 'Cognitive Coping (CC)', description: 'Challenging and reframing negative or unhelpful thoughts.' },
  { code: 'BA', label: 'Behavioral Activation (BA)', description: 'Scheduling and engaging in pleasant or mastery activities.' },
  { code: 'E',  label: 'Exposure (E)', description: 'Gradual imaginal or in-vivo exposure for trauma and anxiety.' },
  { code: 'S',  label: 'Safety (S)', description: 'Suicide/self-harm safety planning and crisis management.' },
  { code: 'SU', label: 'Substance Use (SU)', description: 'Triggers identification, coping with cravings, substance reduction.' },
]

export default function CETAPlanForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedElements, setSelectedElements] = useState<string[]>([])
  const [status, setStatus] = useState('Active')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  // Query if there's an existing plan to load
  useLiveQuery(async () => {
    if (!selectedClientId) return
    const plan = await db.ceta_plans.where('Client_ID').equals(selectedClientId).first()
    if (plan) {
      setPlanDate(plan.Plan_Date)
      setSelectedElements(plan.CETA_Elements.split(',').map(e => e.trim()).filter(Boolean))
      setStatus(plan.Status)
    }
  }, [selectedClientId])

  const toggleElement = (code: string) => {
    if (selectedElements.includes(code)) {
      setSelectedElements(selectedElements.filter(e => e !== code))
    } else {
      setSelectedElements([...selectedElements, code])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (selectedElements.length === 0) { setError('Please select at least one CETA element'); return }

    setSaving(true)
    setError('')
    try {
      const elementsStr = selectedElements.join(',')
      // Check if plan exists
      const existing = await db.ceta_plans.where('Client_ID').equals(selectedClient.Client_ID).first()
      
      if (existing && existing.AutoSr) {
        await db.ceta_plans.update(existing.AutoSr, {
          Plan_Date: planDate,
          CETA_Elements: elementsStr,
          Status: status,
        })
      } else {
        await db.ceta_plans.add({
          Client_ID: selectedClient.Client_ID,
          Plan_Date: planDate,
          CETA_Elements: elementsStr,
          Status: status,
        })
      }

      navigate('/supervisor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="CETA Treatment Plan" showBack backTo="/supervisor" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Design Treatment Plan</h2>

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
                <label>Plan Date *</label>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Treatment Status *</label>
                <select value={status} onChange={e => setStatus(e.target.value)} required>
                  <option value="Active">Active (In counseling)</option>
                  <option value="Completed">Completed (Graduated)</option>
                  <option value="Suspended">Suspended / Dropped out</option>
                </select>
              </div>
            </div>

            <p className="section-title">Select CETA Elements to Deliver</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Tick elements relevant to the patient's presentation (anxiety, depression, trauma, substance use, etc.)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {CETA_ELEMENTS_OPTIONS.map(opt => {
                const isSelected = selectedElements.includes(opt.code)
                return (
                  <div
                    key={opt.code}
                    onClick={() => toggleElement(opt.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-light)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text)' }}>{opt.label}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.description}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving} style={{ marginTop: '16px' }}>
              {saving ? 'Saving Treatment Plan…' : 'Save Treatment Plan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
