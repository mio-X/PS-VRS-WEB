import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function CPSSBaselineForm() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdParam = searchParams.get('clientId')
  const referralIdParam = searchParams.get('referralId')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [clinicName, setClinicName] = useState('')
  const [villageName, setVillageName] = useState('')
  const [providerName, setProviderName] = useState('')
  const [clientID, setClientID] = useState('')
  const [clientName, setClientName] = useState('')
  const [age, setAge] = useState(0)
  const [gender, setGender] = useState('Female')
  const [clientType, setClientType] = useState('CVD Patient')
  const [cpssHowHear, setCpssHowHear] = useState('Friend/Family')
  const [problemScore, setProblemScore] = useState(0)
  const [safety, setSafety] = useState('None')
  const [substanceUse, setSubstanceUse] = useState('No')
  const [notes, setNotes] = useState('')
  const [followUpPermission, setFollowUpPermission] = useState('Yes')
  const [denyReason, setDenyReason] = useState('')

  // Load lookup options
  const lookupData = useLiveQuery(async () => {
    const clinics = await db.sys_rhc.toArray()
    const villages = await db.sys_village.toArray()
    return { clinics, villages }
  }, [])

  // Auto-generate client ID if new
  useEffect(() => {
    if (!clientIdParam) {
      if (referralIdParam) {
        db.referrals.get(Number(referralIdParam)).then(ref => {
          if (ref) {
            setClientID(ref.Client_ID)
            db.clients.where('Client_ID').equals(ref.Client_ID).first().then(cl => {
              if (cl) {
                setClientName(cl.Client_Name)
                setAge(cl.Client_Age)
                setGender(cl.Client_Gender === 'Male' || cl.Client_Gender === 'Female' ? cl.Client_Gender : 'Female')
              }
            })
          }
        })
      } else {
        const rand = Math.floor(1000 + Math.random() * 9000)
        setClientID(`CPSS-CL-${rand}`)
      }
    }
  }, [clientIdParam, referralIdParam])

  // Load existing details if editing
  useEffect(() => {
    if (clientIdParam) {
      db.cpss_baseline.where('ClientID').equals(clientIdParam).first().then(baseline => {
        if (baseline) {
          setDate(baseline.Date)
          setClinicName(baseline.ClinicName)
          setVillageName(baseline.VillageName)
          setProviderName(baseline.ProviderName)
          setClientID(baseline.ClientID)
          setClientName(baseline.ClientName)
          setAge(baseline.Age)
          setGender(baseline.Gender)
          setClientType(baseline.ClientType)
          setCpssHowHear(baseline.CPSSHowHear)
          setProblemScore(baseline.ProblemScore)
          setSafety(baseline.Safety)
          setSubstanceUse(baseline.SubstanceUse)
          setNotes(baseline.Notes || '')
          setFollowUpPermission(baseline.FollowUpPermission)
          setDenyReason(baseline.DenyReason || '')
        }
      })
    }
  }, [clientIdParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!clientName || !clinicName || !villageName || !date || !providerName) {
      setError(locale === 'en' ? 'Please fill in all mandatory fields.' : 'လိုအပ်သော အချက်အလက်များ အားလုံး ဖြည့်သွင်းပါ။')
      setLoading(false)
      return
    }

    const payload = {
      Date: date,
      ClinicName: clinicName,
      VillageName: villageName,
      ProviderName: providerName,
      ClientID: clientID,
      ClientName: clientName,
      Age: Number(age) || 0,
      Gender: gender,
      ClientType: clientType,
      CPSSHowHear: cpssHowHear,
      ProblemScore: Number(problemScore) || 0,
      Safety: safety,
      SubstanceUse: substanceUse,
      Notes: notes,
      FollowUpPermission: followUpPermission,
      DenyReason: denyReason,
    }

    try {
      const existing = await db.cpss_baseline.where('ClientID').equals(clientID).first()
      if (existing && existing.AutoSr) {
        await db.cpss_baseline.update(existing.AutoSr, payload)
      } else {
        await db.cpss_baseline.add(payload)
      }

      // If referred from village, close referral
      if (referralIdParam) {
        await db.referrals.update(Number(referralIdParam), {
          Status: 'Completed',
          Outcome_Notes: 'Intake assessment completed, registered in CPSS clinic.'
        })
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
          {clientIdParam 
            ? (locale === 'en' ? 'Edit CPSS Baseline Intake' : 'CPSS အခြေခံစစ်ဆေးမှု ပြင်ဆင်ရန်')
            : (locale === 'en' ? 'CPSS Baseline Intake Form' : 'CPSS ဆေးခန်းလက်ခံဆန်းစစ်မှုပုံစံ')
          }
        </h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{t('success_save')}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 className="section-title">{locale === 'en' ? 'Specialist & Site Information' : 'ဝန်ထမ်းနှင့် ဆေးခန်း အချက်အလက်'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Intake Date *' : 'ဆန်းစစ်သည့် ရက်စွဲ *'}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'CPSS Provider Name *' : 'CPSS ဝန်ထမ်းအမည် *'}</label>
            <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Clinic Name *' : 'ဆေးခန်းအမည် *'}</label>
            <select value={clinicName} onChange={e => setClinicName(e.target.value)} required>
              <option value="">-- Select Clinic --</option>
              {lookupData?.clinics.map(c => (
                <option key={c.RHC_Code} value={c.RHC_Name}>{c.RHC_Name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Village Name *' : 'ကျေးရွာအမည် *'}</label>
            <select value={villageName} onChange={e => setVillageName(e.target.value)} required>
              <option value="">-- Select Village --</option>
              {lookupData?.villages.map(v => (
                <option key={v.Village_Pcode} value={v.Village}>{v.Village}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Client Demographics' : 'လူနာ၏ ကိုယ်ရေးအချက်အလက်'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Client ID (Auto)' : 'လူနာ ID (အလိုအလျောက်)'}</label>
            <input type="text" value={clientID} readOnly disabled />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Client Full Name *' : 'လူနာအမည် *'}</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Client Age (Years) *' : 'လူနာအသက် *'}</label>
            <input type="number" min="0" value={age} onChange={e => setAge(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Gender *' : 'ကျား/မ *'}</label>
            <select value={gender} onChange={e => setGender(e.target.value)} required>
              <option value="Female">{locale === 'en' ? 'Female' : 'မ'}</option>
              <option value="Male">{locale === 'en' ? 'Male' : 'ကျား'}</option>
              <option value="Other">{locale === 'en' ? 'Other' : 'အခြား'}</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Client Type' : 'လူနာအမျိုးအစား'}</label>
            <select value={clientType} onChange={e => setClientType(e.target.value)}>
              <option value="CVD Patient">CVD Patient</option>
              <option value="Family Member">Family Member</option>
              <option value="Community Member">Community Member</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'How did client hear about CPSS?' : 'CPSS အကြောင်းကို မည်သို့သိရှိသနည်း'}</label>
            <select value={cpssHowHear} onChange={e => setCpssHowHear(e.target.value)}>
              <option value="Friend/Family">Friend/Family</option>
              <option value="Organization flyer/information/recruitment">Flyer/Information</option>
              <option value="Camp leadership">Camp Leadership</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Clinical Screening Scores' : 'လက်တွေ့ ဆန်းစစ်ချက်ရမှတ်'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Problem Score (Baseline)' : 'အခြေခံပြဿနာရမှတ်'}</label>
            <input type="number" min="0" value={problemScore} onChange={e => setProblemScore(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Substance Use Risk' : 'မူးယစ်ဆေး/အရက် သုံးစွဲမှု'}</label>
            <select value={substanceUse} onChange={e => setSubstanceUse(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="No Response">No Response</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Safety Risk Flag' : 'လုံခြုံရေးဆိုင်ရာ ဘေးအန္တရာယ်'}</label>
            <select value={safety} onChange={e => setSafety(e.target.value)}>
              <option value="None">None</option>
              <option value="SI">SI (Suicidal Ideation)</option>
              <option value="HI">HI (Homicidal Ideation)</option>
              <option value="Interpersonal Violence">Interpersonal Violence</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Permission to Follow-up' : 'ထပ်မံဆက်သွယ်ခွင့် ပြုပါသလား'}</label>
            <select value={followUpPermission} onChange={e => setFollowUpPermission(e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="No Response">No Response</option>
            </select>
          </div>
        </div>

        {followUpPermission === 'No' && (
          <div className="form-group">
            <label>{locale === 'en' ? 'Reason for Declining CPSS Follow-ups' : 'ထပ်မံဆက်သွယ်ခွင့် ငြင်းပယ်ရသည့် အကြောင်းရင်း'}</label>
            <input type="text" value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="e.g. Relocating to another area..." />
          </div>
        )}

        <div className="form-group">
          <label>{locale === 'en' ? 'Clinical Assessment Notes' : 'ဆန်းစစ်ချက် မှတ်စုများ'}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Provide additional background and notes..." />
        </div>

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
