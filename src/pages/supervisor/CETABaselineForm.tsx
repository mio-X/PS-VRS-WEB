import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useLanguage } from '../../context/LanguageContext'

export default function CETABaselineForm() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdParam = searchParams.get('clientId')
  const referralIdParam = searchParams.get('referralId')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form states
  const [cpssRefer, setCpssRefer] = useState('No')
  const [cpssClientID, setCpssClientID] = useState('')
  const [cetaClientID, setCetaClientID] = useState('')
  const [clientID, setClientID] = useState('')
  const [clientName, setClientName] = useState('')
  const [gender, setGender] = useState('Female')
  const [age, setAge] = useState(0)
  const [clientType, setClientType] = useState('CVD Patient')
  const [clinicName, setClinicName] = useState('')
  const [villageName, setVillageName] = useState('')
  const [counselorName, setCounselorName] = useState('')
  const [clientBackground, setClientBackground] = useState('')
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [baselineCMFProblemScore, setBaselineCMFProblemScore] = useState(0)
  const [baselineCMFSU, setBaselineCMFSU] = useState(0)

  // MH1 to MH17 (0-3 scores)
  const [mhScores, setMhScores] = useState<Record<string, number>>({
    MH1: 0, MH2: 0, MH3: 0, MH4: 0, MH5: 0, MH6: 0, MH7: 0, MH8: 0, MH9: 0, MH10: 0,
    MH11: 0, MH12: 0, MH13: 0, MH14: 0, MH15: 0, MH16: 0, MH17: 0
  })

  // CDMT / TDW scores
  const [cdmtRelaxation, setCdmtRelaxation] = useState(0)
  const [cdmtActive, setCdmtActive] = useState(0)
  const [cdmtLive, setCdmtLive] = useState(0)
  const [cdmtTdm, setCdmtTdm] = useState(0)
  const [tdwGeneral, setTdwGeneral] = useState(0)
  const [cdmtSolvingProblem, setCdmtSolvingProblem] = useState(0)
  const [functioning, setFunctioning] = useState(0)
  const [baselineTLFB, setBaselineTLFB] = useState(0)

  // Safety & outcome
  const [traumasExperienced, setTraumasExperienced] = useState('No')
  const [highRisk, setHighRisk] = useState('No')
  const [safetyPlan, setSafetyPlan] = useState('No')
  const [finalFlow, setFinalFlow] = useState('Depression')
  const [outcome, setOutcome] = useState('Completed CETA')
  const [dropoutReason, setDropoutReason] = useState('')
  const [externalReferCETA, setExternalReferCETA] = useState('')

  // Load lookup options
  const lookupData = useLiveQuery(async () => {
    const clinics = await db.sys_rhc.toArray()
    const villages = await db.sys_village.toArray()
    return { clinics, villages }
  }, [])

  // Auto-generate client ID or prefill from referral
  useEffect(() => {
    if (!clientIdParam) {
      if (referralIdParam) {
        db.referrals.get(Number(referralIdParam)).then(ref => {
          if (ref) {
            setCpssRefer('Yes')
            setCpssClientID(ref.Client_ID)
            setClientID(ref.Client_ID)
            db.cpss_baseline.where('ClientID').equals(ref.Client_ID).first().then(cl => {
              if (cl) {
                setClientName(cl.ClientName)
                setAge(cl.Age)
                setGender(cl.Gender)
                setClinicName(cl.ClinicName)
                setVillageName(cl.VillageName)
                setClientType(cl.ClientType)
              }
            })
          }
        })
      } else {
        const rand = Math.floor(1000 + Math.random() * 9000)
        setCetaClientID(`CETA-CL-${rand}`)
        setClientID(`CETA-CL-${rand}`)
      }
    }
  }, [clientIdParam, referralIdParam])

  // Sync Final Client ID based on Refer state
  useEffect(() => {
    if (!clientIdParam && !referralIdParam) {
      if (cpssRefer === 'Yes') {
        setClientID(cpssClientID)
      } else {
        setClientID(cetaClientID)
      }
    }
  }, [cpssRefer, cpssClientID, cetaClientID, clientIdParam, referralIdParam])

  // Load existing details if editing
  useEffect(() => {
    if (clientIdParam) {
      db.ceta_baseline.where('ClientID').equals(clientIdParam).first().then(baseline => {
        if (baseline) {
          setCpssRefer(baseline.CPSSRefer)
          setCpssClientID(baseline.CPSSClientID || '')
          setCetaClientID(baseline.CETAClientID || '')
          setClientID(baseline.ClientID)
          setClientName(baseline.ClientName)
          setGender(baseline.Gender)
          setAge(baseline.Age)
          setClientType(baseline.ClientType)
          setClinicName(baseline.ClinicName)
          setVillageName(baseline.VillageName)
          setCounselorName(baseline.CounselorName)
          setClientBackground(baseline.ClientBackground)
          setAssessmentDate(baseline.AssessmentDate)
          setBaselineCMFProblemScore(baseline.BaselineCMFProgblemScore)
          setBaselineCMFSU(baseline.BaselineCMFSU)

          const loadedMh: Record<string, number> = {}
          for (let i = 1; i <= 17; i++) {
            const key = `MH${i}`
            loadedMh[key] = (baseline as any)[key] || 0
          }
          setMhScores(loadedMh)

          setCdmtRelaxation(baseline.CDMTRelaxation)
          setCdmtActive(baseline.CDMTActive)
          setCdmtLive(baseline.CDMTLive)
          setCdmtTdm(baseline.CDMTTDM)
          setTdwGeneral(baseline.TDWGeneral)
          setCdmtSolvingProblem(baseline.CDMTSolvingProblem)
          setFunctioning(baseline.Functioning)
          setBaselineTLFB(baseline.BaselineTLFB)

          setTraumasExperienced(baseline.TraumasExperienced)
          setHighRisk(baseline.HighRisk)
          setSafetyPlan(baseline.SafetyPlan)
          setFinalFlow(baseline.FinalFlow)
          setOutcome(baseline.Outcome)
          setDropoutReason(baseline.DropoutReason || '')
          setExternalReferCETA(baseline.ExternalReferCETA || '')
        }
      })
    }
  }, [clientIdParam])

  // Automatically calculate sum score of MH1 to MH15
  useEffect(() => {
    let sum = 0
    for (let i = 1; i <= 15; i++) {
      sum += mhScores[`MH${i}`] || 0
    }
    setBaselineCMFProblemScore(sum)
  }, [mhScores])

  const handleMhChange = (key: string, val: number) => {
    setMhScores(prev => ({
      ...prev,
      [key]: val
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!clientName || !clinicName || !villageName || !assessmentDate || !counselorName) {
      setError(locale === 'en' ? 'Please fill in all mandatory fields.' : 'လိုအပ်သော အချက်အလက်များ အားလုံး ဖြည့်သွင်းပါ။')
      setLoading(false)
      return
    }

    const payload = {
      CPSSRefer: cpssRefer,
      CPSSClientID: cpssRefer === 'Yes' ? cpssClientID : undefined,
      CETAClientID: cpssRefer === 'No' ? cetaClientID : undefined,
      ClientID: clientID,
      ClientName: clientName,
      Gender: gender,
      Age: Number(age) || 0,
      ClientType: clientType,
      ClinicName: clinicName,
      VillageName: villageName,
      CounselorName: counselorName,
      ClientBackground: clientBackground,
      AssessmentDate: assessmentDate,
      BaselineCMFProgblemScore: baselineCMFProblemScore,
      BaselineCMFSU: Number(baselineCMFSU) || 0,
      ...mhScores,
      CDMTRelaxation: Number(cdmtRelaxation) || 0,
      CDMTActive: Number(cdmtActive) || 0,
      CDMTLive: Number(cdmtLive) || 0,
      CDMTTDM: Number(cdmtTdm) || 0,
      TDWGeneral: Number(tdwGeneral) || 0,
      CDMTSolvingProblem: Number(cdmtSolvingProblem) || 0,
      Functioning: Number(functioning) || 0,
      BaselineTLFB: Number(baselineTLFB) || 0,
      TraumasExperienced: traumasExperienced,
      HighRisk: highRisk,
      SafetyPlan: safetyPlan,
      FinalFlow: finalFlow,
      Outcome: outcome,
      DropoutReason: dropoutReason,
      ExternalReferCETA: externalReferCETA,
    } as any

    try {
      const existing = await db.ceta_baseline.where('ClientID').equals(clientID).first()
      if (existing && existing.AutoSr) {
        await db.ceta_baseline.update(existing.AutoSr, payload)
      } else {
        await db.ceta_baseline.add(payload)
      }

      // Close pending referral if any
      if (referralIdParam) {
        await db.referrals.update(Number(referralIdParam), {
          Status: 'Completed',
          Outcome_Notes: 'CETA baseline Intake logged, treatment plan started.'
        })
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

  const mhQuestions = [
    { key: 'MH1', desc: 'recurring thoughts or memories about the stressful event' },
    { key: 'MH2', desc: 'felt emotionally upset when something reminded you of the event' },
    { key: 'MH3', desc: 'avoided thoughts and feelings related to past stressful events' },
    { key: 'MH4', desc: 'avoided places and activities that remind you of the event' },
    { key: 'MH5', desc: 'felt as if you were going crazy' },
    { key: 'MH6', desc: 'felt that you were the only one who has suffered these events' },
    { key: 'MH7', desc: 'felt sad or unhappy' },
    { key: 'MH8', desc: 'felt no interest in daily activities or work' },
    { key: 'MH9', desc: 'felt lonely' },
    { key: 'MH10', desc: 'felt tired, low in energy or slowed down' },
    { key: 'MH11', desc: 'worried too much about things' },
    { key: 'MH12', desc: 'been thinking too much' },
    { key: 'MH13', desc: 'felt disappointed' },
    { key: 'MH14', desc: 'felt nervousness or shakiness inside' },
    { key: 'MH15', desc: 'felt stress' },
  ]

  const mhImpairment = [
    { key: 'MH16', desc: 'difficulty doing your usual activities at home or work' },
    { key: 'MH17', desc: 'had more problems than you can handle' }
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">
          {clientIdParam 
            ? (locale === 'en' ? 'Edit CETA Baseline Intake' : 'CETA အခြေခံဆန်းစစ်မှု ပြင်ဆင်ရန်')
            : (locale === 'en' ? 'CETA Baseline Intake Form' : 'CETA ကုသမှုစတင်လက်ခံဆန်းစစ်ချက်ပုံစံ')
          }
        </h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{t('success_save')}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 className="section-title">{locale === 'en' ? 'Intake & Source Referral' : 'စတင်လက်ခံမှုနှင့် လွှဲပြောင်းရရှိသည့်နေရာ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Referred from CPSS Clinic? *' : 'CPSS ဆေးခန်းမှ လွှဲပြောင်းလာသူလား *'}</label>
            <select value={cpssRefer} onChange={e => setCpssRefer(e.target.value)} required disabled={!!referralIdParam}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          {cpssRefer === 'Yes' ? (
            <div className="form-group">
              <label>{locale === 'en' ? 'CPSS Client ID *' : 'CPSS လူနာ ID *'}</label>
              <input type="text" value={cpssClientID} onChange={e => setCpssClientID(e.target.value)} required disabled={!!referralIdParam} />
            </div>
          ) : (
            <div className="form-group">
              <label>{locale === 'en' ? 'CETA Client ID (Auto)' : 'CETA လူနာ ID'}</label>
              <input type="text" value={cetaClientID} readOnly disabled />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Final Client ID' : 'သတ်မှတ်လူနာ ID'}</label>
            <input type="text" value={clientID} readOnly disabled />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Assessment Date *' : 'ဆန်းစစ်သည့် ရက်စွဲ *'}</label>
            <input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'CETA Counselor Name *' : 'CETA ဝန်ထမ်းအမည် *'}</label>
            <input type="text" value={counselorName} onChange={e => setCounselorName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Client Full Name *' : 'လူနာအမည် *'}</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required />
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
            <label>{locale === 'en' ? 'Client Background' : 'လူနာနောက်ခံအချက်အလက်'}</label>
            <select value={clientBackground} onChange={e => setClientBackground(e.target.value)}>
              <option value="CVD Patient">CVD Patient</option>
              <option value="Family Member">Family Member</option>
              <option value="Community Member">Community Member</option>
            </select>
          </div>
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Symptom Baseline Checklist (MH.1 to MH.15)' : 'အခြေခံစိတ်ကျန်းမာရေးလက္ခဏာများ (ရက်သတ္တပတ် ၂ ပတ်အတွင်း)'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mhQuestions.map(q => (
            <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--md-sys-color-surface-variant)', borderRadius: '8px', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{q.key}. In the past week, how often have you {q.desc}?</span>
              <select 
                value={mhScores[q.key]} 
                onChange={e => handleMhChange(q.key, Number(e.target.value))}
                style={{ width: '130px', padding: '6px' }}
              >
                <option value="0">0 - None</option>
                <option value="1">1 - A little</option>
                <option value="2">2 - Most</option>
                <option value="3">3 - Almost All</option>
              </select>
            </div>
          ))}
        </div>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label>{locale === 'en' ? 'Calculated Baseline Problem Score (Max 45)' : 'တွက်ချက်ပြီး အခြေခံပြဿနာရမှတ်'}</label>
          <input type="number" value={baselineCMFProblemScore} readOnly disabled style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--md-sys-color-primary)' }} />
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Impairment Checklist (MH.16 & MH.17)' : 'ထိခိုက်မှုဆန်းစစ်ချက်များ'}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mhImpairment.map(q => (
            <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--md-sys-color-surface-variant)', borderRadius: '8px', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{q.key}. In the past week, how often have you {q.desc}?</span>
              <select 
                value={mhScores[q.key]} 
                onChange={e => handleMhChange(q.key, Number(e.target.value))}
                style={{ width: '130px', padding: '6px' }}
              >
                <option value="0">0 - None</option>
                <option value="1">1 - A little</option>
                <option value="2">2 - Most</option>
                <option value="3">3 - Almost All</option>
              </select>
            </div>
          ))}
        </div>

        <h3 className="section-title">{locale === 'en' ? 'Clinical Decisions & Treatment Design' : 'လက်တွေ့ဆုံးဖြတ်ချက်နှင့် ကုသမှုပုံစံ'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Baseline Substance Use score (0-8)' : 'အခြေခံ မူးယစ်ဆေး/အရက် ရမှတ်'}</label>
            <input type="number" min="0" max="8" value={baselineCMFSU} onChange={e => setBaselineCMFSU(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Baseline TLFB (Timeline Follow Back)' : 'အခြေခံ TLFB ရမှတ်'}</label>
            <input type="number" min="0" value={baselineTLFB} onChange={e => setBaselineTLFB(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Relaxation Component (CDMTRelaxation)' : 'Relaxation Score (0-6)'}</label>
            <input type="number" min="0" max="6" value={cdmtRelaxation} onChange={e => setCdmtRelaxation(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Getting Active Component (CDMTActive)' : 'Getting Active Score (0-12)'}</label>
            <input type="number" min="0" max="12" value={cdmtActive} onChange={e => setCdmtActive(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Live Exposure (CDMTLive)' : 'Live Exposure Score (0-3)'}</label>
            <input type="number" min="0" max="3" value={cdmtLive} onChange={e => setCdmtLive(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'TDM Score (CDMTTDM)' : 'TDM Score (0-12)'}</label>
            <input type="number" min="0" max="12" value={cdmtTdm} onChange={e => setCdmtTdm(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'TDW General Score' : 'TDW General (0-9)'}</label>
            <input type="number" min="0" max="9" value={tdwGeneral} onChange={e => setTdwGeneral(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Solving Problems Component' : 'Problem Solving Score (0-3)'}</label>
            <input type="number" min="0" max="3" value={cdmtSolvingProblem} onChange={e => setCdmtSolvingProblem(Number(e.target.value))} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Functioning Score (0-3)' : 'လုပ်ဆောင်နိုင်စွမ်းရမှတ် (၀-၃)'}</label>
            <input type="number" min="0" max="3" value={functioning} onChange={e => setFunctioning(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Traumas Experienced' : 'ကြုံတွေ့ခဲ့ရသော စိတ်ဒဏ်ရာများ'}</label>
            <select value={traumasExperienced} onChange={e => setTraumasExperienced(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'High Risk Status' : 'စိုးရိမ်ရမှုအဆင့် မြင့်မားခြင်း'}</label>
            <select value={highRisk} onChange={e => setHighRisk(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Safety Plan Done' : 'လုံခြုံရေးအစီအမံ ရေးဆွဲပြီးမှု'}</label>
            <select value={safetyPlan} onChange={e => setSafetyPlan(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{locale === 'en' ? 'Final Treatment Flow Decided' : 'သတ်မှတ်လိုက်သော ကုသမှုပုံစံ'}</label>
            <select value={finalFlow} onChange={e => setFinalFlow(e.target.value)}>
              <option value="Depression">Depression</option>
              <option value="Anxiety">Anxiety</option>
              <option value="Trauma">Trauma</option>
              <option value="Substance Use">Substance Use</option>
              <option value="Suicide Risk">Suicide Risk</option>
            </select>
          </div>
          <div className="form-group">
            <label>{locale === 'en' ? 'Client CETA Outcome' : 'ကုသမှု ရလဒ်'}</label>
            <select value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="Completed CETA">Completed CETA</option>
              <option value="Dropout">Dropout</option>
            </select>
          </div>
        </div>

        {outcome === 'Dropout' && (
          <div className="form-group">
            <label>{locale === 'en' ? 'Reason for Dropout' : 'ကုသမှု ရပ်တန့်ရသည့် အကြောင်းရင်း'}</label>
            <input type="text" value={dropoutReason} onChange={e => setDropoutReason(e.target.value)} placeholder="e.g. Moved away..." />
          </div>
        )}

        <div className="form-group">
          <label>{locale === 'en' ? 'External Referral details' : 'ပြင်ပဌာနများသို့ လွှဲပြောင်းမှုမှတ်တမ်း'}</label>
          <input type="text" value={externalReferCETA} onChange={e => setExternalReferCETA(e.target.value)} placeholder="e.g. Referred to Hospital..." />
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
