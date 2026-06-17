import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Locale = 'en' | 'my'

type Dictionary = Record<string, string>

const TRANSLATIONS: Record<Locale, Dictionary> = {
  en: {
    // General / Navbar
    'app_name': 'Mindvibe',
    'logout': 'Logout',
    'back': 'Back',
    'save': 'Save',
    'loading': 'Loading...',
    'success_save': 'Saved successfully!',
    'error_save': 'Failed to save.',
    
    // Login Screen
    'sign_in': 'Sign In',
    'username': 'Username',
    'password': 'Password',
    'signing_in': 'Signing in...',
    'logins_hint': 'Clinical Portals logins:',
    'community_services': 'Community Mental Health Services',
    
    // Focal Point Dashboard
    'focal_point_title': 'Focal Point Portal (Village Level)',
    'hello': 'Hello',
    'client_registry': 'Client Registry',
    'new_screening': 'New Screening',
    'send_referral': 'Send Referral',
    'quick_guide': 'Focal Point Quick Guide',
    'guide_desc': '1. **Register Client:** Click **Client Registry** to add a new villager profile.\n2. **Screen Client:** Use the **New Screening** form to conduct PHQ-2 and GAD-2 evaluations.\n3. **Refer Client:** If distress flags are highlighted, submit a **Send Referral** request to connect the patient with CPSS specialty care.',

    // Client registry form
    'register_patient': 'Register New Patient',
    'fullname': 'Full Name *',
    'age': 'Age *',
    'gender': 'Gender *',
    'phone': 'Phone Number',
    'reg_date': 'Registration Date *',
    'village': 'Village *',
    'assigned_hw': 'Assigned Focal Point Health Worker *',
    'remarks': 'Remarks / Notes',
    'saving_patient': 'Saving Patient...',
    'save_profile': 'Save Patient Profile',
    'female': 'Female',
    'male': 'Male',
    'other': 'Other',

    // Screening Form
    'screening_form': 'Village Screening Form',
    'phq2_title': 'PHQ-2 (Depression Screening)',
    'gad2_title': 'GAD-2 (Anxiety Screening)',
    'phq2_q1': '1. Little interest or pleasure in doing things over the last 2 weeks:',
    'phq2_q2': '2. Feeling down, depressed, or hopeless over the last 2 weeks:',
    'gad2_q1': '1. Feeling nervous, anxious, or on edge over the last 2 weeks:',
    'gad2_q2': '2. Not being able to stop or control worrying over the last 2 weeks:',
    'risk_flags_title': 'Risk Flags & Safety Checks',
    'substance_flag': 'Substance use issues or drug/alcohol misuse risk',
    'suicide_flag': 'Self-harm or suicide thoughts/risk',
    'phq2_score': 'PHQ-2 Score',
    'gad2_score': 'GAD-2 Score',
    'recommend_ref': 'Referral Recommended: Distress criteria met. Client should be referred to CPSS (Clinic Level) for diagnostic assessment.',
    'recommend_support': 'Supportive Care: Distress level is below referral threshold. Continue monitoring at village level.',
    'auto_create_ref': 'Auto-create Referral Request to CPSS Clinic',
    'screening_notes': 'Additional Screening Notes',
    'saving_screening': 'Saving Screening...',
    'save_screening': 'Save Screening Log',
  },
  my: {
    // General / Navbar
    'app_name': 'Mindvibe (မိုင်းဗိုက်)',
    'logout': 'ထွက်ရန်',
    'back': 'နောက်သို့',
    'save': 'သိမ်းဆည်းရန်',
    'loading': 'စောင့်ဆိုင်းနေသည်...',
    'success_save': 'အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!',
    'error_save': 'သိမ်းဆည်းရန် မအောင်မြင်ပါ။',

    // Login Screen
    'sign_in': 'ဝင်ရောက်ရန်',
    'username': 'အသုံးပြုသူအမည်',
    'password': 'စကားဝှက်',
    'signing_in': 'ဝင်ရောက်နေသည်...',
    'logins_hint': 'လက်တွေ့ စမ်းသပ်ဝင်ရောက်ရန် အကောင့်များ -',
    'community_services': 'လူထု စိတ်ကျန်းမာရေး စောင့်ရှောက်မှု လုပ်ငန်းများ',

    // Focal Point Dashboard
    'focal_point_title': 'ကျေးရွာအဆင့် စိတ်ကျန်းမာရေး ညှိနှိုင်းရေးမှူး ကဏ္ဍ',
    'hello': 'မင်္ဂလာပါ',
    'client_registry': 'လူနာ မှတ်ပုံတင်စာရင်း',
    'new_screening': 'စစ်ဆေးမှုအသစ် ပြုလုပ်ရန်',
    'send_referral': 'လွှဲပြောင်းမှု တောင်းဆိုရန်',
    'quick_guide': 'လမ်းညွှန်ချက်တို',
    'guide_desc': '၁။ **လူနာမှတ်ပုံတင်ခြင်း** - လူနာသစ် စာရင်းသွင်းရန် **လူနာ မှတ်ပုံတင်စာရင်း** ကို နှိပ်ပါ။\n၂။ **စိတ်ကျန်းမာရေး စစ်ဆေးခြင်း** - PHQ-2 နှင့် GAD-2 စစ်ဆေးမှုများ ပြုလုပ်ရန် **စစ်ဆေးမှုအသစ် ပြုလုပ်ရန်** ကို အသုံးပြုပါ။\n၃။ **လူနာလွှဲပြောင်းခြင်း** - စိုးရိမ်ရသော လက္ခဏာများ တွေ့ရှိပါက ဆေးခန်းအဆင့် (CPSS) သို့ လွှဲပြောင်းရန် **လွှဲပြောင်းမှု တောင်းဆိုရန်** ကို နှိပ်ပါ။',

    // Client registry form
    'register_patient': 'လူနာသစ် မှတ်ပုံတင်ရန်',
    'fullname': 'အမည်အပြည့်အစုံ *',
    'age': 'အသက် *',
    'gender': 'ကျား/မ *',
    'phone': 'ဖုန်းနံပါတ်',
    'reg_date': 'မှတ်ပုံတင်သည့် ရက်စွဲ *',
    'village': 'ကျေးရွာ *',
    'assigned_hw': 'တာဝန်ခံ ကျန်းမာရေးဝန်ထမ်း *',
    'remarks': 'မှတ်စု / မှတ်ချက်များ',
    'saving_patient': 'သိမ်းဆည်းနေသည်...',
    'save_profile': 'လူနာကိုယ်ရေးအချက်အလက် သိမ်းဆည်းရန်',
    'female': 'မ',
    'male': 'ကျား',
    'other': 'အခြား',

    // Screening Form
    'screening_form': 'ကျေးရွာအဆင့် စစ်ဆေးခြင်းပုံစံ',
    'phq2_title': 'PHQ-2 (စိတ်ဓာတ်ကျခြင်း စစ်ဆေးမှု)',
    'gad2_title': 'GAD-2 (သောကရောက်ခြင်း စစ်ဆေးမှု)',
    'phq2_q1': '၁။ လွန်ခဲ့သော ၂ ပတ်အတွင်း ကိစ္စရပ်များကို စိတ်ဝင်စားမှုမရှိခြင်း သို့မဟုတ် ပျော်ရွှင်မှုမရှိခြင်း -',
    'phq2_q2': '၂။ လွန်ခဲ့သော ၂ ပတ်အတွင်း စိတ်ပျက်အားငယ်ခြင်း သို့မဟုတ် မျှော်လင့်ချက်မရှိသလို ခံစားရခြင်း -',
    'gad2_q1': '၁။ လွန်ခဲ့သော ၂ ပတ်အတွင်း စိုးရိမ်ပူပန်ခြင်း၊ ဂနာမငြိမ်ဖြစ်ခြင်း သို့မဟုတ် စိတ်လှုပ်ရှားလွယ်ခြင်း -',
    'gad2_q2': '၂။ လွန်ခဲ့သော ၂ ပတ်အတွင်း စိုးရိမ်ပူပန်မှုများကို မရပ်တန့်နိုင်ခြင်း သို့မဟုတ် မထိန်းချုပ်နိုင်ခြင်း -',
    'risk_flags_title': 'ဘေးအန္တရာယ်နှင့် လုံခြုံရေး စစ်ဆေးခြင်း',
    'substance_flag': 'မူးယစ်ဆေးဝါး သို့မဟုတ် အရက် အလွန်အကျွံသုံးစွဲမှု အန္တရာယ်ရှိခြင်း',
    'suicide_flag': 'မိမိကိုယ်ကို ထိခိုက်နာကျင်စေလိုခြင်း သို့မဟုတ် သေကြောင်းကြံစည်လိုသည့် စိတ်ကူးရှိခြင်း',
    'phq2_score': 'PHQ-2 ရမှတ်',
    'gad2_score': 'GAD-2 ရမှတ်',
    'recommend_ref': 'ဆေးခန်းသို့ လွှဲပြောင်းရန် အကြံပြုချက် - စိတ်ပိုင်းဆိုင်ရာ ဒုက္ခရောက်မှု သတ်မှတ်ချက်ကို ကျော်လွန်နေသဖြင့် အသေးစိတ်စစ်ဆေးရန် ဆေးခန်းအဆင့် (CPSS) သို့ လွှဲပြောင်းရန် လိုအပ်ပါသည်။',
    'recommend_support': 'ပံ့ပိုးကူညီမှုပေးရန် - ရမှတ်များ သတ်မှတ်ချက်အောက်တွင် ရှိပါသည်။ ကျေးရွာအဆင့်တွင်သာ စောင့်ကြည့်ပံ့ပိုးကူညီမှု ဆက်လက်ပြုလုပ်ပါ။',
    'auto_create_ref': 'ဆေးခန်းသို့ လွှဲပြောင်းမှု တောင်းဆိုချက်ကို တိုက်ရိုက်ဖန်တီးပါ',
    'screening_notes': 'နောက်ထပ် စစ်ဆေးမှုမှတ်စုများ',
    'saving_screening': 'သိမ်းဆည်းနေသည်...',
    'save_screening': 'စစ်ဆေးမှုမှတ်တမ်း သိမ်းဆည်းရန်',
  }
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('app_language')
    return (saved === 'my' || saved === 'en') ? saved : 'en'
  })

  const setLocale = (l: Locale) => {
    localStorage.setItem('app_language', l)
    setLocaleState(l)
  }

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'my' : 'en')
  }

  const t = (key: string): string => {
    const dict = TRANSLATIONS[locale]
    return dict[key] || TRANSLATIONS['en'][key] || key
  }

  // Update html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
