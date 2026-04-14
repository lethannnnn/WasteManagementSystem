import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Profile {
  // from sponsors table
  company_name:           string
  industry:               string
  website_url:            string
  contact_person:         string
  partnership_type:       string
  partnership_status:     string
  partnership_start_date: string | null
  business_registration:  string
  // from sponsor_inquiries
  salutation:             string
  position:               string
  phone:                  string
  office_state:           string
  linkedin:               string
}

type EditableFields = Pick<Profile, 'company_name' | 'website_url' | 'contact_person' | 'position' | 'phone'>

const STATUS_COLORS: Record<string, string> = {
  active: 'active', pending: 'pending', suspended: 'inactive',
}

export default function ProfilePage() {
  const { sponsor }             = useAuth()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [form,    setForm]      = useState<Partial<EditableFields>>({})
  const [saving,  setSaving]    = useState(false)
  const [msg,     setMsg]       = useState('')

  useEffect(() => { if (sponsor?.id && sponsor?.email) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)
    const [{ data: sp }, { data: inq }] = await Promise.all([
      supabase
        .from('sponsors')
        .select('company_name, industry, website_url, contact_person, partnership_type, partnership_status, partnership_start_date, business_registration')
        .eq('sponsor_id', sponsor!.id)
        .single(),
      supabase
        .from('sponsor_inquiries')
        .select('salutation, position, phone, office_state, linkedin, contact_person, industry, website_url, company_name')
        .eq('email', sponsor!.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    const merged: Profile = {
      company_name:           sp?.company_name           || inq?.company_name    || '',
      industry:               sp?.industry               || inq?.industry        || '',
      website_url:            sp?.website_url            || inq?.website_url     || '',
      contact_person:         sp?.contact_person         || inq?.contact_person  || '',
      partnership_type:       sp?.partnership_type       || '',
      partnership_status:     sp?.partnership_status     || '',
      partnership_start_date: sp?.partnership_start_date || null,
      business_registration:  sp?.business_registration  || '',
      salutation:             inq?.salutation            || '',
      position:               inq?.position              || '',
      phone:                  inq?.phone                 || '',
      office_state:           inq?.office_state          || '',
      linkedin:               inq?.linkedin              || '',
    }
    setProfile(merged)
    setForm({
      company_name:   merged.company_name,
      website_url:    merged.website_url,
      contact_person: merged.contact_person,
      position:       merged.position,
      phone:          merged.phone,
    })
    setLoading(false)
  }

  const set = (k: keyof EditableFields, v: string) => setForm(prev => ({ ...prev, [k]: v }))

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

  const contactName = [profile?.salutation, profile?.contact_person].filter(Boolean).join(' ')

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
          {profile?.office_state && (
            <div className="sp-profile-field"><label>Office State</label><span>{profile.office_state}</span></div>
          )}
        </div>

        <div className="sp-profile-section">
          <h3>Contact</h3>
          <div className="sp-profile-field">
            <label>Contact Person</label>
            {editing
              ? <input value={form.contact_person ?? ''} onChange={e => set('contact_person', e.target.value)} />
              : <span>{contactName || '—'}</span>}
          </div>
          {(profile?.position || editing) && (
            <div className="sp-profile-field">
              <label>Position</label>
              {editing
                ? <input value={form.position ?? ''} onChange={e => set('position', e.target.value)} placeholder="e.g. Marketing Manager" />
                : <span>{profile?.position || '—'}</span>}
            </div>
          )}
          <div className="sp-profile-field">
            <label>Email</label>
            <span>{sponsor?.email}</span>
          </div>
          <div className="sp-profile-field">
            <label>Phone</label>
            {editing
              ? <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+60 12-345 6789" />
              : <span>{profile?.phone || '—'}</span>}
          </div>
          <div className="sp-profile-field">
            <label>Website</label>
            {editing
              ? <input type="url" value={form.website_url ?? ''} onChange={e => set('website_url', e.target.value)} placeholder="https://..." />
              : <span>{profile?.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer">{profile.website_url}</a> : '—'}</span>}
          </div>
          {profile?.linkedin && (
            <div className="sp-profile-field">
              <label>LinkedIn</label>
              <span><a href={profile.linkedin} target="_blank" rel="noreferrer">{profile.linkedin}</a></span>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="sp-profile-actions">
          <button className="sp-btn-secondary" onClick={() => { setEditing(false); setForm({ company_name: profile?.company_name, website_url: profile?.website_url, contact_person: profile?.contact_person, position: profile?.position, phone: profile?.phone }) }}>Cancel</button>
          <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
