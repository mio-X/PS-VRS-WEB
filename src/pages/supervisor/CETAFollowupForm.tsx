import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function CETAFollowupForm() {
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
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [clientID, setClientID] = useState('')
  const [providerID, setProviderID] = useState('')
  const [sessionNumber, setSessionNumber] = useState(1)
  const [sessionType, setSessionType] = useState('Individual: Complete')
  const [weeklyCMFProblemScore, setWeeklyCMFProblemScore] = useState(0)
  const [cmfSU1, setCmfSU1] = useState(0)
  const [cmfSU2, setCmfSU2] = useState(0)
  const [tlfb, setTlfb] = useState(0)
  const [si, setSi] = useState('No')
  const [hi, setHi] = useState('No')
  const [ipv, setIpv] = useState('No')
  const [safetyPlan, setSafetyPlan] = useState('No')
  const [component1Done, setComponent1Done] = useState('Psychoeducation')
  const [component1Time, setComponent1Time] = useState(0)
  const [component2Done, setComponent2Done] = useState('None')
  const [component2Time, setComponent2Time] = useState(0)
  const [totalSessionDuration, setTotalSessionDuration] = useState(0)
  const [caseNotes, setCaseNotes] = useState('')
  const [nextPlan, setNextPlan] = useState('')

  // Load CETA Clients list for selection
  const clients = useLiveQuery(async () => {
    return await db.ceta_baseline.toArray()
  }, [])

  // Auto-generate session ID if new
  useEffect(() => {
    if (!autoSrParam) {
      const rand = Math.floor(1000 + Math.random() * 9000)
      setSessionID(`CET-FU-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${rand}`)
    }
  }, [autoSrParam])

  // Pre-fill client ID if directed from client details
  useEffect(() => {
    if (clientIdParam) {
      setClientID(clientIdParam)
      // Auto-set session number based on previous session count
      db.ceta_followups.where('ClientID').equals(clientIdParam).count().then(count => {
        setSessionNumber(count + 1)
      })
    }
  }, [clientIdParam])

  // Load existing details if editing
  useEffect(() => {
    if (autoSrParam) {
      db.ceta_followups.get(Number(autoSrParam)).then(session => {
        if (session) {
          setSessionID(session.SessionID)
          setSessionDate(session.SessionDate)
          setClientID(session.ClientID)
          setProviderID(session.ProviderID)
          setSessionNumber(session.SessionNumber)
          setSessionType(session.SessionType)
          setWeeklyCMFProblemScore(session.WeeklyCMFProblemScore)
          setCmfSU1(session.CMFSU1)
          setCmfSU2(session.CMFSU2)
          setTlfb(session.TLFB)
          setSi(session.SI)
          setHi(session.HI)
          setIpv(session.IPV)
          setSafetyPlan(session.SafetyPlan)
          setComponent1Done(session.Component1Done)
          setComponent1Time(session.Component1Time)
          setComponent2Done(session.Component2Done)
          setComponent2Time(session.Component2Time)
          setTotalSessionDuration(session.TotalSessionDuration)
          setCaseNotes(session.CaseNotes || '')
          setNextPlan(session.NextPlan || '')
        }
      })
    }
  }, [autoSrParam])

  // Automatically sum up component times for total session duration
  useEffect(() => {
    setTotalSessionDuration((Number(component1Time) || 0) + (Number(component2Time) || 0))
  }, [component1Time, component2Time])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!clientID || !providerID || !sessionDate) {
      setError(locale === 'en' ? 'Please fill in all mandatory fields.' : 'လိုအပ်သော အချက်အလက်များ အားလုံး ဖြည့်သွင်းပါ။')
      setLoading(false)
      return
    }

    const payload = {
      SessionID: sessionID,
      SessionDate: sessionDate,
      ClientID: clientID,
      ProviderID: providerID,
      SessionNumber: Number(sessionNumber) || 1,
      SessionType: sessionType,
      WeeklyCMFProblemScore: Number(weeklyCMFProblemScore) || 0,
      CMFSU1: Number(cmfSU1) || 0,
      CMFSU2: Number(cmfSU2) || 0,
      TLFB: Number(tlfb) || 0,
      SI: si,
      HI: hi,
      IPV: ipv,
      SafetyPlan: safetyPlan,
      Component1Done: component1Done,
      Component1Time: Number(component1Time) || 0,
      Component2Done: component2Done,
      Component2Time: Number(component2Time) || 0,
      TotalSessionDuration: totalSessionDuration,
      CaseNotes: caseNotes,
      NextPlan: nextPlan,
    }

    try {
      if (autoSrParam) {
        await db.ceta_followups.update(Number(autoSrParam), payload)
      } else {
        await db.ceta_followups.add(payload)
      }
      setSuccess(true)
      setTimeout(() => navigate('/supervisor'), 1000)
    } catch (err) {
      console.error(err)
      setError(t('error_save'))
    } finally {
      setLoading(false)
    }
  }

  const cetaElementsList = [
    'None',
    'Encouraging Participation',
    'Psychoeducation',
    'Relaxation',
    'Behavioral Activation',
    'Cognitive Coping',
    'Trauma Narrative',
    'Gradual Exposure',
    'Live Exposure',
    'Cognitive Reprocessing',
    'Safety, violence, and substance use support',
    'Enhancing Safety',
    'Substance/Alcohol use',
    'Problem Solving',
    'Finishing'
  ]

  const sessionTypesList = [
    'Zero : Complete',
    'Zero: No Show',
    'Pre-Phone Check',
    'Individual: Complete',
    'Individual: No Show',
    'Phone: Complete',
    'Phone: No Show'
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">
          {autoSrParam 
            ? (locale === 'en' ? 'Edit CETA Therapy Session' : 'CETA ဆွေးနွေးမှုမှတ်တမ်း ပြင်ဆင်ရန်')
            : (locale === 'en' ? 'CETA Therapy Session Form' : 'CETA ဆွေးနွေးမှု ရေးသွင်းပုံစံ')
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
            <label>{locale === 'en' ? 'Session Date *' : 'ဆွေးနွေးသည့် ရက်စွဲ *'}</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required />
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
            <label>{locale === 'en' ? 'Counselor / Provider ID *' : 'Counsellor ID / အမည် *'}</label>
            <input type="text" value={providerID} onChange={e => setProviderID(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Session Number *' : 'ဆွေးနွေးမှုအကြိမ်အရေအတွက် *'}</label>
            <input type="number" min="1" value={sessionNumber} onChange={e => setSessionNumber(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Session Type *' : 'ဆွေးနွေးမှုအမျိုးအစား *'}</label>
            <select value={sessionType} onChange={e => setSessionType(e.target.value)} required>
              {sessionTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Session CMF Screening scores' : 'လက်ရှိ CMF ပြဿနာဆန်းစစ်ချက်ရမှတ်'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Weekly CMF Problem Score' : 'အပတ်စဉ် CMF ပြဿနာရမှတ်'}</label>
            <input type="number" min="0" max="45" value={weeklyCMFProblemScore} onChange={e => setWeeklyCMFProblemScore(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Timeline Follow Back (TLFB)' : 'TLFB ရမှတ်'}</label>
            <input type="number" min="0" value={tlfb} onChange={e => setTlfb(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Weekly CMF Substance Use (Alcohol)' : 'အပတ်စဉ် CMF အရက်သောက်မှုရမှတ်'}</label>
            <input type="number" min="0" max="4" value={cmfSU1} onChange={e => setCmfSU1(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Weekly CMF Substance Use (Drug)' : 'အပတ်စဉ် CMF မူးယစ်ဆေးသုံးစွဲမှုရမှတ်'}</label>
            <input type="number" min="0" max="4" value={cmfSU2} onChange={e => setCmfSU2(Number(e.target.value))} />
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Safety Flags & Interpersonal Violence' : 'လုံခြုံရေးနှင့် စိုးရိမ်ရမှု လက္ခဏာများ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Suicidal Ideation (SI)' : 'သေကြောင်းကြံစည်လိုစိတ်'}</label>
            <select value={si} onChange={e => setSi(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Homicidal Ideation (HI)' : 'အခြားသူအား ရန်ပြုလိုစိတ်'}</label>
            <select value={hi} onChange={e => setHi(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Interpersonal Violence (IPV)' : 'အကြမ်းဖက်ခံရမှု'}</label>
            <select value={ipv} onChange={e => setIpv(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Safety Plan Done' : 'လုံခြုံရေးအစီအမံ ရေးဆွဲပြီးစီးမှု'}</label>
            <select value={safetyPlan} onChange={e => setSafetyPlan(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'CETA Treatment Components Taught' : 'ပို့ချခဲ့သော CETA သင်ခန်းစာ အစိတ်အပိုင်းများ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Component 1 Taught' : 'ပထမဦးစားပေး ပို့ချသည့်သင်ခန်းစာ'}</label>
            <select value={component1Done} onChange={e => setComponent1Done(e.target.value)}>
              {cetaElementsList.map(el => (
                <option key={el} value={el}>{el}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Duration Component 1 (minutes)' : 'ပထမသင်ခန်းစာကြာချိန် (မိနစ်)'}</label>
            <input type="number" min="0" value={component1Time} onChange={e => setComponent1Time(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Component 2 Taught' : 'ဒုတိယဦးစားပေး ပို့ချသည့်သင်ခန်းစာ'}</label>
            <select value={component2Done} onChange={e => setComponent2Done(e.target.value)}>
              {cetaElementsList.map(el => (
                <option key={el} value={el}>{el}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Duration Component 2 (minutes)' : 'ဒုတိယသင်ခန်းစာကြာချိန် (မိနစ်)'}</label>
            <input type="number" min="0" value={component2Time} onChange={e => setComponent2Time(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group">
          <label>{locale === 'en' ? 'Total Session Duration (minutes)' : 'စုစုပေါင်း ဆွေးနွေးမှု ကြာချိန် (မိနစ်)'}</label>
          <input type="number" value={totalSessionDuration} readOnly disabled style={{ fontWeight: 700 }} />
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Clinical Notes' : 'လက်တွေ့ မှတ်စုများ'}</h3>
        <div className="form-group">
          <label>{locale === 'en' ? 'Case Notes / Progress details' : 'ဆွေးနွေးမှု အခြေအနေအသေးစိတ်'}</label>
          <textarea value={caseNotes} onChange={e => setCaseNotes(e.target.value)} placeholder="Detail the client's progress, response to treatment..." />
        </div>

        <div className="form-group">
          <label>{locale === 'en' ? 'Treatment plan for next session' : 'နောက်တစ်ကြိမ်ဆွေးနွေးမှုအတွက် ကုသမှုအစီအစဉ်'}</label>
          <textarea value={nextPlan} onChange={e => setNextPlan(e.target.value)} placeholder="e.g. Continue with Gradual Exposure narrative..." />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" onClick={() => navigate('/supervisor')} className="btn btn-outline" style={{ flex: 1 }}>
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
