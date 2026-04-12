import { useState } from 'react'
import { supabaseAdmin } from '../lib/supabase-admin'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  // Ensure at least one of each required type
  const pwd = [
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    ...Array.from({ length: 7 }, () => all[Math.floor(Math.random() * all.length)]),
  ]
  return pwd.sort(() => Math.random() - 0.5).join('')
}

export default function AddCollectorModal({ onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [createdPassword, setCreatedPassword] = useState('')

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }
    setLoading(true)
    setError('')

    const password = generatePassword()

    try {
      // Create auth user via service role (bypasses email confirmation)
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim(), phone: phone.trim(), user_type: 'Collector' },
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

      // Insert into collectors table
      const { error: collectorErr } = await supabase
        .from('collectors')
        .insert({ user_id: userData.user_id })
      if (collectorErr) throw collectorErr

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
            <h3>Collector Account Created</h3>
          </div>
          <div className="modal-body">
            <p>Account created for <strong>{fullName}</strong> ({email}).</p>
            <p className="modal-hint">Share this one-time password with the collector:</p>
            <div className="otp-display">{createdPassword}</div>
            <p className="otp-note">The collector should change this password after their first login.</p>
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
          <h3>Add New Collector</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
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
              placeholder="collector@example.com"
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
          <p className="modal-hint">A one-time password will be generated and shown after creation.</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
