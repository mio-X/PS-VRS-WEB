import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

export default function EditClient() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') || ''

  const villages = useLiveQuery(() => db.sys_village.toArray(), [])
  const chwamws = useLiveQuery(() => db.sys_chwamw.toArray(), [])

  const [form, setForm] = useState({
    Client_Name: '',
    Client_Age: '',
    Client_Gender: 'Female',
    Client_Phone: '',
    Client_StartDate: '',
    Village_Pcode: '',
    HW_ID: '',
    Client_Remark: '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const client = useLiveQuery(async () => {
    if (!clientId) return null
    const c = await db.clients.where('Client_ID').equals(clientId).first()
    if (c) {
      setForm({
        Client_Name: c.Client_Name,
        Client_Age: String(c.Client_Age),
        Client_Gender: c.Client_Gender,
        Client_Phone: c.Client_Phone || '',
        Client_StartDate: c.Client_StartDate,
        Village_Pcode: String(c.Village_Pcode),
        HW_ID: String(c.HW_ID),
        Client_Remark: c.Client_Remark || '',
      })
    }
    return c
  }, [clientId])

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const selectedVillage = villages?.find(v => v.Village_Pcode === Number(form.Village_Pcode))
  const selectedHW = chwamws?.find(h => h.HW_ID === Number(form.HW_ID))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!client || !client.AutoSr) { setError('Patient record not found'); return }
    if (!selectedVillage) { setError('Please select a village'); return }
    if (!selectedHW) { setError('Please select a health worker'); return }

    setSaving(true)
    setError('')
    try {
      await db.clients.update(client.AutoSr, {
        TS_Pcode: selectedVillage.TS_Pcode,
        RHC_Code: selectedVillage.RHC_Code,
        SRHC_Code: selectedVillage.SRHC_Code,
        Village_Pcode: selectedVillage.Village_Pcode,
        CHWAMW: selectedHW.CHWAMW,
        HW_ID: Number(form.HW_ID),
        Client_StartDate: form.Client_StartDate,
        Client_Name: form.Client_Name.trim(),
        Client_Age: Number(form.Client_Age),
        Client_Gender: form.Client_Gender,
        Client_Phone: form.Client_Phone.trim() || undefined,
        Client_Remark: form.Client_Remark.trim() || undefined,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (client === undefined) return <div className="spinner">Loading patient profile…</div>
  if (!client) return <div className="page"><div className="alert alert-error">Client profile not found.</div></div>

  return (
    <div>
      <Navbar title="Edit Patient Profile" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Demographics</h2>

            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" value={form.Client_Name} onChange={e => set('Client_Name', e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Age *</label>
                <input type="number" min="1" max="120" value={form.Client_Age} onChange={e => set('Client_Age', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select value={form.Client_Gender} onChange={e => set('Client_Gender', e.target.value)} required>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={form.Client_Phone} onChange={e => set('Client_Phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Registration Date *</label>
                <input type="date" value={form.Client_StartDate} onChange={e => set('Client_StartDate', e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Village *</label>
              <select value={form.Village_Pcode} onChange={e => set('Village_Pcode', e.target.value)} required>
                <option value="">– Select Village –</option>
                {villages?.map(v => (
                  <option key={v.Village_Pcode} value={v.Village_Pcode}>{v.Village}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assigned Focal Point Health Worker *</label>
              <select value={form.HW_ID} onChange={e => set('HW_ID', e.target.value)} required>
                <option value="">– Select worker –</option>
                {chwamws?.map(h => (
                  <option key={h.HW_ID} value={h.HW_ID}>{h.HW_Name} ({h.CHWAMW})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Remarks / Notes</label>
              <textarea value={form.Client_Remark} onChange={e => set('Client_Remark', e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Updating profile…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
