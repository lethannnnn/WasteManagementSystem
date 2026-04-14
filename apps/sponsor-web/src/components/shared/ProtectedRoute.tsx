import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface InquiryStatus {
  company_name:     string
  created_at:       string
  rejection_reason: string | null
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { sponsor, loading } = useAuth()
  const [inquiry, setInquiry] = useState<InquiryStatus | null>(null)

  useEffect(() => {
    if (!sponsor || sponsor.partnership_status === 'active') return
    supabase
      .from('sponsor_inquiries')
      .select('company_name, created_at, rejection_reason')
      .eq('email', sponsor.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setInquiry(data) })
  }, [sponsor])

  if (loading) return <div className="sp-full-loading"><div className="sp-spinner" /></div>
  if (!sponsor) return <Navigate to="/login" replace />

  if (sponsor.partnership_status !== 'active') {
    const isPending = sponsor.partnership_status === 'pending'
    return (
      <div className="sp-status-gate">
        <div className="sp-status-card">
          <div className={`sp-status-icon ${isPending ? 'pending' : 'rejected'}`}>
            {isPending ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
          </div>

          <h2>{isPending ? 'Application Under Review' : 'Application Not Approved'}</h2>

          {inquiry && <p className="sp-status-company">{inquiry.company_name}</p>}

          <p>
            {isPending
              ? "Your partnership application is being reviewed by our team. We'll notify you by email once a decision is made."
              : 'Your application was not approved.'}
          </p>

          {!isPending && inquiry?.rejection_reason && (
            <div className="sp-status-reason">
              <strong>Reason:</strong> {inquiry.rejection_reason}
            </div>
          )}

          {inquiry && (
            <p className="sp-status-date">
              Submitted {new Date(inquiry.created_at).toLocaleDateString('en-MY', { dateStyle: 'long' })}
            </p>
          )}

          {!isPending && (
            <p className="sp-status-contact">
              Questions? Email <a href="mailto:support@mycycle.my">support@mycycle.my</a>
            </p>
          )}

          <button className="sp-btn-secondary" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
