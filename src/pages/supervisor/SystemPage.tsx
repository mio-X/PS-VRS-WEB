import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, resetDatabase } from '../../data/db'
import { Navbar } from '../../components/Layout'
import { useAuth, LEVEL_CETA, LEVEL_DBADMIN } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

const LEVELS: Record<number, string> = {
  1: 'CETA Counsellor / Supervisor',
  2: 'Read Only',
  3: 'CPSS Clinic Worker',
  4: 'Focal Point Village Worker',
  5: 'DB Admin'
}

export default function SystemPage() {
  const { user } = useAuth()
  const { locale, setLocale } = useLanguage()
  const isAdmin = user?.level === LEVEL_CETA || user?.level === LEVEL_DBADMIN

  // Stats query
  const stats = useLiveQuery(async () => ({
    townships:      await db.sys_township.count(),
    rhcs:           await db.sys_rhc.count(),
    srhcs:          await db.sys_srhc.count(),
    villages:       await db.sys_village.count(),
    hws:            await db.sys_chwamw.count(),
    focal_sessions: await db.focal_point_sessions.count(),
    cpss_baseline:  await db.cpss_baseline.count(),
    cpss_followups: await db.cpss_followups.count(),
    cpss_final:     await db.cpss_final.count(),
    ceta_baseline:  await db.ceta_baseline.count(),
    ceta_followups: await db.ceta_followups.count(),
    referrals:      await db.referrals.count(),
  }), [])

  // Users query
  const users = useLiveQuery(() => db.sys_user.toArray(), [])

  // CRUD states
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUserLevel, setNewUserLevel] = useState('4') // default to Focal Point
  const [editingUsername, setEditingUsername] = useState('')
  const [editingPassword, setEditingPassword] = useState('')
  const [crudError, setCrudError] = useState('')
  const [crudSuccess, setCrudSuccess] = useState('')

  const handleReset = () => {
    if (window.confirm('Delete ALL local data and re-seed from CSV?')) {
      resetDatabase()
    }
  }

  // User CRUD handlers
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCrudError('')
    setCrudSuccess('')

    const usernameClean = newUsername.trim()
    const passwordClean = newPassword.trim()

    if (!usernameClean || !passwordClean) {
      setCrudError('Username and password are required.')
      return
    }

    try {
      const existing = await db.sys_user.get(usernameClean)
      if (existing) {
        setCrudError('Username already exists.')
        return
      }

      await db.sys_user.add({
        UserName: usernameClean,
        Password: passwordClean,
        UserLevel: Number(newUserLevel),
      })

      setCrudSuccess(`User "${usernameClean}" created successfully!`)
      setNewUsername('')
      setNewPassword('')
    } catch (err) {
      setCrudError(err instanceof Error ? err.message : 'Create user failed.')
    }
  }

  const handleDeleteUser = async (username: string) => {
    if (username === user?.username) {
      alert('You cannot delete your own logged-in account!')
      return
    }

    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      setCrudError('')
      setCrudSuccess('')
      try {
        await db.sys_user.delete(username)
        setCrudSuccess(`User "${username}" deleted.`)
      } catch (err) {
        setCrudError('Delete failed.')
      }
    }
  }

  const handleStartEdit = (username: string, pass: string) => {
    setEditingUsername(username)
    setEditingPassword(pass)
  }

  const handleSavePassword = async () => {
    setCrudError('')
    setCrudSuccess('')
    try {
      await db.sys_user.update(editingUsername, { Password: editingPassword })
      setCrudSuccess(`Password updated for user "${editingUsername}".`)
      setEditingUsername('')
      setEditingPassword('')
    } catch (err) {
      setCrudError('Update password failed.')
    }
  }

  return (
    <div>
      <Navbar title="Clinical Administration" showBack backTo="/supervisor" />
      <div className="page">

        {/* Language configuration */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--primary-dark)' }}>Global Language Configuration</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Set the default system-wide display language for offline portals.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setLocale('en')}
              className={`btn ${locale === 'en' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '10px' }}
            >
              English (US)
            </button>
            <button
              onClick={() => setLocale('my')}
              className={`btn ${locale === 'my' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '10px' }}
            >
              မြန်မာဘာသာ (Burmese)
            </button>
          </div>
        </div>

        {/* User Management CRUD */}
        {isAdmin && (
          <div className="card" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--primary-dark)' }}>Clinicians & User Accounts</h3>
            
            {crudError && <div className="alert alert-error">{crudError}</div>}
            {crudSuccess && <div className="alert alert-success">{crudSuccess}</div>}

            {/* List users */}
            <div style={{ marginBottom: '20px' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Level / Role</th>
                      <th>Password</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map(u => (
                      <tr key={u.UserName}>
                        <td style={{ fontWeight: 600 }}>{u.UserName}</td>
                        <td>
                          <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                            {LEVELS[u.UserLevel] || `Level ${u.UserLevel}`}
                          </span>
                        </td>
                        <td>
                          {editingUsername === u.UserName ? (
                            <input
                              type="text"
                              value={editingPassword}
                              onChange={e => setEditingPassword(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.85rem', borderRadius: '6px' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.Password}</span>
                          )}
                        </td>
                        <td>
                          {editingUsername === u.UserName ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={handleSavePassword}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUsername('')}
                                className="btn btn-outline"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleStartEdit(u.UserName, u.Password)}
                                className="btn btn-outline"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Edit Pass
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.UserName)}
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                                disabled={u.UserName === user?.username}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create user form */}
            <form onSubmit={handleAddUser} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>➕ Create New Clinical Account</h4>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Username</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="e.g. DoctorSu"
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Password</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter secure password"
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label>Clinical Role / Level</label>
                  <select
                    value={newUserLevel}
                    onChange={e => setNewUserLevel(e.target.value)}
                    style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                  >
                    <option value="4">Level 4: Focal Point (Village Screening)</option>
                    <option value="3">Level 3: CPSS (Clinic Diagnostics/Prescriptions)</option>
                    <option value="1">Level 1: CETA Counsellor / supervisor</option>
                    <option value="2">Level 2: Read Only</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '10px', fontSize: '0.85rem' }}>
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reference data stats */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <p className="section-title" style={{ marginTop: 0 }}>Reference Directory Statistics</p>
          {[
            ['Townships Registered',     stats?.townships],
            ['Rural Health Centers (RHC)', stats?.rhcs],
            ['Sub-RHCs Registered',      stats?.srhcs],
            ['Villages Cataloged',       stats?.villages],
            ['Focal Point Workers',      stats?.hws],
          ].map(([label, val]) => (
            <div key={label as string} style={rowStyle}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{label as string}</span>
              <span style={{ fontWeight: 600 }}>{val ?? '…'}</span>
            </div>
          ))}
        </div>

        {/* Clinical records stats */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <p className="section-title" style={{ marginTop: 0 }}>Mental Health Records</p>
          {[
            ['Village Sessions (Focal Point)', stats?.focal_sessions],
            ['CPSS Baseline Intakes',          stats?.cpss_baseline],
            ['CPSS Follow-ups Logged',        stats?.cpss_followups],
            ['CPSS Final Outcomes',           stats?.cpss_final],
            ['CETA Baseline Intakes',         stats?.ceta_baseline],
            ['CETA Weekly Sessions Logged',    stats?.ceta_followups],
            ['Inter-tier Referrals',          stats?.referrals],
          ].map(([label, val]) => (
            <div key={label as string} style={rowStyle}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{label as string}</span>
              <span style={{ fontWeight: 600 }}>{val ?? '…'}</span>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        {isAdmin && (
          <div className="card" style={{ borderColor: 'var(--danger)', background: '#fff1f2' }}>
            <p className="section-title" style={{ marginTop: 0, color: 'var(--danger)' }}>Danger Zone</p>
            <button
              className="btn btn-danger"
              style={{ fontSize: '0.85rem', padding: '10px 16px' }}
              onClick={handleReset}
            >
              Reset Database & Re-seed
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Deletes all local patient files and screenings, and resets the application database using fresh reference parameters from CSV files.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderBottom: '1px solid var(--border)',
}
