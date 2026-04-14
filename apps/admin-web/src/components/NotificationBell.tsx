import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'

interface PendingPickup   { id: string; donor: string;   created_at: string }
interface PendingInquiry  { id: string; company: string; created_at: string }
interface PendingSubmission { id: string; reward_name: string; sponsor: string; created_at: string }

async function fetchNotifications() {
  const [pickupsRes, inquiriesRes, submissionsRes] = await Promise.all([
    supabase
      .from('pickups')
      .select('pickup_id, created_at, donors(users(full_name))', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('sponsor_inquiries')
      .select('id, company_name, created_at', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('reward_submissions')
      .select('submission_id, reward_name, created_at, sponsors(company_name)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pickups: PendingPickup[] = (pickupsRes.data ?? []).map((p: any) => ({
    id:         p.pickup_id,
    donor:      p.donors?.users?.full_name ?? 'Unknown',
    created_at: p.created_at,
  }))

  const inquiries: PendingInquiry[] = (inquiriesRes.data ?? []).map((i: any) => ({
    id:         i.id,
    company:    i.company_name,
    created_at: i.created_at,
  }))

  const rewardSubmissions: PendingSubmission[] = (submissionsRes.data ?? []).map((s: any) => ({
    id:          s.submission_id,
    reward_name: s.reward_name,
    sponsor:     (s.sponsors as any)?.company_name ?? '—',
    created_at:  s.created_at,
  }))

  return {
    pickupCount:     pickupsRes.count     ?? 0,
    inquiryCount:    inquiriesRes.count   ?? 0,
    submissionCount: submissionsRes.count ?? 0,
    pickups,
    inquiries,
    rewardSubmissions,
  }
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  const { data } = useQuery({
    queryKey: ['notifications-bell'],
    queryFn:  fetchNotifications,
    refetchInterval: 60_000,
  })

  const totalCount       = (data?.pickupCount ?? 0) + (data?.inquiryCount ?? 0) + (data?.submissionCount ?? 0)
  const pickups          = data?.pickups           ?? []
  const inquiries        = data?.inquiries         ?? []
  const rewardSubmissions = data?.rewardSubmissions ?? []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button
        className={`notif-bell-btn${totalCount > 0 ? ' has-notif' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {totalCount > 0 && (
          <span className="notif-badge">{totalCount > 9 ? '9+' : totalCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">

          {/* Pending pickups */}
          <div className="notif-dropdown-header">
            <span>Pending Pickups</span>
            {(data?.pickupCount ?? 0) > 0 && (
              <span className="notif-count-label">{data?.pickupCount} pending</span>
            )}
          </div>
          {pickups.length === 0 ? (
            <div className="notif-empty">No pending pickups</div>
          ) : (
            pickups.map(item => (
              <div key={item.id} className="notif-item">
                <div className="notif-dot" />
                <div className="notif-item-body">
                  <span className="notif-item-name">{item.donor}</span>
                  <span className="notif-item-meta">requested a pickup · {timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}

          {/* Sponsor applications */}
          <div className="notif-dropdown-header notif-section-divider">
            <span>Sponsor Applications</span>
            {(data?.inquiryCount ?? 0) > 0 && (
              <span className="notif-count-label notif-count-warn">{data?.inquiryCount} pending</span>
            )}
          </div>
          {inquiries.length === 0 ? (
            <div className="notif-empty">No pending applications</div>
          ) : (
            inquiries.map(item => (
              <div
                key={item.id}
                className="notif-item notif-item-clickable"
                onClick={() => { navigate('/users?tab=sponsor'); setOpen(false) }}
              >
                <div className="notif-dot notif-dot-warn" />
                <div className="notif-item-body">
                  <span className="notif-item-name">{item.company}</span>
                  <span className="notif-item-meta">applied to partner · {timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}

          {/* Reward submissions */}
          <div className="notif-dropdown-header notif-section-divider">
            <span>Reward Submissions</span>
            {(data?.submissionCount ?? 0) > 0 && (
              <span className="notif-count-label notif-count-warn">{data?.submissionCount} pending</span>
            )}
          </div>
          {rewardSubmissions.length === 0 ? (
            <div className="notif-empty">No pending submissions</div>
          ) : (
            rewardSubmissions.map(item => (
              <div
                key={item.id}
                className="notif-item notif-item-clickable"
                onClick={() => { navigate('/rewards?tab=submissions'); setOpen(false) }}
              >
                <div className="notif-dot notif-dot-warn" />
                <div className="notif-item-body">
                  <span className="notif-item-name">{item.reward_name}</span>
                  <span className="notif-item-meta">{item.sponsor} · {timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}

        </div>
      )}
    </div>
  )
}
