# Mindvibe – CETA Mental Health Reporting System (Web)

**Mindvibe** is a serverless, offline-first Progressive Web App (PWA) designed to implement the Common Elements Treatment Approach (CETA) and Clinical Psychosocial Support Services (CPSS) mental health workflow models. It provides village-level reporting, clinical diagnostic tracking, medication management, supervision logging, and interactive data visualization—all functioning directly within the browser with no external network or API dependencies.

🌐 **Production Bundle Preview:** Run `npm run build` and `npm run preview` to test offline behavior.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Quick Start](#3-quick-start)
4. [User Roles & Access Levels](#4-user-roles--access-levels)
5. [Application Architecture & Pages](#5-application-architecture--pages)
6. [Data Architecture](#6-data-architecture)
7. [Database Schema & Models](#7-database-schema--models)
8. [Clinical & Support Workflows](#8-clinical--support-workflows)
9. [Offline Data Visualizations](#9-offline-data-visualizations)
10. [Seed Data](#10-seed-data)
11. [Schema Migrations](#11-schema-migrations)

---

## 1. Project Overview

Mindvibe adapts the global **CETA Mental Health Model** to digital field reporting across three distinct tiers of care:
*   **Focal Point (Village level)**: Conducts community mental health promotion, distributes psychoeducational brochures, and registers group/village aggregates.
*   **CPSS (Clinic level)**: Conducts baseline assessments using CPSS forms, logs weekly follow-up symptom scores, handles safety risk management, and prescribes medications.
*   **CETA (Supervisor/Specialist level)**: Handles complex cases, conducts 47-variable baseline intakes, tracks components delivered, logs weekly CMF scores, and monitors overall clinical outcomes.

This system replaces Access database registries and paper logs with a modern, Material Design 3 compliant PWA that runs offline on smartphones, tablets, and computers.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Framework | React | 19 | Declarative, component-based UI |
| Language | TypeScript | ~5.0 | Complete type safety across clinical forms |
| Build Tool | Vite | 8 | Rapid development server & production compiler |
| Routing | React Router | 7 | Client-side page navigation and param parsing |
| Local Database | Dexie.js | 4 | IndexedDB wrapper supporting transactional CRUD |
| Live Queries | dexie-react-hooks | 4 | Automatically re-renders UI on database updates |
| CSV Parser | PapaParse | 5 | Runs fast client-side parsing of CSV seed files |
| PWA Service | vite-plugin-pwa | 1 | Automatically registers service worker for offline use |

### Offline-First Architecture

Mindvibe requires no central server. All records are stored locally in the browser's IndexedDB. This ensures:
*   **Complete Offline Operation**: Field workers, clinic staff, and supervisors can perform data entry in remote areas with zero network connectivity.
*   **Data Preservation**: Records are persisted in browser memory and won't be cleared when the browser closes.
*   **Zero Infrastructure Costs**: Runs entirely on the user's local hardware without hosting or server maintenance.

---

## 3. Quick Start

Ensure you have [Node.js](https://nodejs.org/) installed, then run:

```bash
# 1. Install project dependencies
npm install

# 2. Start the Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser. On the first load, the application will detect an empty database and automatically seed reference data (townships, villages, lookups, and users) from the CSV files in `public/seed/`.

### Building for Production

To compile the production bundle and review the built version locally:

```bash
# Compile and build files to dist/
npm run build

# Serve compiled files locally
npm run preview
```

### Seeding Credentials (seeded from `public/seed/sys_user.csv`)

| Username | Password | Role / Access Level | Main Workspace |
|----------|----------|---------------------|----------------|
| `Admin` | `Admin` | 5 – DB Admin | Supervisor dashboard, User CRUD, Reset DB |
| `User` | `User` | 2 – Read Only | Read-only Supervisor dashboard |
| `Field` | `Field` | 4 – Focal Point | Village Session Logger & Referrals |
| `Clinic` | `Clinic` | 3 – CPSS Clinic | CPSS Baseline Intake, Follow-ups, Dashboard |
| `Ceta` | `Ceta` | 1 – CETA Specialist | CETA Baseline Intakes, Weekly Logs, Dashboard |

---

## 4. User Roles & Access Levels

User access permissions are managed via `AuthContext.tsx` and validated on router routes.

| Level | Role Name | Default Route | Target Workspace | Description |
|-------|-----------|---------------|------------------|-------------|
| **1** | CETA specialist / supervisor | `/supervisor` | Supervisor Portal | Full access to CETA intakes, weekly session logs, and clinical dashboards. |
| **2** | Read Only | `/supervisor` | Supervisor Portal | View-only access to supervisor metrics and townships directory. |
| **3** | CPSS Clinic worker | `/clinic` | CPSS Clinic Portal | Enters CPSS Baseline assessments, log follow-ups, and review referrals. |
| **4** | Focal Point village worker | `/field` | Focal Point Portal | Enters village group sessions and issues client referrals. |
| **5** | DB Admin | `/supervisor` | Admin Portal | System diagnostics, Reset Database options, and Clinician account CRUD. |

---

## 5. Application Architecture & Pages

### 🔐 Authentication (`/login`)
A secure interface validating entered credentials against the `sys_user` store. Failed logins show descriptive validation feedback.

### 👥 Focal Point Workspace (`/field/*`)
*   `/field`: Main menu displaying session metrics, handout distribution counts, and referral requests.
*   `/field/sessions`: Paginated list of logged village sessions showing attendance.
*   `/field/sessions/new`: Session logger capturing male/female attendees, stress management/behavioral change handouts, and serious indicator flags.
*   `/field/referral/new`: Manual referral request form allowing workers to enter client details and submit requests to clinic/counselor tiers.

### 🏥 CPSS Clinic Workspace (`/clinic/*`)
*   `/clinic`: Clinic dashboard showing pending referrals, active clinic cases, and the Clinic Data Visualization tab.
*   `/clinic/intake`: CPSS Baseline assessment form capturing 16 CPSS variables, problem severity scores, safety checks, and substance use indicators.
*   `/clinic/followup`: CPSS Follow-up log capturing weekly problem scores, safety status, CETA referral triggers, and treatment decisions.
*   `/clinic/clients/:clientId`: Patient detailed file showing history, timeline, and an interactive SVG symptom improvement chart.

### 🎓 CETA Specialist Workspace (`/supervisor/*`)
*   `/supervisor`: CETA Supervisor dashboard displaying case metrics, referrals inbox, active CETA cases, and CETA Data Visualizations.
*   `/supervisor/ceta-plan`: 47-variable CETA baseline intake form covering demographics, functioning score, trauma checklist, safety plan, and final flow assignment.
*   `/supervisor/ceta-session`: CETA Follow-up session log capturing weekly problem scores, element durations, high-risk safety indicators, and next plan details.
*   `/supervisor/case-summary`: Aggregated client profile plotting weekly scores on custom SVGs.
*   `/supervisor/system`: Clinical administration dashboard for resetting database, changing languages, and creating clinician logins.

---

## 6. Data Architecture

Mindvibe uses **IndexedDB** for client-side storage, managed through **Dexie.js**.

### Automatic Seeding (`src/data/seed.ts`)
On startup, `seedIfEmpty()` checks if the database is blank. If true, it:
1.  Fetches 11 CSV files from `/seed/` concurrently.
2.  Parses the CSV records utilizing PapaParse.
3.  Performs bulk inserts (`bulkPut`) into the respective system tables inside a transaction.

### Live Queries
The application utilizes the `useLiveQuery` hook from `dexie-react-hooks`. When clinical records are added or modified, any active dashboard metrics or client lists query the database and re-render the components automatically, avoiding manual state synchronizations.

---

## 7. Database Schema & Models

Below are the primary object stores configured under **Dexie Schema Version 5**:

### 📊 Active Clinical Tables

#### `focal_point_sessions` — Village Aggregate reporting
*   `AutoSr` (PK, auto-increment)
*   `SessionID` (string)
*   `Date` (string)
*   `Male` / `Female` (numbers)
*   `People5Signs` (number)
*   `StressHandoutShared` / `ChangeHandoutShared` (numbers)
*   `Feeling` / `Feedback` (strings)

#### `cpss_baseline` — CPSS Clinic Intake
*   `AutoSr` (PK, auto-increment)
*   `ClientID` (string, indexed)
*   `ClientName` (string)
*   `Age` / `Gender` (number / string)
*   `ProblemScore` (number)
*   `Safety` / `SubstanceUse` (strings)
*   `FollowUpPermission` (string)

#### `cpss_followups` — CPSS Weekly Session Log
*   `AutoSr` (PK, auto-increment)
*   `SessionID` (string, indexed)
*   `ClientID` (string, indexed)
*   `FollowupDate` (string)
*   `FollowupProblemScore` (number)
*   `FinalResultSafety` / `ReferCETA` (strings)

#### `ceta_baseline` — CETA specialist Intake
*   `AutoSr` (PK, auto-increment)
*   `ClientID` (string, indexed)
*   `ClientName` (string)
*   `Age` / `Gender` (number / string)
*   `BaselineCMFProgblemScore` (number)
*   `TraumasExperienced` (string)
*   `HighRisk` / `FinalFlow` / `SafetyPlan` (strings)
*   `MH1` to `MH17` (numbers)
*   `BaselineTLFB` / `Functioning` (numbers)

#### `ceta_followups` — CETA Treatment Session Log
*   `AutoSr` (PK, auto-increment)
*   `SessionID` (string, indexed)
*   `ClientID` (string, indexed)
*   `SessionNumber` (number)
*   `WeeklyCMFProblemScore` (number)
*   `Component1Done` / `Component2Done` (strings)
*   `Component1Time` / `Component2Time` (numbers)
*   `SI` / `HI` / `SafetyPlan` (strings)

#### `referrals` — Inter-tier Referrals
*   `AutoSr` (PK, auto-increment)
*   `Client_ID` (string, indexed)
*   `Client_Name` (string)
*   `Source_Tier` / `Target_Tier` (strings)
*   `Referral_Date` (string)
*   `Urgency` / `Status` (strings)

---

## 8. Clinical & Support Workflows

Mindvibe maps a clear patient referral and escalation lifecycle across its workspaces:

```
[Focal Point Session] ──(Group Signs Alert)──> [Referral Request]
                                                     │
                                                     ▼
                                            [CPSS Clinic Intake]
                                                     │
                                             (If CPSS Followup 
                                              Triggers CETA)
                                                     │
                                                     ▼
                                            [CETA Baseline Intake]
                                                     │
                                             (Weekly Session Logs)
                                                     │
                                                     ▼
                                            [Treatment Outcome]
```

1.  **Focal Point** worker notices serious indicators in a village aggregate review and fills a manual **Referral Form**, defining the client's name, ID, and referral urgency.
2.  **CPSS Clinic** receives the referral request, accepts it to start intake, logs a **CPSS Baseline**, and begins weekly clinical follow-up sessions.
3.  If the patient continues to score high or displays safety risks, the CPSS worker triggers a **CETA referral**.
4.  **CETA Supervisor** accepts the patient, fills out the comprehensive 47-variable **CETA Baseline Intake**, designates the treatment plan flow, and logs session components weekly until completion.

---

## 9. Offline Data Visualizations

Mindvibe uses clean, lightweight SVG layouts to render high-fidelity charts. This avoids importing heavy charting libraries, ensuring fast build times and reliable offline operation.

*   **Symptom Improvement Chart**: Draws responsive line charts on the client file (`ClientDetail.tsx`), tracing the decrease in symptom severity scores (CPSS Follow-up Score or CETA Weekly CMF Score) from baseline to the latest session.
*   **Clinic Attendance Statistics**: Renders a vertical bar chart showing total village session attendees.
*   **Demographic Distributions**: Shows gender and age segment breakups.
*   **Component Delivery Distribution**: Visualizes CETA components delivered (Psychoeducation, Relaxation, Cognitive Coping, etc.) in a horizontal bar layout.
*   **Outcomes Breakdown**: Stacked bar layouts comparing clients who successfully completed treatment vs. dropouts.

---

## 10. Seed Data

Static parameters are loaded from `/seed/` files at runtime. If configurations change, updates should be written directly to the CSV files inside `public/seed/`:

*   `sys_township.csv` - Township names and P-codes.
*   `sys_rhc.csv` - Rural Health Centres and Catchment statistics.
*   `sys_srhc.csv` - Sub-Rural Health Centres.
*   `sys_village.csv` - Villages list, Myanmar spellings, and hard-to-reach indicators.
*   `sys_chwamw.csv` - Focal Point workers directory and VRS certifications.
*   `sys_org.csv` - Program implementing agencies.
*   `sys_drug.csv` - Clinic pharmacy list.
*   `sys_lookup.csv` - Standard drop-down descriptions.
*   `sys_user.csv` - Login credentials.
*   `sys_userLevel.csv` - Role definitions.

---

## 11. Schema Migrations

IndexedDB migrations are defined in `src/data/db.ts`:
*   **Version 1 to 4**: Created legacy databases tracking individual maternal/newborn cases.
*   **Version 5**: Migrated tables to synchronize with the modern `CETA Form.xlsx` layout. Older tables are declared as deprecated but remain in the store config to prevent database migration failures on existing client browsers.
