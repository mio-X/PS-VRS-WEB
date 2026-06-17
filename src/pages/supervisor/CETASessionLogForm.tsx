import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'

const CETA_ELEMENTS_LABELS: Record<string, string> = {
  PE: 'Psychoeducation (PE)',
  CC: 'Cognitive Coping (CC)',
  BA: 'Behavioral Activation (BA)',
  E: 'Exposure (E)',
  S: 'Safety (S)',
  SU: 'Substance Use (SU)'
}

export default function CETASessionLogForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('clientId') || ''

  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessionNumber, setSessionNumber] = useState('1')
  const [deliveredElements, setDeliveredElements] = useState<string[]>([])
  const [phq9Score, setPhq9Score] = useState('')
  const [gad7Score, setGad7Score] = useState('')
  const [safetyChecked, setSafetyChecked] = useState(false)
  const [suicideRiskLevel, setSuicideRiskLevel] = useState('None')
  const [clientProgress, setClientProgress] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [notes, setNotes] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients?.find(c => c.Client_ID === selectedClientId)

  // Query past sessions and active CETA treatment plan for the client
  const clientCetaData = useLiveQuery(async () => {
    if (!selectedClientId) return null
    const plan = await db.ceta_plans.where('Client_ID').equals(selectedClientId).first()
    const sessions = await db.ceta_sessions.where('Client_ID').equals(selectedClientId).toArray()
    const assessments = await db.assessments.where('Client_ID').equals(selectedClientId).toArray()
    
    // Auto-suggest next session number
    let nextNum = '1'
    if (sessions.length > 0) {
      const maxNum = Math.max(...sessions.map(s => s.Session_Number))
      nextNum = String(maxNum + 1)
    }

    // Determine latest scores for clinical advisor
    const sortedAssessments = assessments.sort((a, b) => b.Assessment_Date.localeCompare(a.Assessment_Date))
    const sessionsWithScores = sessions.filter(s => s.PHQ9_Score !== undefined || s.GAD7_Score !== undefined)
    
    let latestPHQ9 = 0
    let latestGAD7 = 0
    let suicideRisk = 'None'
    let primaryProb = ''

    if (sessionsWithScores.length > 0) {
      const latest = sessionsWithScores[sessionsWithScores.length - 1]
      latestPHQ9 = latest.PHQ9_Score ?? 0
      latestGAD7 = latest.GAD7_Score ?? 0
      suicideRisk = latest.Suicide_Risk_Level
    } else if (sortedAssessments.length > 0) {
      const intake = sortedAssessments[0]
      latestPHQ9 = intake.PHQ9_Score
      latestGAD7 = intake.GAD7_Score
      suicideRisk = intake.Primary_Problem === 'Suicide Risk' ? 'Medium' : 'None'
      primaryProb = intake.Primary_Problem
    }

    let advisorText = '📊 STANDARD SEQUENCING: Focus on delivering Psychoeducation (PE) to build therapeutic alliance.'
    let advisorLevel = 'standard'

    if (suicideRisk === 'Medium' || suicideRisk === 'High' || suicideRisk === 'Low') {
      advisorText = '⚠️ CRITICAL SAFETY DIRECTIVE: Active suicide/self-harm risk is flagged. Immediately prioritize the Safety (S) module, construct/update the Safety Plan, and perform safety reviews.'
      advisorLevel = 'critical'
    } else if (latestPHQ9 >= 10 && latestGAD7 < 10) {
      advisorText = '📊 DEPRESSION PATHWAY SUGGESTION: Depression scores are elevated. Prioritize the Behavioral Activation (BA) element to establish pleasant and meaningful tasks.'
      advisorLevel = 'depression'
    } else if (latestGAD7 >= 10) {
      advisorText = '📊 ANXIETY/TRAUMA PATHWAY SUGGESTION: Anxiety scores are elevated. Deliver Cognitive Coping (CC) first, followed by gradual imaginal and in-vivo Exposure (E).'
      advisorLevel = 'anxiety'
    } else if (primaryProb === 'Substance Use') {
      advisorText = '📊 SUBSTANCE MISUSE FLAG: Target cravings, triggers, and substance reduction by introducing the Substance Use (SU) element.'
      advisorLevel = 'substance'
    } else if (latestPHQ9 < 5 && latestGAD7 < 5 && sessions.length >= 4) {
      advisorText = '🎉 RECOVERY BASES ACHIEVED: Symptom scores have stabilized to healthy baselines. Sequence the Discharge/Completion module and relapse prevention plan.'
      advisorLevel = 'graduation'
    }

    return {
      plan,
      assignedElements: plan ? plan.CETA_Elements.split(',').map(e => e.trim()).filter(Boolean) : [],
      nextNum,
      advisorText,
      advisorLevel
    }
  }, [selectedClientId])

  // Sync auto-suggest session number
  useEffect(() => {
    if (clientCetaData?.nextNum) {
      setSessionNumber(clientCetaData.nextNum)
    }
  }, [clientCetaData])

  const toggleElement = (code: string) => {
    if (deliveredElements.includes(code)) {
      setDeliveredElements(deliveredElements.filter(e => e !== code))
    } else {
      setDeliveredElements([...deliveredElements, code])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client'); return }
    if (deliveredElements.length === 0) { setError('Please select at least one CETA element delivered this session'); return }
    if (!clientProgress.trim()) { setError('Please describe client progress/response'); return }

    setSaving(true)
    setError('')
    try {
      await db.ceta_sessions.add({
        Client_ID: selectedClient.Client_ID,
        Session_Date: sessionDate,
        Session_Number: Number(sessionNumber),
        Elements_Delivered: deliveredElements.join(','),
        Client_Progress: clientProgress.trim(),
        PHQ9_Score: phq9Score ? Number(phq9Score) : undefined,
        GAD7_Score: gad7Score ? Number(gad7Score) : undefined,
        Safety_Checked: safetyChecked,
        Suicide_Risk_Level: suicideRiskLevel,
        Homework_Assigned: homeworkAssigned.trim() || undefined,
        Notes: notes.trim() || undefined,
      })

      navigate('/supervisor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar title="CETA Session Log" showBack backTo="/supervisor" />
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
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div><strong>Age:</strong> {selectedClient.Client_Age}</div>
                  <div><strong>Gender:</strong> {selectedClient.Client_Gender}</div>
                </div>
                <div>
                  <strong>Assigned CETA Elements:</strong>{' '}
                  {clientCetaData?.assignedElements.length
                    ? clientCetaData.assignedElements.map(e => CETA_ELEMENTS_LABELS[e] || e).join(', ')
                    : 'No treatment plan defined yet.'}
                </div>
              </div>
            )}

            {/* CETA Clinical Advisor banner */}
            {clientCetaData?.advisorText && (
              <div
                style={{
                  borderLeft: `4.5px solid ${
                    clientCetaData.advisorLevel === 'critical'
                      ? 'var(--danger)'
                      : clientCetaData.advisorLevel === 'graduation'
                      ? 'var(--success)'
                      : 'var(--primary)'
                  }`,
                  background: clientCetaData.advisorLevel === 'critical' ? '#fff1f2' : 'var(--primary-light)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  marginBottom: '16px'
                }}
              >
                <strong>🧠 CETA Flowchart Clinical Advisor:</strong>
                <p style={{ marginTop: '3px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{clientCetaData.advisorText}</p>
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

            {/* Elements checkboxes loaded from plan */}
            <p className="section-title">CETA Elements Delivered *</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {clientCetaData?.assignedElements.map(code => (
                <label key={code} className="check-label" style={deliveredElements.includes(code) ? { border: '1.5px solid var(--primary)', background: 'var(--primary-light)' } : {}}>
                  <input
                    type="checkbox"
                    checked={deliveredElements.includes(code)}
                    onChange={() => toggleElement(code)}
                  />
                  <span>{CETA_ELEMENTS_LABELS[code] || code}</span>
                </label>
              ))}
              {clientCetaData?.assignedElements.length === 0 && (
                <div className="alert alert-error">Please create a CETA Treatment Plan for this client before logging sessions.</div>
              )}
            </div>

            {/* Session Symptoms Tracking */}
            <p className="section-title">Session Symptom Severity Monitoring (Optional)</p>
            <div className="form-row">
              <div className="form-group">
                <label>PHQ-9 Score (0-27)</label>
                <input type="number" min="0" max="27" value={phq9Score} onChange={e => setPhq9Score(e.target.value)} placeholder="Leave blank if not assessed" />
              </div>
              <div className="form-group">
                <label>GAD-7 Score (0-21)</label>
                <input type="number" min="0" max="21" value={gad7Score} onChange={e => setGad7Score(e.target.value)} placeholder="Leave blank if not assessed" />
              </div>
            </div>

            {/* Safety Monitoring */}
            <p className="section-title">Safety Check & Suicidality</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="check-label">
                <input type="checkbox" checked={safetyChecked} onChange={e => setSafetyChecked(e.target.checked)} />
                <span><strong>I have conducted a safety risk assessment</strong> this session</span>
              </label>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Assessed Suicide Risk Level *</label>
                <select value={suicideRiskLevel} onChange={e => setSuicideRiskLevel(e.target.value)} required>
                  <option value="None">None (No current thoughts or intent)</option>
                  <option value="Low">Low (Passive thoughts, no plan or intent)</option>
                  <option value="Medium">Medium (Active thoughts, plan/triggers, but contracted safety)</option>
                  <option value="High">High (Immediate threat, intent or plan - execute safety plan!)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Client Response & Observations *</label>
              <textarea 
                value={clientProgress} 
                onChange={e => setClientProgress(e.target.value)} 
                required 
                placeholder="How did the client respond to the element? Describe understanding, participation, mood..." 
              />
            </div>

            <div className="form-group">
              <label>Homework / Home Practice Assigned</label>
              <textarea 
                value={homeworkAssigned} 
                onChange={e => setHomeworkAssigned(e.target.value)} 
                placeholder="What practice task was scheduled for the client to perform before the next session?" 
              />
            </div>

            <div className="form-group">
              <label>Private Clinical Notes (Confidential)</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Include supervisor remarks, clinician reflections, difficulties encountered..." 
              />
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={saving || clientCetaData?.assignedElements.length === 0}>
              {saving ? 'Saving Session Log…' : 'Save Session Record'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
