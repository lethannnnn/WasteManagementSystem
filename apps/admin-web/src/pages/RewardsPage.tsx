import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Reward } from '../types'
import AddRewardModal from '../components/AddRewardModal'
import EmptyState from '../components/EmptyState'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('reward_id, reward_name, points_required, category, stock_quantity, redeemed_count, is_active')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(r => ({
    id:       r.reward_id,
    name:     r.reward_name,
    points:   r.points_required,
    category: r.category ?? 'General',
    stock:    r.stock_quantity ?? 0,
    redeemed: r.redeemed_count ?? 0,
    isActive: r.is_active ?? true,
  }))
}

export default function RewardsPage() {
  const queryClient  = useQueryClient()
  const { toast }    = useToast()
  const confirm      = useConfirm()
  const [search, setSearch]             = useState('')
  const [catFilter, setCatFilter]       = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: rewards = [], isLoading } = useQuery({ queryKey: ['rewards'], queryFn: fetchRewards })

  const categories    = [...new Set(rewards.map(r => r.category))]
  const totalActive   = rewards.filter(r => (r as any).isActive).length
  const totalRedeemed = rewards.reduce((s, r) => s + r.redeemed, 0)
  const lowStock      = rewards.filter(r => r.stock > 0 && r.stock <= 5).length
  const outOfStock    = rewards.filter(r => r.stock === 0).length

  const filtered = rewards.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
                        r.category.toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter === 'all' || r.category === catFilter
    return matchSearch && matchCat
  })

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title:       'Delete reward?',
      message:     `"${name}" will be permanently deleted and can no longer be redeemed.`,
      confirmText: 'Delete',
      variant:     'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('rewards').delete().eq('reward_id', id)
    if (error) { toast(error.message, 'error'); return }
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    toast('Reward deleted')
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('rewards').update({ is_active: !currentActive }).eq('reward_id', id)
    queryClient.invalidateQueries({ queryKey: ['rewards'] })
    toast(currentActive ? 'Reward deactivated' : 'Reward activated')
  }

  return (
    <div className="rewards-split">

      {/* ── Left sidebar ── */}
      <div className="rewards-sidebar-panel">
        <button className="add-reward-sidebar-btn" onClick={() => setShowAddModal(true)}>
          + Add Reward
        </button>

        {/* Summary stats */}
        <div className="rsb-section">
          <span className="rsb-section-title">Summary</span>
          <div className="rsb-stats">
            <div className="rsb-stat">
              <span className="rsb-stat-label">Total Rewards</span>
              <span className="rsb-stat-value">{rewards.length}</span>
            </div>
            <div className="rsb-stat">
              <span className="rsb-stat-label">Active</span>
              <span className="rsb-stat-value">{totalActive}</span>
            </div>
            <div className="rsb-stat">
              <span className="rsb-stat-label">Total Redeemed</span>
              <span className="rsb-stat-value">{totalRedeemed}</span>
            </div>
            {lowStock > 0 && (
              <div className="rsb-stat warn">
                <span className="rsb-stat-label">Low Stock (&le;5)</span>
                <span className="rsb-stat-value">{lowStock}</span>
              </div>
            )}
            {outOfStock > 0 && (
              <div className="rsb-stat danger">
                <span className="rsb-stat-label">Out of Stock</span>
                <span className="rsb-stat-value">{outOfStock}</span>
              </div>
            )}
          </div>
        </div>

        {/* Category filter */}
        <div className="rsb-section">
          <span className="rsb-section-title">Category</span>
          <div className="rsb-categories">
            <button
              className={`rsb-cat-btn${catFilter === 'all' ? ' active' : ''}`}
              onClick={() => setCatFilter('all')}
            >
              All <span className="rsb-cat-count">{rewards.length}</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`rsb-cat-btn${catFilter === cat ? ' active' : ''}`}
                onClick={() => setCatFilter(cat)}
              >
                {cat} <span className="rsb-cat-count">{rewards.filter(r => r.category === cat).length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: card grid ── */}
      <div className="rewards-grid-area">

        {/* Top bar */}
        <div className="rewards-grid-topbar">
          <div className="rewards-grid-search">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search rewards…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="rewards-grid-count">{filtered.length} reward{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Cards */}
        <div className="rewards-grid-scroll">
          {isLoading ? (
            <div className="rewards-grid-msg">Loading rewards…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="&#x1F381;"
              title={search ? 'No rewards match your search' : 'No rewards yet'}
              description={search ? 'Try a different term.' : 'Add your first reward to get started.'}
              action={!search ? { label: '+ Add Reward', onClick: () => setShowAddModal(true) } : undefined}
            />
          ) : (
            <div className="rewards-grid">
              {filtered.map(reward => (
                <div key={reward.id} className={`reward-card ${(reward as any).isActive ? '' : 'inactive'}`}>
                  <div className="reward-header">
                    <h3>{reward.name}</h3>
                    <div className="reward-header-right">
                      <span className="reward-category">{reward.category}</span>
                      <span className={`reward-status-badge ${(reward as any).isActive ? 'active' : 'inactive'}`}>
                        {(reward as any).isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="reward-details">
                    <div className="reward-points">
                      <span className="points-value">{reward.points}</span>
                      <span className="points-label">points</span>
                    </div>
                    <div className="reward-stats">
                      <div className="stat">
                        <span className="stat-label">Stock</span>
                        <span className={`stat-value ${reward.stock === 0 ? 'out-of-stock' : ''}`}>
                          {reward.stock === 0 ? 'Out of stock' : reward.stock}
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Redeemed</span>
                        <span className="stat-value">{reward.redeemed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="reward-actions">
                    <button
                      className="edit-reward-btn"
                      onClick={() => handleToggleActive(reward.id, (reward as any).isActive)}
                    >
                      {(reward as any).isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="delete-reward-btn"
                      onClick={() => handleDelete(reward.id, reward.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {showAddModal && (
        <AddRewardModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rewards'] })
            toast('Reward created successfully')
          }}
        />
      )}
    </div>
  )
}
