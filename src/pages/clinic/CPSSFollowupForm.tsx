import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function CPSSFollowupForm() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoSrParam = searchParams.get('autoSr')
  const clientIdParam = searchParams.get('clientId')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form states
  const [sessionID, setSessionID] = useState('')
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().slice(0, 10))
  const [clientID, setClientID] = useState('')
  const [providerID, setProviderID] = useState('')
  const [finalResultSafety, setFinalResultSafety] = useState('No current SI/HI')
  const [actionTakenSafety, setActionTakenSafety] = useState('')
  const [finalResultAssess, setFinalResultAssess] = useState('Conducted Assessment')
  const [followupProblemScore, setFollowupProblemScore] = useState(0)
  const [suTreatment, setSuTreatment] = useState('No')
  const [referOther, setReferOther] = useState('')
  const [otherService, setOtherService] = useState('')
  const [referCETA, setReferCETA] = useState('No')
  const [cetaTreatment, setCetaTreatment] = useState('')
  const [denyReason, setDenyReason] = useState('')
  const [denyDate, setDenyDate] = useState('')
  const [referCETADate, setReferCETADate] = useState('')

  // Load CPSS Clients list for selection
  const clients = useLiveQuery(async () => {
    return await db.cpss_baseline.toArray()
  }, [])

  // Auto-generate session ID if new
  useEffect(() => {
    if (!autoSrParam) {
      const rand = Math.floor(1000 + Math.random() * 9000)
      setSessionID(`CPS-FU-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${rand}`)
    }
  }, [autoSrParam])

  // Pre-fill client ID if directed from client details
  useEffect(() => {
    if (clientIdParam) {
      setClientID(clientIdParam)
    }
  }, [clientIdParam])

  // Load existing details if editing
  useEffect(() => {
    if (autoSrParam) {
      db.cpss_followups.get(Number(autoSrParam)).then(session => {
        if (session) {
          setSessionID(session.SessionID)
          setFollowupDate(session.FollowupDate)
          setClientID(session.ClientID)
          setProviderID(session.ProviderID)
          setFinalResultSafety(session.FinalResultSafety)
          setActionTakenSafety(session.ActionTakenSafety || '')
          setFinalResultAssess(session.FinalResultAssess)
          setFollowupProblemScore(session.FollowupProblemScore)
          setSuTreatment(session.SUTreatment)
          setReferOther(session.ReferOther || '')
          setOtherService(session.OtherService || '')
          setReferCETA(session.ReferCETA)
          setCetaTreatment(session.CETATreatment)
          setDenyReason(session.DenyReason || '')
          setDenyDate(session.DenyDate || '')
          setReferCETADate(session.ReferCETADate || '')
        }
      })
    }
  }, [autoSrParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!clientID || !providerID || !followupDate) {
      setError(locale === 'en' ? 'Please fill in all mandatory fields.' : 'လိုအပ်သော အချက်အလက်များ အားလုံး ဖြည့်သွင်းပါ။')
      setLoading(false)
      return
    }

    const payload = {
      SessionID: sessionID,
      FollowupDate: followupDate,
      ClientID: clientID,
      ProviderID: providerID,
      FinalResultSafety: finalResultSafety,
      ActionTakenSafety: actionTakenSafety,
      FinalResultAssess: finalResultAssess,
      FollowupProblemScore: Number(followupProblemScore) || 0,
      SUTreatment: suTreatment,
      ReferOther: referOther,
      OtherService: otherService,
      ReferCETA: referCETA,
      CETATreatment: cetaTreatment,
      DenyReason: denyReason,
      DenyDate: denyDate,
      ReferCETADate: referCETADate,
    }

    try {
      if (autoSrParam) {
        await db.cpss_followups.update(Number(autoSrParam), payload)
      } else {
        await db.cpss_followups.add(payload)

        // If referred to CETA, auto-create CETA referral request
        if (referCETA === 'Yes') {
          await db.referrals.add({
            Client_ID: clientID,
            Source_Tier: 'CPSS',
            Target_Tier: 'CETA',
            Referral_Date: referCETADate || followupDate,
            Reason: 'Referral to CETA intensive psychotherapy.',
            Urgency: 'Urgent',
            Status: 'Pending',
            Outcome_Notes: 'Auto-referred from CPSS followup log.'
          })
        }
      }
      setSuccess(true)
      setTimeout(() => navigate('/clinic'), 1000)
    } catch (err) {
      console.error(err)
      setError(t('error_save'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">
          {autoSrParam 
            ? (locale === 'en' ? 'Edit CPSS Follow-up Session' : 'CPSS နောက်ဆက်တွဲမှတ်တမ်း ပြင်ဆင်ရန်')
            : (locale === 'en' ? 'CPSS Follow-up Session Form' : 'CPSS ဆေးခန်းနောက်ဆက်တွဲ ခြေရာခံမှုပုံစံ')
          }
        </h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{t('success_save')}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 className="section-title">{locale === 'en' ? 'Session General Info' : 'အထွေထွေ အချက်အလက်များ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Session ID (Auto)' : 'ဆွေးနွေးမှု ID'}</label>
            <input type="text" value={sessionID} readOnly disabled />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Follow-up Date *' : 'နောက်ဆက်တွဲရက်စွဲ *'}</label>
            <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Select Client *' : 'လူနာ ရွေးချယ်ရန် *'}</label>
            <select value={clientID} onChange={e => setClientID(e.target.value)} required disabled={!!clientIdParam}>
              <option value="">-- Select Client --</option>
              {clients?.map(c => (
                <option key={c.ClientID} value={c.ClientID}>{c.ClientName} (ID: {c.ClientID})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Follow-up Provider ID *' : 'ဝန်ထမ်း ID / အမည် *'}</label>
            <input type="text" value={providerID} onChange={e => setProviderID(e.target.value)} required />
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Safety & Assessments Results' : 'လုံခြုံရေးနှင့် ဆန်းစစ်မှုရလဒ်များ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Final Result (Safety)' : 'လုံခြုံရေး နောက်ဆုံးရလဒ်'}</label>
            <select value={finalResultSafety} onChange={e => setFinalResultSafety(e.target.value)}>
              <option value="No current SI/HI">No current SI/HI</option>
              <option value="Has current SI">Has current SI</option>
              <option value="Has current HI">Has current HI</option>
              <option value="Has current SI and HI">Has current SI and HI</option>
              <option value="Refused follow up">Refused follow up</option>
              <option value="Could not be found/contacted">Could not be found/contacted</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Final Result (Assessment)' : 'ဆန်းစစ်မှု နောက်ဆုံးရလဒ်'}</label>
            <select value={finalResultAssess} onChange={e => setFinalResultAssess(e.target.value)}>
              <option value="Conducted Assessment">Conducted Assessment</option>
              <option value="Refused follow up">Refused follow up</option>
              <option value="Could not be found/contacted">Could not be found/contacted</option>
            </select>
          </div>
        </div>

        {(finalResultSafety.includes('SI') || finalResultSafety.includes('HI')) && (
          <div className="form-group">
            <label>{locale === 'en' ? 'Safety Actions Taken' : 'ဘေးအန္တရာယ်ကင်းရှင်းရေး ဆောင်ရွက်ချက်များ'}</label>
            <textarea value={actionTakenSafety} onChange={e => setActionTakenSafety(e.target.value)} placeholder="Detail the safety actions taken..." />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Follow-up Problem Score' : 'ဆွေးနွေးမှုပြဿနာရမှတ်'}</label>
            <input type="number" min="0" value={followupProblemScore} onChange={e => setFollowupProblemScore(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Receiving Substance Use Treatment' : 'မူးယစ်ဆေးဝါးကုသမှု ခံယူနေပါသလား'}</label>
            <select value={suTreatment} onChange={e => setSuTreatment(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="No Response">No Response</option>
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Referrals & Out-of-Clinic Services' : 'လွှဲပြောင်းမှုနှင့် အခြားဝန်ဆောင်မှုများ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Referral to other services' : 'အခြားဌာနများသို့ လွှဲပြောင်းမှု'}</label>
            <input type="text" value={referOther} onChange={e => setReferOther(e.target.value)} placeholder="e.g. Yes / No" />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Name of other services referred' : 'အခြားလွှဲပြောင်းရသည့် ဌာနအမည်'}</label>
            <input type="text" value={otherService} onChange={e => setOtherService(e.target.value)} placeholder="e.g. Red Cross Staging..." />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Referred to CETA *' : 'CETA သို့ လွှဲပြောင်းရန် *'}</label>
            <select value={referCETA} onChange={e => setReferCETA(e.target.value)} required>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {referCETA === 'Yes' && (
            <div className="form-group">
              <label>{locale === 'en' ? 'Date of Referral to CETA *' : 'CETA လွှဲပြောင်းသည့် ရက်စွဲ *'}</label>
              <input type="date" value={referCETADate} onChange={e => setReferCETADate(e.target.value)} required />
            </div>
          )}
        </div>

        {referCETA === 'Yes' && (
          <div className="form-group">
            <label>{locale === 'en' ? 'CETA Treatment Status' : 'CETA ကုသမှု အခြေအနေ'}</label>
            <select value={cetaTreatment} onChange={e => setCetaTreatment(e.target.value)}>
              <option value="">-- Choose Status --</option>
              <option value="Treatment started">Treatment started</option>
              <option value="Waitlisted">Waitlisted</option>
            </select>
          </div>
        )}

        {referCETA === 'No' && (
          <div className="form-row">
            <div className="form-group">
              <label>{locale === 'en' ? 'Reason for not referring to CETA' : 'CETA သို့ မလွှဲပြောင်းရသည့် အကြောင်းရင်း'}</label>
              <input type="text" value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="e.g. Symptoms resolved..." />
            </div>
            <div className="form-group">
              <label>{locale === 'en' ? 'Date CETA Declined' : 'CETA ငြင်းပယ်သည့် ရက်စွဲ'}</label>
              <input type="date" value={denyDate} onChange={e => setDenyDate(e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" onClick={() => navigate('/clinic')} className="btn btn-outline" style={{ flex: 1 }}>
            {locale === 'en' ? 'Cancel' : 'မလုပ်တော့ပါ'}
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
            {loading ? t('loading') : t('save')}
          </button>
        </div>
      </form>
    </div>
  )
}
