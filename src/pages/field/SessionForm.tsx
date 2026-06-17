import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function SessionForm() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoSrParam = searchParams.get('autoSr')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form states
  const [sessionID, setSessionID] = useState('')
  const [providerName, setProviderName] = useState('')
  const [supervisorName, setSupervisorName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [villageName, setVillageName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [male, setMale] = useState(0)
  const [female, setFemale] = useState(0)
  const [peopleReviewed, setPeopleReviewed] = useState(0)
  const [people5Signs, setPeople5Signs] = useState(0)
  const [cpssNew, setCpssNew] = useState(0)
  const [cpssFollowup, setCpssFollowup] = useState(0)
  const [stressHandoutShared, setStressHandoutShared] = useState(0)
  const [changeHandoutShared, setChangeHandoutShared] = useState(0)
  const [videoShared, setVideoShared] = useState(0)
  const [feeling, setFeeling] = useState('')
  const [feeback, setFeeback] = useState('')

  // Load lookup options
  const lookupData = useLiveQuery(async () => {
    const clinics = await db.sys_rhc.toArray()
    const villages = await db.sys_village.toArray()
    return { clinics, villages }
  }, [])

  // Auto-generate session ID if new
  useEffect(() => {
    if (!autoSrParam) {
      const rand = Math.floor(1000 + Math.random() * 9000)
      setSessionID(`FP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${rand}`)
    }
  }, [autoSrParam])

  // Load existing session details for editing
  useEffect(() => {
    if (autoSrParam) {
      db.focal_point_sessions.get(Number(autoSrParam)).then(session => {
        if (session) {
          setSessionID(session.SessionID)
          setProviderName(session.ProviderName)
          setSupervisorName(session.SupervisorName)
          setClinicName(session.ClinicName)
          setVillageName(session.VillageName)
          setDate(session.Date)
          setMale(session.Male)
          setFemale(session.Female)
          setPeopleReviewed(session.PeopleReviewed)
          setPeople5Signs(session.People5Signs)
          setCpssNew(session.CPSSNew)
          setCpssFollowup(session.CPSSFollowup)
          setStressHandoutShared(session.StressHandoutShared)
          setChangeHandoutShared(session.ChangeHandoutShared)
          setVideoShared(session.VideoShared)
          setFeeling(session.Feeling || '')
          setFeeback(session.Feeback || '')
        }
      })
    }
  }, [autoSrParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!providerName || !clinicName || !villageName || !date) {
      setError(locale === 'en' ? 'Please fill in all mandatory fields.' : 'လိုအပ်သော အချက်အလက်များ အားလုံး ဖြည့်သွင်းပါ။')
      setLoading(false)
      return
    }

    const payload = {
      SessionID: sessionID,
      ProviderName: providerName,
      SupervisorName: supervisorName,
      ClinicName: clinicName,
      VillageName: villageName,
      Date: date,
      Male: Number(male) || 0,
      Female: Number(female) || 0,
      PeopleReviewed: Number(peopleReviewed) || 0,
      People5Signs: Number(people5Signs) || 0,
      CPSSNew: Number(cpssNew) || 0,
      CPSSFollowup: Number(cpssFollowup) || 0,
      StressHandoutShared: Number(stressHandoutShared) || 0,
      ChangeHandoutShared: Number(changeHandoutShared) || 0,
      VideoShared: Number(videoShared) || 0,
      Feeling: feeling,
      Feeback: feeback,
    }

    try {
      if (autoSrParam) {
        await db.focal_point_sessions.update(Number(autoSrParam), payload)
      } else {
        await db.focal_point_sessions.add(payload)
      }
      setSuccess(true)
      setTimeout(() => navigate('/field'), 1000)
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
            ? (locale === 'en' ? 'Edit Group Session Log' : 'အဖွဲ့လိုက်လုပ်ငန်းမှတ်တမ်း ပြင်ဆင်ရန်')
            : (locale === 'en' ? 'New Group Session Log' : 'အဖွဲ့လိုက်လုပ်ငန်းမှတ်တမ်းအသစ်')
          }
        </h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{t('success_save')}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Session ID (Auto)' : 'အစီအစဉ် ID (အလိုအလျောက်)'}</label>
            <input type="text" value={sessionID} readOnly disabled />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Date *' : 'ရက်စွဲ *'}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Focal Point Name *' : 'ဝန်ထမ်းအမည် *'}</label>
            <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Supervisor Name' : 'ကြီးကြပ်သူအမည်'}</label>
            <input type="text" value={supervisorName} onChange={e => setSupervisorName(e.target.value)} />
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

        <h3 className="section-title">{locale === 'en' ? 'Attendance Statistics' : 'တက်ရောက်သူ စာရင်း'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Male Attendees' : 'အမျိုးသား ဦးရေ'}</label>
            <input type="number" min="0" value={male} onChange={e => setMale(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Female Attendees' : 'အမျိုးသမီး ဦးရေ'}</label>
            <input type="number" min="0" value={female} onChange={e => setFemale(Number(e.target.value))} />
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Review & Indicators' : 'ဆန်းစစ်မှုနှင့် အညွှန်းကိန်းများ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'People Handouts Reviewed' : 'လက်ကမ်းစာစောင် ပြန်လည်ဆွေးနွေးသူ'}</label>
            <input type="number" min="0" value={peopleReviewed} onChange={e => setPeopleReviewed(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'People displaying 5 Serious Signs' : 'စိုးရိမ်ရသည့် လက္ခဏာ (၅) ရပ်ရှိသူ'}</label>
            <input type="number" min="0" value={people5Signs} onChange={e => setPeople5Signs(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'New CPSS Callers' : 'CPSS ဖုန်းခေါ်ဆိုသူသစ်'}</label>
            <input type="number" min="0" value={cpssNew} onChange={e => setCpssNew(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Follow-up CPSS Callers' : 'CPSS ထပ်မံဆက်သွယ်သူ'}</label>
            <input type="number" min="0" value={cpssFollowup} onChange={e => setCpssFollowup(Number(e.target.value))} />
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Handouts & Materials Shared' : 'ဖြန့်ဝေခဲ့သည့် လက်ကမ်းစာစောင်များ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Stress & Coping Handouts' : '"စိတ်ဖိစီးမှုဖြေလျှော့ခြင်း" လက်ကမ်းစာစောင်'}</label>
            <input type="number" min="0" value={stressHandoutShared} onChange={e => setStressHandoutShared(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Changing Unhelpful Thoughts Handouts' : '"အဆင်မပြေသော အတွေးများပြောင်းလဲခြင်း"'}</label>
            <input type="number" min="0" value={changeHandoutShared} onChange={e => setChangeHandoutShared(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group">
          <label>{locale === 'en' ? 'Videos Shared count (people)' : 'ဗီဒီယို ကြည့်ရှုသူဦးရေ'}</label>
          <input type="number" min="0" value={videoShared} onChange={e => setVideoShared(Number(e.target.value))} />
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Village/Community Qualitative Feedback' : 'ကျေးရွာ/လူထုအသိုင်းအဝိုင်းမှ တုံ့ပြန်ချက်'}</h3>
        <div className="form-group">
          <label>{locale === 'en' ? 'General Village stress level / How stress is expressed?' : 'ကျေးရွာအတွင်း ယေဘုယျ စိတ်ဖိစီးမှုအဆင့်နှင့် စိတ်ကျပ်တည်းမှု ဖော်ပြပုံများ'}</label>
          <textarea value={feeling} onChange={e => setFeeling(e.target.value)} placeholder="e.g. Higher stress due to seasonal changes..." />
        </div>

        <div className="form-group">
          <label>{locale === 'en' ? 'Questions about support materials / needed system changes' : 'အကူအညီပေးရေးပစ္စည်းများနှင့် ပတ်သက်သည့် မေးခွန်းများ သို့မဟုတ် လိုအပ်သောစနစ်အပြောင်းအလဲများ'}</label>
          <textarea value={feeback} onChange={e => setFeeback(e.target.value)} placeholder="e.g. Need more copies of unhelpful thoughts brochures..." />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="button" onClick={() => navigate('/field')} className="btn btn-outline" style={{ flex: 1 }}>
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
