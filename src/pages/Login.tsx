import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '8px', filter: 'drop-shadow(0 4px 8px rgba(15,118,110,0.15))' }}>🌿</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', letterSpacing: '-0.03em' }}>Mindvibe</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>3-Tiered Mental Health Support Platform</p>
        </div>

        {/* Demo credentials hint */}
        <div style={{
          marginBottom: '20px', padding: '12px 16px',
          background: 'var(--primary-light)', borderRadius: '10px',
          fontSize: '0.85rem', color: 'var(--primary-dark)', border: '1px solid #ccfbf1', lineHeight: '1.6',
        }}>
          <strong>Clinical Portals logins:</strong><br />
          FocalPoint / FocalPoint &nbsp;·&nbsp; CPSS / CPSS &nbsp;·&nbsp; CETA / CETA
        </div>

        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Community Mental Health Services
        </p>
      </div>
    </div>
  )
}
