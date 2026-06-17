import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../../data/db'
import { Navbar } from '../../components/Layout'
import { useAuth, canWrite } from '../../context/AuthContext'

export default function ClientList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Query clients and their latest screening/referral statuses
  const data = useLiveQuery(async () => {
    const allClients = await db.clients.orderBy('Client_StartDate').reverse().toArray()
    const allVillages = await db.sys_village.toArray()
    const allScreenings = await db.screenings.toArray()
    const allReferrals = await db.referrals.toArray()

    const villageMap = new Map(allVillages.map(v => [v.Village_Pcode, v.Village]))
    
    return allClients.map(c => {
      // Find latest screening for this client
      const clientScreenings = allScreenings
        .filter(s => s.Client_ID === c.Client_ID)
        .sort((a, b) => b.Screening_Date.localeCompare(a.Screening_Date))
      const latestScreening = clientScreenings[0]

      // Find latest referral for this client
      const clientReferrals = allReferrals
        .filter(r => r.Client_ID === c.Client_ID)
        .sort((a, b) => b.Referral_Date.localeCompare(a.Referral_Date))
      const latestReferral = clientReferrals[0]

      return {
        ...c,
        villageName: villageMap.get(c.Village_Pcode) || `Code ${c.Village_Pcode}`,
        latestScreening,
        latestReferral,
      }
    })
  }, [])

  const filteredClients = data?.filter(c =>
    c.Client_Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.Client_ID.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <Navbar title="Focal Point – Client Registry" showBack backTo="/field" />
      <div className="page">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <input
              type="text"
              placeholder="Search by client name or ID…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '10px 14px' }}
            />
          </div>
          {canWrite(user?.level ?? 0) && (
            <Link to="/field/clients/new" className="btn btn-primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
              + Add Client
            </Link>
          )}
        </div>

        {filteredClients === undefined && <div className="spinner">Loading clients…</div>}

        {filteredClients !== undefined && filteredClients.length === 0 && (
          <div className="alert alert-info">
            {searchQuery ? 'No clients match your search.' : 'No clients registered yet.'}
          </div>
        )}

        {filteredClients && filteredClients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredClients.map(c => (
              <div key={c.AutoSr} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div 
                  onClick={() => navigate(`/field/clients/${c.Client_ID}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: 'var(--primary-dark)' }}>{c.Client_Name}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>ID: {c.Client_ID}</span>
                      <span>·</span>
                      <span>Age: {c.Client_Age}</span>
                      <span>·</span>
                      <span>Gender: {c.Client_Gender}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📍 Village: {c.villageName} · Registered: {c.Client_StartDate}
                    </div>
                  </div>
                  
                  {/* Status indicators */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {c.latestScreening ? (
                      <span className={`badge ${c.latestScreening.Referral_Needed ? 'badge-red' : 'badge-green'}`}>
                        Screened: PHQ2={c.latestScreening.PHQ2_Score}
                      </span>
                    ) : (
                      <span className="badge badge-gray">Unscreened</span>
                    )}

                    {c.latestReferral && (
                      <span className={`badge ${c.latestReferral.Status === 'Pending' ? 'badge-yellow' : 'badge-blue'}`}>
                        Ref: {c.latestReferral.Status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Form quick actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <button
                    onClick={() => navigate(`/field/screening/new?clientId=${c.Client_ID}`)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', flex: 1 }}
                  >
                    📝 Screen Client
                  </button>
                  <button
                    onClick={() => navigate(`/field/referral/new?clientId=${c.Client_ID}`)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', flex: 1 }}
                  >
                    🚑 Send Referral
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
