import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching TV",
  "Moving or speaking so slowly that others have noticed? Or the opposite — being so fidgety or restless that you move around a lot more than usual",
  "Thoughts that you would be better off dead or of hurting yourself in some way"
]

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
]

function getSeverityLabel(score: number, type: 'phq' | 'gad'): { label: string; class: string } {
  if (type === 'phq') {
    if (score <= 4) return { label: 'Minimal Depression', class: 'badge-green' }
    if (score <= 9) return { label: 'Mild Depression', class: 'badge-yellow' }
    if (score <= 14) return { label: 'Moderate Depression', class: 'badge-yellow' }
    if (score <= 19) return { label: 'Moderately Severe', class: 'badge-red' }
    return { label: 'Severe Depression', class: 'badge-red' }
  } else {
    if (score <= 4) return { label: 'Minimal Anxiety', class: 'badge-green' }
    if (score <= 9) return { label: 'Mild Anxiety', class: 'badge-yellow' }
    if (score <= 14) return { label: 'Moderate Anxiety', class: 'badge-yellow' }
    return { label: 'Severe Anxiety', class: 'badge-red' }
  }
}

export default function IntakeAssessment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''
  const referralIdFromUrl = searchParams.get('referralId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [assessorName, setAssessorName] = useState('')
  
  // PHQ-9 answers (9 items, 0-3)
  const [phq9, setPhq9] = useState<number[]>(Array(9).fill(0))
  
  // GAD-7 answers (7 items, 0-3)
  const [gad7, setGad7] = useState<number[]>(Array(7).fill(0))

  const [functionalImpairment, setFunctionalImpairment] = useState(0)
  const [primaryProblem, setPrimaryProblem] = useState('Depression')
  const [diagnosisNotes, setDiagnosisNotes] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  const phq9Score = phq9.reduce((a, b) => a + b, 0)
  const gad7Score = gad7.reduce((a, b) => a + b, 0)

  const options = [
    { label: 'Not at all', value: 0 },
    { label: 'Several days', value: 1 },
    { label: 'More than half the days', value: 2 },
    { label: 'Nearly every day', value: 3 },
  ]

  const handlePHQChange = (idx: number, val: number) => {
    const next = [...phq9]
    next[idx] = val
    setPhq9(next)
  }

  const handleGADChange = (idx: number, val: number) => {
    const next = [...gad7]
    next[idx] = val
    setGad7(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (!assessorName.trim()) { setError('Assessor name is required'); return }

    setSaving(true)
    setError('')
    try {
      // 1. Add intake assessment
      await db.assessments.add({
        Client_ID: selectedClient.Client_ID,
        Assessment_Date: assessmentDate,
        Assessor_Name: assessorName.trim(),
        PHQ9_Score: phq9Score,
        GAD7_Score: gad7Score,
        Functional_Impairment: functionalImpairment,
        Primary_Problem: primaryProblem,
        Diagnosis_Notes: diagnosisNotes.trim() || undefined,
      })

      // 2. Mark corresponding referral as Completed
      if (referralIdFromUrl) {
        const refId = Number(referralIdFromUrl)
        const ref = await db.referrals.get(refId)
        if (ref) {
          await db.referrals.update(refId, {
            Status: 'Completed',
            Outcome_Notes: `Intake completed. Diagnosed: ${primaryProblem} (PHQ9: ${phq9Score}, GAD7: ${gad7Score}).`,
          })
        }
      }

      navigate('/clinic')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="Diagnostic Intake Assessment" showBack backTo="/clinic" />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Clinical Intake Form (CPSS)</h2>

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
                <label>Assessment Date *</label>
                <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Clinical Assessor Name *</label>
                <input type="text" value={assessorName} onChange={e => setAssessorName(e.target.value)} required placeholder="CPSS Worker Name" />
              </div>
            </div>

            {selectedClient && (
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                <div><strong>Age:</strong> {selectedClient.Client_Age}</div>
                <div><strong>Gender:</strong> {selectedClient.Client_Gender}</div>
                <div><strong>Focal Point:</strong> {selectedClient.CHWAMW}</div>
              </div>
            )}

            {/* PHQ-9 Evaluation */}
            <p className="section-title">PHQ-9 Questionnaire (Depression Severity)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {PHQ9_QUESTIONS.map((q, idx) => (
                <div key={idx} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                    {idx + 1}. {q}:
                  </label>
                  <select value={phq9[idx]} onChange={e => handlePHQChange(idx, Number(e.target.value))}>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* GAD-7 Evaluation */}
            <p className="section-title">GAD-7 Questionnaire (Anxiety Severity)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {GAD7_QUESTIONS.map((q, idx) => (
                <div key={idx} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text)', textTransform: 'none', fontWeight: 500, letterSpacing: 'normal' }}>
                    {idx + 1}. {q}:
                  </label>
                  <select value={gad7[idx]} onChange={e => handleGADChange(idx, Number(e.target.value))}>
                    {options.map(o => <option key={o.value} value={o.value}>{o.label} ({o.value} pts)</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Functional Impairment */}
            <p className="section-title">Functional Impairment Check</p>
            <div className="form-group">
              <label>How difficult have these problems made it for the client to do work, take care of things at home, or get along with other people? (0-10) *</label>
              <select value={functionalImpairment} onChange={e => setFunctionalImpairment(Number(e.target.value))} required>
                <option value="0">0 – Not difficult at all</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} – {i + 1 <= 3 ? 'Mild difficulty' : i + 1 <= 7 ? 'Moderate difficulty' : 'Extremely difficult'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Clinical Primary Problem *</label>
              <select value={primaryProblem} onChange={e => setPrimaryProblem(e.target.value)} required>
                <option value="Depression">Depression Symptoms</option>
                <option value="Anxiety">Anxiety Symptoms</option>
                <option value="Trauma">Trauma / PTSD Symptoms</option>
                <option value="Substance Use">Substance Misuse</option>
                <option value="Suicide Risk">Suicide / Self-Harm Risk</option>
              </select>
            </div>

            <div className="form-group">
              <label>Diagnosis Notes & Formulation</label>
              <textarea value={diagnosisNotes} onChange={e => setDiagnosisNotes(e.target.value)} placeholder="Include diagnostic thoughts, psychosocial context, client triggers..." />
            </div>

            {/* Score Summary Banners */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', flex: 1, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>PHQ-9 Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{phq9Score} / 27</div>
                  <span className={`badge ${getSeverityLabel(phq9Score, 'phq').class}`} style={{ marginTop: '4px' }}>
                    {getSeverityLabel(phq9Score, 'phq').label}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', flex: 1, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>GAD-7 Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{gad7Score} / 21</div>
                  <span className={`badge ${getSeverityLabel(gad7Score, 'gad').class}`} style={{ marginTop: '4px' }}>
                    {getSeverityLabel(gad7Score, 'gad').label}
                  </span>
                </div>
              </div>

              {(phq9Score >= 15 || gad7Score >= 15 || primaryProblem === 'Suicide Risk' || primaryProblem === 'Trauma') && (
                <div className="alert alert-info" style={{ marginTop: '8px' }}>
                  <strong>ℹ️ Clinical Recommendation:</strong> Client presents with severe symptoms or complex problem flags. Referral to **CETA Specialist** for evidence-based psychotherapy is highly recommended.
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
              {saving ? 'Saving Assessment…' : 'Save Diagnostic Intake'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
