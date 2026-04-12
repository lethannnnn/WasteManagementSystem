import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface PendingPickup {
  id: string
  donor: string
  created_at: string
}

async function fetchPending() {
  const { data, count } = await supabase
    .from('pickups')
    .select('pickup_id, created_at, donors(users(full_name))', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const items: PendingPickup[] = (data ?? []).map(p => ({
    id:         p.pickup_id,
    donor:      (p.donors as any)?.users?.full_name ?? 'Unknown',
    created_at: p.created_at,
  }))

  return { count: count ?? 0, items }
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

  const { data } = useQuery({
    queryKey: ['notifications-bell'],
    queryFn:  fetchPending,
    refetchInterval: 60_000,
  })

  const count = data?.count ?? 0
  const items = data?.items ?? []

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className={`notif-bell-btn${count > 0 ? ' has-notif' : ''}`} onClick={() => setOpen(o => !o)} aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Pending Pickups</span>
            {count > 0 && <span className="notif-count-label">{count} pending</span>}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">No pending pickups</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="notif-item">
                <div className="notif-dot" />
                <div className="notif-item-body">
                  <span className="notif-item-name">{item.donor}</span>
                  <span className="notif-item-meta">requested a pickup · {timeAgo(item.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
