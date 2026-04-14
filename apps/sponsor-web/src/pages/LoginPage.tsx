import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate               = useNavigate()
  const { sponsor, loading }   = useAuth()
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]   = useState('')
  const [btnBusy,  setBtnBusy] = useState(false)

  // Navigate once AuthContext confirms the sponsor is loaded
  useEffect(() => {
    if (!loading && sponsor) navigate('/dashboard', { replace: true })
  }, [loading, sponsor])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBtnBusy(true)
    setError('')

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setBtnBusy(false) }
    // On success: onAuthStateChange fires → AuthContext sets loading=true then loads sponsor
    // → useEffect above navigates when sponsor is ready
  }

  return (
    <div className="sp-login-page">
      <div className="sp-login-left">
        <div className="sp-login-brand">
          <Link to="/" className="sp-login-logo"><img src="/mycycle-logo.png" alt="MyCycle+" /></Link>
          <h2>Welcome back, Partner</h2>
          <p>Access your campaign dashboard, manage rewards, and track performance.</p>
          <div className="sp-login-stats">
            <div className="sp-login-stat">
              <span className="sp-login-stat-num">10K+</span>
              <span>Active Donors</span>
            </div>
            <div className="sp-login-stat">
              <span className="sp-login-stat-num">500+</span>
              <span>Tons Recycled</span>
            </div>
            <div className="sp-login-stat">
              <span className="sp-login-stat-num">50+</span>
              <span>Partner Brands</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sp-login-right">
        <div className="sp-login-card">
          <h1>Partner Login</h1>
          <p className="sp-login-sub">Sign in to your sponsor account</p>

          <form className="sp-login-form" onSubmit={handleLogin}>
            <div className="sp-form-group">
              <label htmlFor="login-email">Business Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
                required
                autoFocus
              />
            </div>

            <div className="sp-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>

            {error && <div className="sp-form-error">{error}</div>}

            <button type="submit" className="sp-btn-primary full" disabled={btnBusy || loading}>
              {btnBusy || loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="sp-login-footer">
            <p>Don't have an account? <Link to="/register">Apply to partner</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
