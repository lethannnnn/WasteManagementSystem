import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabaseAdmin } from '../lib/supabase-admin'
import { supabase } from '../lib/supabase'
import type { SponsorInquiry } from '../types'
import { useToast } from '../context/ToastContext'

interface Props {
  inquiry: SponsorInquiry
  onBack:  () => void
}

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

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="sip-field">
      <span className="sip-field-label">{label}</span>
      <span className="sip-field-value">{value}</span>
    </div>
  )
}

export default function SponsorInquiryPanel({ inquiry, onBack }: Props) {
  const queryClient     = useQueryClient()
  const { toast }       = useToast()
  const [busy, setBusy] = useState(false)
  const [approvedPassword, setApprovedPassword] = useState('')
  const [showRejectForm, setShowRejectForm]     = useState(false)
  const [rejectReason, setRejectReason]         = useState('')
  const [docUrl, setDocUrl]                     = useState<string | null>(null)

  // Generate a signed URL for the document
  useEffect(() => {
    if (!inquiry.doc_url) return
    // If it looks like a storage path (contains '/'), generate a signed URL
    if (inquiry.doc_url.includes('/')) {
      supabaseAdmin.storage
        .from('sponsor-docs')
        .createSignedUrl(inquiry.doc_url, 3600)
        .then(({ data }) => { if (data?.signedUrl) setDocUrl(data.signedUrl) })
    }
  }, [inquiry.doc_url])

  const isPdf = inquiry.doc_url?.toLowerCase().endsWith('.pdf') ||
                inquiry.doc_url?.toLowerCase().includes('.pdf')

  const handleApprove = async () => {
    setBusy(true)
    const password = generatePassword()

    try {
      // Check if auth user already exists
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers()
      const existingAuthUser = existingList?.users?.find(u => u.email === inquiry.email)

      let userId: string

      if (existingAuthUser) {
        userId = existingAuthUser.id

        const { data: existingSponsor } = await supabaseAdmin
          .from('sponsors')
          .select('sponsor_id')
          .eq('user_id', existingAuthUser.id)
          .single()

        if (existingSponsor) {
          // Sponsor fully exists — previous run completed but status update failed.
          // Reset password and fall through to fix status.
          await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password })
        } else {
          // Orphaned auth user (previous failed attempt) — reuse it
          await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password })
          await supabaseAdmin.from('users').upsert({
            user_id:   existingAuthUser.id,
            email:     inquiry.email,
            full_name: inquiry.contact_person || inquiry.company_name,
            user_type: 'sponsor',
            is_active: true,
          }, { onConflict: 'user_id', ignoreDuplicates: false })

          const { error: sponsorErr } = await supabaseAdmin.from('sponsors').insert({
            user_id:                userId,
            company_name:           inquiry.company_name,
            industry:               inquiry.industry         || null,
            website_url:            inquiry.website          || null,
            contact_person:         inquiry.contact_person   || null,
            partnership_type:       inquiry.partnership_type || null,
            partnership_status:     'active',
            partnership_start_date: new Date().toISOString().split('T')[0],
          })
          if (sponsorErr) throw new Error(sponsorErr.message)
        }

        // Ensure user is marked active (trigger may not set this)
        await supabaseAdmin.from('users').update({ is_active: true }).eq('user_id', userId)

      } else {
        // Create new auth user
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email:         inquiry.email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: inquiry.contact_person || inquiry.company_name,
            user_type: 'sponsor',
            phone:     inquiry.phone,
          },
        })
        if (authErr) {
          console.error('[createUser]', authErr)
          throw new Error(`Auth error: ${authErr.message}`)
        }

        // Wait for handle_new_user trigger then ensure is_active is set
        await new Promise(r => setTimeout(r, 1200))

        const { data: userData, error: userErr } = await supabaseAdmin
          .from('users')
          .select('user_id')
          .eq('email', inquiry.email)
          .single()
        if (userErr || !userData) throw new Error('User created but profile not found. Refresh and check.')
        userId = userData.user_id

        // Trigger doesn't set is_active — set it explicitly
        await supabaseAdmin.from('users').update({ is_active: true }).eq('user_id', userId)

        const { error: sponsorErr } = await supabaseAdmin.from('sponsors').insert({
          user_id:                userId,
          company_name:           inquiry.company_name,
          industry:               inquiry.industry         || null,
          website_url:            inquiry.website          || null,
          contact_person:         inquiry.contact_person   || null,
          partnership_type:       inquiry.partnership_type || null,
          partnership_status:     'active',
          partnership_start_date: new Date().toISOString().split('T')[0],
        })
        if (sponsorErr) throw new Error(sponsorErr.message)
      }

      const { error: statusErr } = await supabaseAdmin
        .from('sponsor_inquiries').update({ status: 'approved' }).eq('id', inquiry.id)
      if (statusErr) console.error('[approve] status update failed:', statusErr)

      queryClient.invalidateQueries({ queryKey: ['sponsor-inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-bell'] })
      setApprovedPassword(password)

      // Non-blocking approval email
      supabase.functions.invoke('send-sponsor-email', {
        body: { type: 'approval', name: inquiry.contact_person, email: inquiry.email, company: inquiry.company_name, password },
      }).catch(() => {})

    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast('Please provide a rejection reason.', 'error'); return }
    setBusy(true)
    try {
      const { error: rejectErr } = await supabaseAdmin
        .from('sponsor_inquiries')
        .update({ status: 'rejected', rejection_reason: rejectReason.trim() })
        .eq('id', inquiry.id)
      if (rejectErr) throw new Error(rejectErr.message)

      // Delete any orphaned auth/user/sponsor records for this email
      // so re-approval starts fresh (resets has_logged_in, is_active, etc.)
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers()
      const orphaned = authList?.users?.find(u => u.email === inquiry.email)
      if (orphaned) {
        await supabaseAdmin.from('sponsors').delete().eq('user_id', orphaned.id)
        await supabaseAdmin.from('users').delete().eq('user_id', orphaned.id)
        await supabaseAdmin.auth.admin.deleteUser(orphaned.id)
      }

      queryClient.invalidateQueries({ queryKey: ['sponsor-inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-bell'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Non-blocking rejection email
      supabase.functions.invoke('send-sponsor-email', {
        body: { type: 'rejection', name: inquiry.contact_person, email: inquiry.email, company: inquiry.company_name, reason: rejectReason.trim() },
      }).catch(() => {})

      toast('Application rejected')
      onBack()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (approvedPassword) {
    return (
      <div className="sip-wrap">
        <div className="sip-approved-card">
          <div className="sip-approved-icon">✓</div>
          <h2>Sponsor Account Created</h2>
          <p>Account created for <strong>{inquiry.company_name}</strong>.</p>
          <p className="sip-hint">
            Login credentials have been emailed to <strong>{inquiry.email}</strong>.<br/>
            The sponsor will be prompted to change their password on first login.
          </p>
          <button className="modal-btn primary" onClick={onBack}>Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sip-wrap">
      <div className="sip-header">
        <button className="ud-back-inline-btn" onClick={onBack}>← Back to list</button>
        <span className={`sip-status-badge ${inquiry.status}`}>{inquiry.status.toUpperCase()}</span>
      </div>

      <div className="sip-layout">

        {/* ── LEFT: Info ── */}
        <div className="sip-info-col">
          <div className="sip-section">
            <h3>Company Information</h3>
            <Field label="Company Name"    value={inquiry.company_name} />
            <Field label="Industry"        value={inquiry.industry} />
            <Field label="Company Size"    value={inquiry.company_size} />
            <Field label="Website"         value={inquiry.website} />
          </div>

          <div className="sip-section">
            <h3>Contact Information</h3>
            <Field label="Contact Person"  value={inquiry.contact_person} />
            <Field label="Position"        value={inquiry.position} />
            <Field label="Email"           value={inquiry.email} />
            <Field label="Phone"           value={inquiry.phone} />
          </div>

          <div className="sip-section">
            <h3>Partnership Details</h3>
            <Field label="Type"            value={inquiry.partnership_type} />
            <Field label="Monthly Budget"  value={inquiry.budget} />
            <Field label="Objectives"      value={inquiry.objectives} />
            <Field label="Sustainability"  value={inquiry.sustainability_goals} />
            <Field label="Additional Info" value={inquiry.additional_info} />
          </div>

          <div className="sip-section">
            <h3>Application</h3>
            <Field label="Submitted" value={new Date(inquiry.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })} />
            {inquiry.rejection_reason && <Field label="Rejection Reason" value={inquiry.rejection_reason} />}
          </div>

          {inquiry.status === 'pending' && (
            <div className="sip-actions">
              {!showRejectForm ? (
                <>
                  <button className="modal-btn primary" onClick={handleApprove} disabled={busy}>
                    {busy ? 'Processing…' : 'Approve & Create Account'}
                  </button>
                  <button className="modal-btn danger" onClick={() => setShowRejectForm(true)} disabled={busy}>
                    Reject
                  </button>
                </>
              ) : (
                <div className="sip-reject-form">
                  <label htmlFor="reject-reason">Reason for rejection *</label>
                  <textarea
                    id="reject-reason"
                    name="rejectReason"
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why the application was rejected (shown to sponsor)"
                  />
                  <div className="sip-reject-btns">
                    <button className="modal-btn secondary" onClick={() => setShowRejectForm(false)} disabled={busy}>Cancel</button>
                    <button className="modal-btn danger" onClick={handleReject} disabled={busy}>
                      {busy ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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

          {!inquiry.doc_url ? (
            <div className="sip-doc-empty">No document uploaded</div>
          ) : !docUrl ? (
            <div className="sip-doc-empty">Loading document…</div>
          ) : isPdf ? (
            <iframe
              src={docUrl}
              className="sip-doc-iframe"
              title="Sponsor document"
            />
          ) : (
            <img src={docUrl} alt="Sponsor document" className="sip-doc-img" />
          )}
        </div>

      </div>
    </div>
  )
}
