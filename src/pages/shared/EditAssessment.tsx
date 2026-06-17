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

export default function EditAssessment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('recordId') || ''

  const [assessmentDate, setAssessmentDate] = useState('')
  const [assessorName, setAssessorName] = useState('')
  const [phq9, setPhq9] = useState<number[]>(Array(9).fill(0))
  const [gad7, setGad7] = useState<number[]>(Array(7).fill(0))
  const [functionalImpairment, setFunctionalImpairment] = useState(0)
  const [primaryProblem, setPrimaryProblem] = useState('Depression')
  const [diagnosisNotes, setDiagnosisNotes] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const assessment = useLiveQuery(async () => {
    if (!recordId) return null
    const a = await db.assessments.get(Number(recordId))
    if (a) {
      setAssessmentDate(a.Assessment_Date)
      setAssessorName(a.Assessor_Name)
      // Since version 3/4 stores only raw scores, let's distribute the score or pre-fill with simple answers
      // To pre-fill answers if we only saved the total score: we can just allocate them.
      // Better: we can let them edit the scores directly! That is much simpler and prevents guess-allocating.
      // Wait, let's look at the IntakeAssessment form: it calculates the score from selectors.
      // If we only store PHQ9_Score, how can we load selectors?
      // In the db.ts schema, we defined:
      // `PHQ9_Score: number` and `GAD7_Score: number`.
      // We didn't save the array in indexedDB (since the db schema didn't have it).
      // So let's provide a direct numeric score input in the Edit Form, with instructions, OR
      // let them re-select (defaulting all answers to 1 or 0 and showing live total score).
      // A direct numeric score input is extremely clean, clear, and doesn't make assumptions!
      // Let's provide direct numeric inputs for PHQ-9 (0-27) and GAD-7 (0-21) in the edit form!
      // This is very robust.
    }
    return a
  }, [recordId])

  const client = useLiveQuery(async () => {
    if (!assessment) return null
    return await db.clients.where('Client_ID').equals(assessment.Client_ID).first()
  }, [assessment])

  // Direct score states (used for simple edit)
  const [rawPHQ9, setRawPHQ9] = useState('0')
  const [rawGAD7, setRawGAD7] = useState('0')

  // Sync when assessment loads
  useState(() => {
    // This runs once, but we sync in useLiveQuery
  })

  // We can sync raw scores in useLiveQuery when record loads
  useLiveQuery(async () => {
    if (!recordId) return
    const a = await db.assessments.get(Number(recordId))
    if (a) {
      setRawPHQ9(String(a.PHQ9_Score))
      setRawGAD7(String(a.GAD7_Score))
      setFunctionalImpairment(a.Functional_Impairment)
      setPrimaryProblem(a.Primary_Problem)
      setDiagnosisNotes(a.Diagnosis_Notes || '')
    }
  }, [recordId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!assessment || !assessment.AutoSr) { setError('Assessment record not found'); return }
    if (!assessorName.trim()) { setError('Assessor name is required'); return }

    setSaving(true)
    setError('')
    try {
      await db.assessments.update(assessment.AutoSr, {
        Assessment_Date: assessmentDate,
        Assessor_Name: assessorName.trim(),
        PHQ9_Score: Number(rawPHQ9),
        GAD7_Score: Number(rawGAD7),
        Functional_Impairment: functionalImpairment,
        Primary_Problem: primaryProblem,
        Diagnosis_Notes: diagnosisNotes.trim() || undefined,
      })
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (assessment === undefined) return <div className="spinner">Loading assessment details…</div>
  if (!assessment) return <div className="page"><div className="alert alert-error">Assessment record not found.</div></div>

  return (
    <div>
      <Navbar title="Edit Diagnostic Assessment" showBack />
      <div className="page">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Modify Diagnostic Intake</h2>

            <div style={{ padding: '12px 14px', background: 'var(--primary-light)', borderRadius: '10px', fontWeight: 600, color: 'var(--primary-dark)' }}>
              Patient: {client ? `${client.Client_Name} (${client.Client_ID})` : assessment.Client_ID}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Assessment Date *</label>
                <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Clinical Assessor Name *</label>
                <input type="text" value={assessorName} onChange={e => setAssessorName(e.target.value)} required />
              </div>
            </div>

            <p className="section-title">Modify Symptom Scores</p>
            <div className="form-row">
              <div className="form-group">
                <label>PHQ-9 Total Score (0-27) *</label>
                <input 
                  type="number" 
                  min="0" 
                  max="27" 
                  value={rawPHQ9} 
                  onChange={e => setRawPHQ9(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>GAD-7 Total Score (0-21) *</label>
                <input 
                  type="number" 
                  min="0" 
                  max="21" 
                  value={rawGAD7} 
                  onChange={e => setRawGAD7(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Functional Impairment (0-10) *</label>
              <select value={functionalImpairment} onChange={e => setFunctionalImpairment(Number(e.target.value))} required>
                {[...Array(11)].map((_, i) => (
                  <option key={i} value={i}>{i} – {i === 0 ? 'Not difficult' : i <= 3 ? 'Mild difficulty' : i <= 7 ? 'Moderate difficulty' : 'Severe difficulty'}</option>
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
              <textarea value={diagnosisNotes} onChange={e => setDiagnosisNotes(e.target.value)} />
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
