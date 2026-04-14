import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onDone: () => void
}

export default function ChangePasswordModal({ onDone }: Props) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [showPwd, setShowPwd]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onDone()
  }

  return (
    <div className="cpw-overlay">
      <div className="cpw-modal">
        <div className="cpw-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2>Change Your Password</h2>
        <p className="cpw-hint">
          You are using a temporary password provided by MyCycle+.<br/>
          Please set a new password before continuing.
        </p>

        <form onSubmit={handleSubmit} className="cpw-form">
          <div className="cpw-field">
            <label htmlFor="cpw-new">New Password</label>
            <div className="cpw-input-wrap">
              <input
                id="cpw-new"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                required
              />
              <button type="button" className="cpw-toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="cpw-field">
            <label htmlFor="cpw-confirm">Confirm Password</label>
            <input
              id="cpw-confirm"
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
            />
          </div>

          {error && <p className="cpw-error">{error}</p>}

          <button type="submit" className="sp-btn-primary cpw-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
