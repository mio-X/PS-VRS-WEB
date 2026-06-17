import Dexie, { type EntityTable } from 'dexie'

// ── Clinical types ──────────────────────────────────────────────────────────

export interface Client {
  AutoSr?: number
  TS_Pcode: string
  RHC_Code: number
  SRHC_Code: number
  Village_Pcode: number
  CHWAMW: string
  HW_ID: number
  Client_ID: string
  Client_StartDate: string
  Client_Name: string
  Client_Age: number
  Client_Gender: string
  Client_Phone?: string
  Client_Remark?: string
}

export interface Screening {
  AutoSr?: number
  Client_ID: string
  Screening_Date: string
  HW_ID: number
  PHQ2_1: number // 0-3
  PHQ2_2: number // 0-3
  PHQ2_Score: number // 0-6
  GAD2_1: number // 0-3
  GAD2_2: number // 0-3
  GAD2_Score: number // 0-6
  Substance_Use: boolean
  Suicide_Risk: boolean
  Referral_Needed: boolean
  Notes?: string
}

export interface Assessment {
  AutoSr?: number
  Client_ID: string
  Assessment_Date: string
  Assessor_Name: string
  PHQ9_Score: number // 0-27
  GAD7_Score: number // 0-21
  Functional_Impairment: number // 0-10
  Primary_Problem: string // Depression, Anxiety, Trauma, Substance Use, Suicide Risk
  Diagnosis_Notes?: string
}

export interface CounselingLog {
  AutoSr?: number
  Client_ID: string
  Session_Date: string
  Session_Number: number
  Session_Type: string
  Session_Notes: string
  Next_Session_Date?: string
  Supervisor_Feedback?: string
}

export interface Pharmacotherapy {
  AutoSr?: number
  Client_ID: string
  Prescribed_Date: string
  Medication_Name: string
  Dosage: string
  Frequency: string
  Adherence_Level: string // High, Medium, Low
  Side_Effects?: string
  Prescriber: string
}

export interface CETAPlan {
  AutoSr?: number
  Client_ID: string
  Plan_Date: string
  CETA_Elements: string // Comma-separated: e.g. "Psychoeducation,Cognitive Coping,Behavioral Activation"
  Status: string // Active, Completed, Suspended
}

export interface CETASession {
  AutoSr?: number
  Client_ID: string
  Session_Date: string
  Session_Number: number
  Elements_Delivered: string // Comma-separated elements
  Client_Progress: string
  PHQ9_Score?: number
  GAD7_Score?: number
  Safety_Checked: boolean
  Suicide_Risk_Level: string // None, Low, Medium, High
  Homework_Assigned?: string
  Notes?: string
  Supervisor_Feedback?: string
}

// ── CETA Form.xlsx Excel Sync Schemas ──────────────────────────────────────────

export interface FocalPointSession {
  AutoSr?: number
  SessionID: string
  ProviderName: string
  SupervisorName: string
  ClinicName: string
  VillageName: string
  Date: string
  Male: number
  Female: number
  PeopleReviewed: number
  People5Signs: number
  CPSSNew: number
  CPSSFollowup: number
  StressHandoutShared: number
  ChangeHandoutShared: number
  VideoShared: number
  Feeling?: string
  Feeback?: string
}

export interface CPSSBaseline {
  AutoSr?: number
  Date: string
  ClinicName: string
  VillageName: string
  ProviderName: string
  ClientID: string
  ClientName: string
  Age: number
  Gender: string
  ClientType: string
  CPSSHowHear: string
  ProblemScore: number
  Safety: string
  SubstanceUse: string
  Notes?: string
  FollowUpPermission: string
  DenyReason?: string
}

export interface CPSSFollowup {
  AutoSr?: number
  SessionID: string
  FollowupDate: string
  ClientID: string
  ProviderID: string
  FinalResultSafety: string
  ActionTakenSafety?: string
  FinalResultAssess: string
  FollowupProblemScore: number
  SUTreatment: string
  ReferOther?: string
  OtherService?: string
  ReferCETA: string
  CETATreatment: string
  DenyReason?: string
  DenyDate?: string
  ReferCETADate?: string
}

export interface CPSSFinal {
  AutoSr?: number
  ClientID: string
  Completed: string
}

export interface CETABaseline {
  AutoSr?: number
  CPSSRefer: string
  CPSSClientID?: string
  CETAClientID?: string
  ClientID: string
  ClientName: string
  Gender: string
  Age: number
  ClientType: string
  ClinicName: string
  VillageName: string
  CounselorName: string
  ClientBackground: string
  AssessmentDate: string
  BaselineCMFProgblemScore: number
  BaselineCMFSU: number
  MH1: number
  MH2: number
  MH3: number
  MH4: number
  MH5: number
  MH6: number
  MH7: number
  MH8: number
  MH9: number
  MH10: number
  MH11: number
  MH12: number
  MH13: number
  MH14: number
  MH15: number
  MH16: number
  MH17: number
  CDMTRelaxation: number
  CDMTActive: number
  CDMTLive: number
  CDMTTDM: number
  TDWGeneral: number
  CDMTSolvingProblem: number
  Functioning: number
  BaselineTLFB: number
  TraumasExperienced: string
  HighRisk: string
  SafetyPlan: string
  FinalFlow: string
  Outcome: string
  DropoutReason?: string
  ExternalReferCETA?: string
}

export interface CETAFollowup {
  AutoSr?: number
  SessionID: string
  SessionDate: string
  ClientID: string
  ProviderID: string
  SessionNumber: number
  SessionType: string
  WeeklyCMFProblemScore: number
  CMFSU1: number
  CMFSU2: number
  TLFB: number
  SI: string
  HI: string
  IPV: string
  SafetyPlan: string
  Component1Done: string
  Component1Time: number
  Component2Done: string
  Component2Time: number
  TotalSessionDuration: number
  CaseNotes?: string
  NextPlan?: string
}

export interface Referral {
  AutoSr?: number
  Client_ID: string
  Client_Name?: string
  Source_Tier: string // Focal Point, CPSS
  Target_Tier: string // CPSS, CETA
  Referral_Date: string
  Reason: string
  Urgency: string // Routine, Urgent, Crisis
  Status: string // Pending, Accepted, Completed
  Outcome_Notes?: string
}

// ── System / reference types ────────────────────────────────────────────────

export interface SysTownship {
  TS_PCode: string
  Township: string
  Org_Short: string
  Grant_No?: string
}

export interface SysRHC {
  TS_Pcode: string
  RHC_Code: number
  RHC_Name: string
  PopulationByRHC19?: number
  U5PopulationByRHC19?: number
  ExpPregByRHC19?: number
  LiveBirthByRHC19?: number
}

export interface SysSRHC {
  TS_Pcode: string
  RHC_Code: number
  SRHC_Code: number
  SRHC_Name: string
}

export interface SysVillage {
  TS_Pcode: string
  RHC_Code: number
  SRHC_Code: number
  Village_Pcode: number
  Village: string
  Village_Mya?: string
  HardToReach19?: boolean
}

export interface SysCHWAMW {
  TS_Pcode: string
  RHC_Code: number
  SRHC_Code: number
  Village_Pcode: number
  CHWAMW: string
  HW_ID: number
  HW_Name: string
  HW_Sex?: string
  CCM_Trained?: boolean
  CBNBC_Trained?: boolean
  DualFunctioning?: boolean
  VRS_Trained?: boolean
}

export interface SysOrg {
  Org_Short: string
  Org_Long: string
  Type: string
}

export interface SysDrug {
  DrugID: number
  DrugDesp: string
}

export interface SysLookUp {
  UseID: number
  ID: number
  Description: string
}

export interface SysLookUpMain {
  UseID: number
  UseDescription: string
}

export interface SysUserLevel {
  UserLevel: number
  LevelDesp: string
}

export interface SysUser {
  UserName: string
  Password: string
  UserLevel: number
}

// ── Database ────────────────────────────────────────────────────────────────

class VRSDatabase extends Dexie {
  clients!: EntityTable<Client, 'AutoSr'>
  screenings!: EntityTable<Screening, 'AutoSr'>
  assessments!: EntityTable<Assessment, 'AutoSr'>
  counseling_logs!: EntityTable<CounselingLog, 'AutoSr'>
  pharmacotherapy!: EntityTable<Pharmacotherapy, 'AutoSr'>
  ceta_plans!: EntityTable<CETAPlan, 'AutoSr'>
  ceta_sessions!: EntityTable<CETASession, 'AutoSr'>
  referrals!: EntityTable<Referral, 'AutoSr'>

  focal_point_sessions!: EntityTable<FocalPointSession, 'AutoSr'>
  cpss_baseline!: EntityTable<CPSSBaseline, 'AutoSr'>
  cpss_followups!: EntityTable<CPSSFollowup, 'AutoSr'>
  cpss_final!: EntityTable<CPSSFinal, 'AutoSr'>
  ceta_baseline!: EntityTable<CETABaseline, 'AutoSr'>
  ceta_followups!: EntityTable<CETAFollowup, 'AutoSr'>

  sys_township!: EntityTable<SysTownship, 'TS_PCode'>
  sys_rhc!: EntityTable<SysRHC, 'RHC_Code'>
  sys_srhc!: EntityTable<SysSRHC, 'SRHC_Code'>
  sys_village!: EntityTable<SysVillage, 'Village_Pcode'>
  sys_chwamw!: EntityTable<SysCHWAMW, 'HW_ID'>
  sys_org!: EntityTable<SysOrg, 'Org_Short'>
  sys_drug!: EntityTable<SysDrug, 'DrugID'>
  sys_lookup!: EntityTable<SysLookUp, 'ID'>
  sys_lookupMain!: EntityTable<SysLookUpMain, 'UseID'>
  sys_userLevel!: EntityTable<SysUserLevel, 'UserLevel'>
  sys_user!: EntityTable<SysUser, 'UserName'>

  constructor() {
    super('VRS')
    // Keep old versions structure for upgrade path if browser has existing DB
    this.version(1).stores({
      clients:     '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], HW_ID, Client_StartDate',
      anc:         '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], ANC_Date',
      delivery:    '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], Delivery_Date',
      pnc:         '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], PNC_Date',
      nbc:         '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], NBC_Date',
      referral:    '++AutoSr, Client_ID, [TS_Pcode+RHC_Code], Ref_Date',
      sys_township:   'TS_PCode, Org_Short',
      sys_rhc:        'RHC_Code, TS_Pcode',
      sys_srhc:       'SRHC_Code, [TS_Pcode+RHC_Code], RHC_Code',
      sys_village:    'Village_Pcode, [TS_Pcode+RHC_Code+SRHC_Code], RHC_Code',
      sys_chwamw:     'HW_ID, [TS_Pcode+RHC_Code], CHWAMW',
      sys_org:        'Org_Short',
      sys_drug:       'DrugID',
      sys_lookup:     '[UseID+ID], UseID',
      sys_lookupMain: 'UseID',
      sys_userLevel:  'UserLevel',
      sys_user:       'UserName, UserLevel',
    })
    
    this.version(2).stores({
      vhwRegister: '++id, [TS_Pcode+RHC_Code+HW_ID], Report_Year, Report_Month, HW_ID',
    })

    this.version(3).stores({
      clients:         '++AutoSr, Client_ID, HW_ID, Client_StartDate',
      screenings:      '++AutoSr, Client_ID, Screening_Date',
      assessments:     '++AutoSr, Client_ID, Assessment_Date',
      counseling_logs: '++AutoSr, Client_ID, Session_Date',
      pharmacotherapy: '++AutoSr, Client_ID, Prescribed_Date',
      ceta_plans:      '++AutoSr, Client_ID, Plan_Date',
      ceta_sessions:   '++AutoSr, Client_ID, Session_Date',
      referrals:       '++AutoSr, Client_ID, Referral_Date, Status',

      sys_township:   'TS_PCode, Org_Short',
      sys_rhc:        'RHC_Code, TS_Pcode',
      sys_srhc:       'SRHC_Code, [TS_Pcode+RHC_Code], RHC_Code',
      sys_village:    'Village_Pcode, [TS_Pcode+RHC_Code+SRHC_Code], RHC_Code',
      sys_chwamw:     'HW_ID, [TS_Pcode+RHC_Code], CHWAMW',
      sys_org:        'Org_Short',
      sys_drug:       'DrugID',
      sys_lookup:     '[UseID+ID], UseID',
      sys_lookupMain: 'UseID',
      sys_userLevel:  'UserLevel',
      sys_user:       'UserName, UserLevel',
    })

    this.version(4).stores({
      clients:         '++AutoSr, Client_ID, HW_ID, Client_StartDate',
      screenings:      '++AutoSr, Client_ID, Screening_Date',
      assessments:     '++AutoSr, Client_ID, Assessment_Date',
      counseling_logs: '++AutoSr, Client_ID, Session_Date',
      pharmacotherapy: '++AutoSr, Client_ID, Prescribed_Date',
      ceta_plans:      '++AutoSr, Client_ID, Plan_Date',
      ceta_sessions:   '++AutoSr, Client_ID, Session_Date',
      referrals:       '++AutoSr, Client_ID, Referral_Date, Status',

      sys_township:   'TS_PCode, Org_Short',
      sys_rhc:        'RHC_Code, TS_Pcode',
      sys_srhc:       'SRHC_Code, [TS_Pcode+RHC_Code], RHC_Code',
      sys_village:    'Village_Pcode, [TS_Pcode+RHC_Code+SRHC_Code], RHC_Code',
      sys_chwamw:     'HW_ID, [TS_Pcode+RHC_Code], CHWAMW',
      sys_org:        'Org_Short',
      sys_drug:       'DrugID',
      sys_lookup:     '[UseID+ID], UseID',
      sys_lookupMain: 'UseID',
      sys_userLevel:  'UserLevel',
      sys_user:       'UserName, UserLevel',
    })

    // Version 5: CETA Form.xlsx schema sync
    this.version(5).stores({
      focal_point_sessions: '++AutoSr, SessionID, ClinicName, VillageName, Date',
      cpss_baseline: '++AutoSr, ClientID, ClientName, ClinicName, VillageName, Date',
      cpss_followups: '++AutoSr, SessionID, ClientID, FollowupDate',
      cpss_final: '++AutoSr, ClientID, Completed',
      ceta_baseline: '++AutoSr, ClientID, ClientName, ClinicName, VillageName, AssessmentDate',
      ceta_followups: '++AutoSr, SessionID, ClientID, SessionDate',
      referrals: '++AutoSr, Client_ID, Referral_Date, Status',

      // Deprecated tables kept for compatibility
      clients:         '++AutoSr, Client_ID, HW_ID, Client_StartDate',
      screenings:      '++AutoSr, Client_ID, Screening_Date',
      assessments:     '++AutoSr, Client_ID, Assessment_Date',
      counseling_logs: '++AutoSr, Client_ID, Session_Date',
      pharmacotherapy: '++AutoSr, Client_ID, Prescribed_Date',
      ceta_plans:      '++AutoSr, Client_ID, Plan_Date',
      ceta_sessions:   '++AutoSr, Client_ID, Session_Date',

      sys_township:   'TS_PCode, Org_Short',
      sys_rhc:        'RHC_Code, TS_Pcode',
      sys_srhc:       'SRHC_Code, [TS_Pcode+RHC_Code], RHC_Code',
      sys_village:    'Village_Pcode, [TS_Pcode+RHC_Code+SRHC_Code], RHC_Code',
      sys_chwamw:     'HW_ID, [TS_Pcode+RHC_Code], CHWAMW',
      sys_org:        'Org_Short',
      sys_drug:       'DrugID',
      sys_lookup:     '[UseID+ID], UseID',
      sys_lookupMain: 'UseID',
      sys_userLevel:  'UserLevel',
      sys_user:       'UserName, UserLevel',
    })
  }
}

export const db = new VRSDatabase()

db.on('versionchange', () => {
  db.close()
  window.location.reload()
})

db.on('blocked', () => {
  window.location.reload()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => db.close())
}

/** Wipe the entire local database and reload. */
export async function resetDatabase(): Promise<void> {
  await db.delete()
  window.location.reload()
}

