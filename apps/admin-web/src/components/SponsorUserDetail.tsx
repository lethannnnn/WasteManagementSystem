import { useEffect, useState } from 'react'
import { supabaseAdmin } from '../lib/supabase-admin'
import type { User, SponsorInquiry } from '../types'

interface Props {
  user:       User
  inquiry:    SponsorInquiry | undefined
  onBack:     () => void
  onDeactivate: () => void
  onDelete:   () => void
  onRemind:   () => void
  isDefaultAdmin: boolean
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="sip-field">
      <span className="sip-field-label">{label}</span>
      <span className="sip-field-value">{value}</span>
    </div>
  )
}

export default function SponsorUserDetail({ user, inquiry, onBack, onDeactivate, onDelete, onRemind, isDefaultAdmin }: Props) {
  const [docUrl, setDocUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!inquiry?.doc_url) return
    if (inquiry.doc_url.includes('/')) {
      supabaseAdmin.storage
        .from('sponsor-docs')
        .createSignedUrl(inquiry.doc_url, 3600)
        .then(({ data }) => { if (data?.signedUrl) setDocUrl(data.signedUrl) })
    }
  }, [inquiry?.doc_url])

  const isPdf = inquiry?.doc_url?.toLowerCase().includes('.pdf')

  const statusLabel = !user.hasLoggedIn && user.status === 'Active'
    ? 'awaiting' : user.status.toLowerCase()
  const statusText  = !user.hasLoggedIn && user.status === 'Active'
    ? 'Awaiting Activation' : user.status

  return (
    <div className="sip-wrap">
      <div className="sip-header">
        <button className="ud-back-inline-btn" onClick={onBack}>← Back to list</button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`user-type sponsor`}>Sponsor</span>
          <span className={`status ${statusLabel}`}>{statusText}</span>
        </div>
      </div>

      <div className="sip-layout">

        {/* ── LEFT: Info ── */}
        <div className="sip-info-col">
          <div className="sip-section">
            <h3>Company Information</h3>
            <Field label="Company Name"   value={user.company_name} />
            <Field label="Industry"       value={inquiry?.industry} />
            <Field label="Company Size"   value={inquiry?.company_size} />
            <Field label="Website"        value={inquiry?.website} />
          </div>

          <div className="sip-section">
            <h3>Contact Information</h3>
            <Field label="Contact Person" value={inquiry ? [inquiry.salutation, inquiry.contact_person].filter(Boolean).join(' ') : undefined} />
            <Field label="Position"       value={inquiry?.position} />
            <Field label="Email"          value={user.email} />
            <Field label="Phone"          value={inquiry?.phone} />
            <Field label="Office State"   value={inquiry?.office_state} />
            <Field label="LinkedIn"       value={inquiry?.linkedin} />
          </div>

          <div className="sip-section">
            <h3>Partnership Details</h3>
            <Field label="Type"           value={inquiry?.partnership_type} />
            <Field label="Monthly Budget" value={inquiry?.budget} />
            <Field label="Objectives"     value={inquiry?.objectives} />
            <Field label="Sustainability" value={inquiry?.sustainability_goals} />
          </div>

          <div className="sip-section">
            <h3>Account</h3>
            <Field label="Member Since"   value={user.joinDate} />
            <Field label="Submitted"      value={inquiry ? new Date(inquiry.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' }) : undefined} />
          </div>

          <div className="sip-actions">
            {!user.hasLoggedIn && user.status === 'Active' && (
              <button className="reminder-btn" onClick={onRemind}>Send Reminder Email</button>
            )}
            {!isDefaultAdmin && (
              <>
                <button
                  className={user.status === 'Active' ? 'ud-deactivate-btn' : 'ud-reactivate-btn'}
                  onClick={onDeactivate}
                >
                  {user.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                </button>
                <button className="ud-delete-btn" onClick={onDelete}>Delete</button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Document ── */}
        <div className="sip-doc-col">
          <div className="sip-doc-header">
            <h3>Uploaded Document</h3>
            {docUrl && (
              <a href={docUrl} target="_blank" rel="noreferrer" className="sip-doc-open">
                Open in new tab ↗
              </a>
            )}
          </div>

          {!inquiry?.doc_url ? (
            <div className="sip-doc-empty">No document uploaded</div>
          ) : !docUrl ? (
            <div className="sip-doc-empty">Loading document…</div>
          ) : isPdf ? (
            <iframe src={docUrl} className="sip-doc-iframe" title="Sponsor document" />
          ) : (
            <img src={docUrl} alt="Sponsor document" className="sip-doc-img" />
          )}
        </div>

      </div>
    </div>
  )
}
