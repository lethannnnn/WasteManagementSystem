import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'
import type { Reward, RewardSubmission } from '../types'
import AddRewardModal from '../components/AddRewardModal'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('reward_id, reward_name, points_required, category, stock_quantity, redeemed_count, is_active, sponsors(company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id:          r.reward_id,
    name:        r.reward_name,
    points:      r.points_required,
    category:    r.category ?? 'General',
    stock:       r.stock_quantity ?? 0,
    redeemed:    r.redeemed_count ?? 0,
    isActive:    r.is_active ?? true,
    sponsorName: (r.sponsors as any)?.company_name ?? null,
  }))
}

async function fetchSubmissions(): Promise<RewardSubmission[]> {
  const { data, error } = await supabaseAdmin
    .from('reward_submissions')
    .select('*, sponsors(company_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    submission_id:   r.submission_id,
    sponsor_id:      r.sponsor_id,
    reward_name:     r.reward_name,
    description:     r.description,
    points_required: r.points_required,
    stock_quantity:  r.stock_quantity,
    category:        r.category ?? 'General',
    valid_from:      r.valid_from,
    valid_until:     r.valid_until,
    status:          r.status,
    rejection_reason: r.rejection_reason,
    created_at:      r.created_at,
    sponsorName:     (r.sponsors as any)?.company_name ?? '—',
  }))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const queryClient = useQueryClient()
  const { toast }   = useToast()
  const confirm     = useConfirm()

  const [searchParams]  = useSearchParams()
  const [tab,           setTab]           = useState<'rewards' | 'submissions'>(
    searchParams.get('tab') === 'submissions' ? 'submissions' : 'rewards'
  )

  // Sync tab when URL param changes (e.g. from notification bell click)
  useEffect(() => {
    if (searchParams.get('tab') === 'submissions') setTab('submissions')
  }, [searchParams])
  const [search,        setSearch]        = useState('')
  const [catFilter,     setCatFilter]     = useState('all')
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [rejectModal,   setRejectModal]   = useState<RewardSubmission | null>(null)
  const [rejectReason,  setRejectReason]  = useState('')
  const [actioning,     setActioning]     = useState<string | null>(null)

  const { data: rewards = [],     isLoading: rLoading } = useQuery({ queryKey: ['rewards'],      queryFn: fetchRewards })
  const { data: submissions = [], isLoading: sLoading } = useQuery({ queryKey: ['submissions'],  queryFn: fetchSubmissions })

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  // ── Filtered lists ──────────────────────────────────────────────────────
  const categories = [...new Set(rewards.map(r => r.category))]

  const filteredRewards = rewards.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                        (r.sponsorName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter === 'all' || r.category === catFilter
    return matchSearch && matchCat
  })

  const filteredSubs = submissions.filter(s => {
    const matchSearch = s.reward_name.toLowerCase().includes(search.toLowerCase()) ||
                        s.sponsorName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── Summary stats ───────────────────────────────────────────────────────
  const totalActive   = rewards.filter(r => r.isActive).length
  const totalRedeemed = rewards.reduce((s, r) => s + r.redeemed, 0)
  const lowStock      = rewards.filter(r => r.stock > 0 && r.stock <= 5).length
  const outOfStock    = rewards.filter(r => r.stock === 0).length

  // ── Reward actions ──────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({ title: 'Delete reward?', message: `"${name}" will be permanently deleted.`, confirmText: 'Delete', variant: 'danger' })
    if (!ok) return
    const { error } = await supabase.from('rewards').delete().eq('reward_id', id)
    if (error) { toast(error.message, 'error'); return }
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    toast('Reward deleted')
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from('rewards').update({ is_active: !current }).eq('reward_id', id)
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    toast(current ? 'Reward deactivated' : 'Reward activated')
  }

  // ── Submission actions ──────────────────────────────────────────────────
  const handleApprove = async (sub: RewardSubmission) => {
    setActioning(sub.submission_id)
    const { error: insErr } = await supabaseAdmin.from('rewards').insert({
      sponsor_id:      sub.sponsor_id,
      reward_name:     sub.reward_name,
      description:     sub.description,
      points_required: sub.points_required,
      stock_quantity:  sub.stock_quantity,
      category:        sub.category,
      valid_from:      sub.valid_from,
      valid_until:     sub.valid_until,
      redeemed_count:  0,
      is_active:       true,
    })
    if (insErr) { toast(insErr.message, 'error'); setActioning(null); return }

    await supabaseAdmin.from('reward_submissions').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('submission_id', sub.submission_id)
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    queryClient.invalidateQueries({ queryKey: ['submissions'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-bell'] })
    toast(`"${sub.reward_name}" approved and published`)
    setActioning(null)
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActioning(rejectModal.submission_id)
    await supabaseAdmin.from('reward_submissions').update({
      status: 'rejected',
      rejection_reason: rejectReason.trim() || null,
      reviewed_at: new Date().toISOString(),
    }).eq('submission_id', rejectModal.submission_id)
    queryClient.invalidateQueries({ queryKey: ['submissions'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-bell'] })
    toast(`"${rejectModal.reward_name}" rejected`)
    setRejectModal(null); setRejectReason(''); setActioning(null)
  }

  return (
    <div className="rewards-split">

      {/* ── Left sidebar ── */}
      <div className="rewards-sidebar-panel">
        <button className="add-reward-sidebar-btn" onClick={() => setShowAddModal(true)}>+ Add Reward</button>

        <div className="rsb-section">
          <span className="rsb-section-title">Summary</span>
          <div className="rsb-stats">
            <div className="rsb-stat"><span className="rsb-stat-label">Total</span><span className="rsb-stat-value">{rewards.length}</span></div>
            <div className="rsb-stat"><span className="rsb-stat-label">Active</span><span className="rsb-stat-value">{totalActive}</span></div>
            <div className="rsb-stat"><span className="rsb-stat-label">Redeemed</span><span className="rsb-stat-value">{totalRedeemed}</span></div>
            {pendingCount > 0 && <div className="rsb-stat warn"><span className="rsb-stat-label">Pending Review</span><span className="rsb-stat-value">{pendingCount}</span></div>}
            {lowStock  > 0 && <div className="rsb-stat warn"><span className="rsb-stat-label">Low Stock (≤5)</span><span className="rsb-stat-value">{lowStock}</span></div>}
            {outOfStock > 0 && <div className="rsb-stat danger"><span className="rsb-stat-label">Out of Stock</span><span className="rsb-stat-value">{outOfStock}</span></div>}
          </div>
        </div>

        {tab === 'rewards' && (
          <div className="rsb-section">
            <span className="rsb-section-title">Category</span>
            <div className="rsb-categories">
              <button className={`rsb-cat-btn${catFilter === 'all' ? ' active' : ''}`} onClick={() => setCatFilter('all')}>
                All <span className="rsb-cat-count">{rewards.length}</span>
              </button>
              {categories.map(cat => (
                <button key={cat} className={`rsb-cat-btn${catFilter === cat ? ' active' : ''}`} onClick={() => setCatFilter(cat)}>
                  {cat} <span className="rsb-cat-count">{rewards.filter(r => r.category === cat).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'submissions' && (
          <div className="rsb-section">
            <span className="rsb-section-title">Filter</span>
            <div className="rsb-categories">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                <button key={s} className={`rsb-cat-btn${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className="rsb-cat-count">{s === 'all' ? submissions.length : submissions.filter(x => x.status === s).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="rewards-grid-area">

        {/* Tab bar + search */}
        <div className="rw-topbar">
          <div className="rw-tabs">
            <button className={`rw-tab${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>
              All Rewards
              <span className="rw-tab-count">{rewards.length}</span>
            </button>
            <button className={`rw-tab${tab === 'submissions' ? ' active' : ''}`} onClick={() => setTab('submissions')}>
              Submissions
              {pendingCount > 0 && <span className="rw-tab-badge">{pendingCount}</span>}
            </button>
          </div>
          <div className="rewards-grid-search">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* ── Rewards table ── */}
        {tab === 'rewards' && (
          <div className="rw-table-wrap">
            {rLoading ? (
              <div className="rewards-grid-msg">Loading…</div>
            ) : filteredRewards.length === 0 ? (
              <div className="rewards-grid-msg">{search ? 'No rewards match your search.' : 'No rewards yet.'}</div>
            ) : (
              <table className="rw-table">
                <thead>
                  <tr>
                    <th>Reward</th>
                    <th>Sponsor</th>
                    <th>Category</th>
                    <th>Points</th>
                    <th>Stock</th>
                    <th>Redeemed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRewards.map(r => (
                    <tr key={r.id} className={r.isActive ? '' : 'rw-row-inactive'}>
                      <td className="rw-td-name">{r.name}</td>
                      <td className="rw-td-sponsor">{r.sponsorName ?? <span className="rw-no-sponsor">MyCycle+</span>}</td>
                      <td><span className="rw-cat-chip">{r.category}</span></td>
                      <td className="rw-td-num">{r.points.toLocaleString()}</td>
                      <td className={`rw-td-num ${r.stock === 0 ? 'rw-out' : r.stock <= 5 ? 'rw-low' : ''}`}>
                        {r.stock === 0 ? 'Out' : r.stock}
                      </td>
                      <td className="rw-td-num">{r.redeemed}</td>
                      <td>
                        <span className={`rw-status-chip ${r.isActive ? 'active' : 'inactive'}`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="rw-actions">
                          <button className="rw-action-btn" onClick={() => handleToggleActive(r.id, r.isActive ?? true)}>
                            {r.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="rw-action-btn danger" onClick={() => handleDelete(r.id, r.name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Submissions table ── */}
        {tab === 'submissions' && (
          <div className="rw-table-wrap">
            {sLoading ? (
              <div className="rewards-grid-msg">Loading…</div>
            ) : filteredSubs.length === 0 ? (
              <div className="rewards-grid-msg">
                {statusFilter === 'pending' ? 'No pending submissions.' : 'No submissions found.'}
              </div>
            ) : (
              <table className="rw-table">
                <thead>
                  <tr>
                    <th>Reward Name</th>
                    <th>Sponsor</th>
                    <th>Category</th>
                    <th>Points</th>
                    <th>Stock</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map(s => (
                    <tr key={s.submission_id}>
                      <td className="rw-td-name">
                        {s.reward_name}
                        {s.description && <div className="rw-td-sub">{s.description}</div>}
                      </td>
                      <td className="rw-td-sponsor">{s.sponsorName}</td>
                      <td><span className="rw-cat-chip">{s.category}</span></td>
                      <td className="rw-td-num">{s.points_required.toLocaleString()}</td>
                      <td className="rw-td-num">{s.stock_quantity}</td>
                      <td className="rw-td-meta">{timeAgo(s.created_at)}</td>
                      <td>
                        <span className={`rw-status-chip ${s.status}`}>{s.status}</span>
                        {s.status === 'rejected' && s.rejection_reason && (
                          <div className="rw-td-sub rw-reject-reason" title={s.rejection_reason}>
                            {s.rejection_reason.length > 40 ? s.rejection_reason.slice(0, 40) + '…' : s.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td>
                        {s.status === 'pending' && (
                          <div className="rw-actions">
                            <button
                              className="rw-action-btn approve"
                              disabled={actioning === s.submission_id}
                              onClick={() => handleApprove(s)}
                            >
                              {actioning === s.submission_id ? '…' : 'Approve'}
                            </button>
                            <button
                              className="rw-action-btn danger"
                              disabled={actioning === s.submission_id}
                              onClick={() => { setRejectModal(s); setRejectReason('') }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Add reward modal (admin direct) ── */}
      {showAddModal && (
        <AddRewardModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rewards'] })
            toast('Reward created successfully')
          }}
        />
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Submission</h3>
              <button className="modal-close" onClick={() => setRejectModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#555' }}>
                Rejecting <strong>"{rejectModal.reward_name}"</strong> from {rejectModal.sponsorName}.
              </p>
              <div className="modal-field">
                <label>Reason (optional — shown to sponsor)</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Points value too high, missing description…"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1.5px solid #e2e8f0', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="modal-btn danger" onClick={handleReject} disabled={!!actioning}>
                {actioning ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
