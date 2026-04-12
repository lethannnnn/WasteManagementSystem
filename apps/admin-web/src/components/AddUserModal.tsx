import { useState } from 'react'
import { supabaseAdmin } from '../lib/supabase-admin'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

type UserType = 'Donor' | 'Collector' | 'Sponsor'

function generatePassword(): string {
  const upper  = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower  = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all    = upper + lower + digits
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    ...Array.from({ length: 7 }, () => all[Math.floor(Math.random() * all.length)]),
  ]
  return pwd.sort(() => Math.random() - 0.5).join('')
}

export default function AddUserModal({ onClose, onSuccess }: Props) {
  const [userType, setUserType]             = useState<UserType>('Collector')
  const [fullName, setFullName]             = useState('')
  const [email, setEmail]                   = useState('')
  const [phone, setPhone]                   = useState('')
  const [companyName, setCompanyName]       = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (userType === 'Sponsor' && !companyName.trim()) {
      setError('Company name is required for sponsors.')
      return
    }
    setLoading(true)
    setError('')

    const password = generatePassword()

    try {
      // Create auth user via service role (bypasses email confirmation)
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email:          email.trim(),
        password,
        email_confirm:  true,
        user_metadata:  { full_name: fullName.trim(), phone: phone.trim(), user_type: userType },
      })
      if (authError) throw authError

      // Wait for handle_new_user trigger to insert into users table
      await new Promise(r => setTimeout(r, 1200))

      // Fetch the newly created users row
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email.trim())
        .single()
      if (userErr) throw new Error('User created but profile not found. Refresh and check.')

      // Insert into the role-specific table
      if (userType === 'Collector') {
        const { error: e } = await supabase.from('collectors').insert({ user_id: userData.user_id })
        if (e) throw e
        // Send OTP email (non-blocking)
        supabase.functions.invoke('send-collector-otp', {
          body: { name: fullName.trim(), email: email.trim(), password },
        }).catch(err => console.warn('[OTP email] send failed:', err))
      } else if (userType === 'Donor') {
        const { error: e } = await supabase.from('donors').insert({ user_id: userData.user_id })
        if (e) throw e
      } else if (userType === 'Sponsor') {
        const { error: e } = await supabase.from('sponsors').insert({
          user_id:      userData.user_id,
          company_name: companyName.trim(),
        })
        if (e) throw e
      }

      setCreatedPassword(password)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (createdPassword) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h3>{userType} Account Created</h3>
          </div>
          <div className="modal-body">
            <p>Account created for <strong>{fullName}</strong> ({email}).</p>
            <p className="modal-hint">Share this one-time password with the user:</p>
            <div className="otp-display">{createdPassword}</div>
            <p className="otp-note">The user must change this password after their first login.</p>
          </div>
          <div className="modal-footer">
            <button className="modal-btn primary" onClick={() => { onSuccess(); onClose() }}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-field">
            <label>User Type <span className="required">*</span></label>
            <div className="modal-type-tabs">
              {(['Donor', 'Collector', 'Sponsor'] as UserType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`modal-type-tab${userType === t ? ' active' : ''}`}
                  onClick={() => setUserType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <label>Full Name <span className="required">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Ahmad bin Ali"
              autoFocus
            />
          </div>
          <div className="modal-field">
            <label>Email <span className="required">*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="modal-field">
            <label>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+60 12-345 6789"
            />
          </div>

          {userType === 'Sponsor' && (
            <div className="modal-field">
              <label>Company Name <span className="required">*</span></label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="e.g. EcoMart Sdn Bhd"
              />
            </div>
          )}

          <p className="modal-hint">A one-time password will be generated and shown after creation.</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : `Create ${userType}`}
          </button>
        </div>
      </div>
    </div>
  )
}
