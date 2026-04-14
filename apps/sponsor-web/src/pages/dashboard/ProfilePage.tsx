import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Profile {
  company_name:        string
  industry:            string
  website_url:         string
  contact_person:      string
  partnership_type:    string
  partnership_status:  string
  partnership_start_date: string | null
  business_registration: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'active', pending: 'pending', suspended: 'inactive',
}

export default function ProfilePage() {
  const { sponsor }               = useAuth()
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [form,    setForm]        = useState<Partial<Profile>>({})
  const [saving,  setSaving]      = useState(false)
  const [msg,     setMsg]         = useState('')

  useEffect(() => { if (sponsor?.id) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('sponsors')
      .select('company_name, industry, website_url, contact_person, partnership_type, partnership_status, partnership_start_date, business_registration')
      .eq('sponsor_id', sponsor!.id)
      .single()
    setProfile(data)
    setForm(data ?? {})
    setLoading(false)
  }

  const set = (k: keyof Profile, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('sponsors').update({
      company_name:   form.company_name,
      website_url:    form.website_url,
      contact_person: form.contact_person,
    }).eq('sponsor_id', sponsor!.id)

    if (error) { setMsg(error.message); setSaving(false); return }
    await load()
    setEditing(false)
    setMsg('Profile updated.')
    setSaving(false)
  }

  if (loading) return <div className="sp-page"><div className="sp-loading-state">Loading…</div></div>

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1>Company Profile</h1>
        {!editing && <button className="sp-btn-secondary" onClick={() => { setEditing(true); setMsg('') }}>Edit Profile</button>}
      </div>

      {msg && <div className={`sp-msg ${msg.startsWith('Profile') ? 'success' : 'error'}`}>{msg}</div>}

      <div className="sp-profile-card">
        <div className="sp-profile-avatar-lg">{profile?.company_name?.charAt(0)?.toUpperCase()}</div>
        <div className="sp-profile-info-block">
          {editing ? (
            <input className="sp-profile-name-input" value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} />
          ) : (
            <h2>{profile?.company_name}</h2>
          )}
          <span className={`sp-badge ${STATUS_COLORS[profile?.partnership_status ?? ''] ?? 'inactive'}`}>
            {profile?.partnership_status ?? '—'}
          </span>
        </div>
      </div>

      <div className="sp-profile-grid">
        <div className="sp-profile-section">
          <h3>Business Details</h3>
          <div className="sp-profile-field"><label>Registration No.</label><span>{profile?.business_registration || '—'}</span></div>
          <div className="sp-profile-field"><label>Industry</label><span>{profile?.industry || '—'}</span></div>
          <div className="sp-profile-field"><label>Partnership Type</label><span>{profile?.partnership_type || '—'}</span></div>
          <div className="sp-profile-field"><label>Partner Since</label>
            <span>{profile?.partnership_start_date ? new Date(profile.partnership_start_date).toLocaleDateString('en-MY') : '—'}</span>
          </div>
        </div>

        <div className="sp-profile-section">
          <h3>Contact</h3>
          <div className="sp-profile-field">
            <label>Contact Person</label>
            {editing
              ? <input value={form.contact_person ?? ''} onChange={e => set('contact_person', e.target.value)} />
              : <span>{profile?.contact_person || '—'}</span>}
          </div>
          <div className="sp-profile-field">
            <label>Email</label>
            <span>{sponsor?.email}</span>
          </div>
          <div className="sp-profile-field">
            <label>Website</label>
            {editing
              ? <input type="url" value={form.website_url ?? ''} onChange={e => set('website_url', e.target.value)} placeholder="https://..." />
              : <span>{profile?.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer">{profile.website_url}</a> : '—'}</span>}
          </div>
        </div>
      </div>

      {editing && (
        <div className="sp-profile-actions">
          <button className="sp-btn-secondary" onClick={() => { setEditing(false); setForm(profile ?? {}) }}>Cancel</button>
          <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
