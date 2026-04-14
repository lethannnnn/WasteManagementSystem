import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Reward {
  reward_id:      string
  reward_name:    string
  description:    string
  points_required: number
  stock_quantity:  number
  redeemed_count:  number
  is_active:       boolean
  valid_from:      string | null
  valid_until:     string | null
  image_url:       string | null
}

const EMPTY: Omit<Reward, 'reward_id' | 'redeemed_count'> = {
  reward_name: '', description: '', points_required: 100, stock_quantity: 50,
  is_active: true, valid_from: '', valid_until: '', image_url: '',
}

export default function RewardsPage() {
  const { sponsor }                   = useAuth()
  const [rewards,   setRewards]       = useState<Reward[]>([])
  const [loading,   setLoading]       = useState(true)
  const [modal,     setModal]         = useState<'create' | 'edit' | null>(null)
  const [form,      setForm]          = useState(EMPTY)
  const [editId,    setEditId]        = useState<string | null>(null)
  const [saving,    setSaving]        = useState(false)
  const [error,     setError]         = useState('')

  useEffect(() => { if (sponsor?.id) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('rewards').select('*').eq('sponsor_id', sponsor!.id).order('created_at', { ascending: false })
    setRewards(data ?? [])
    setLoading(false)
  }

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(''); setModal('create') }
  const openEdit   = (r: Reward) => { setForm({ ...r }); setEditId(r.reward_id); setError(''); setModal('edit') }
  const closeModal = () => setModal(null)

  const set = (k: keyof typeof EMPTY, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.reward_name || form.points_required < 1) { setError('Reward name and points are required.'); return }
    setSaving(true)
    setError('')
    const payload = { ...form, sponsor_id: sponsor!.id, valid_from: form.valid_from || null, valid_until: form.valid_until || null }

    const { error: err } = editId
      ? await supabase.from('rewards').update(payload).eq('reward_id', editId)
      : await supabase.from('rewards').insert(payload)

    if (err) { setError(err.message); setSaving(false); return }
    await load()
    closeModal()
    setSaving(false)
  }

  const toggleActive = async (r: Reward) => {
    await supabase.from('rewards').update({ is_active: !r.is_active }).eq('reward_id', r.reward_id)
    setRewards(prev => prev.map(x => x.reward_id === r.reward_id ? { ...x, is_active: !r.is_active } : x))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reward? This cannot be undone.')) return
    await supabase.from('rewards').delete().eq('reward_id', id)
    setRewards(prev => prev.filter(r => r.reward_id !== id))
  }

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1>Rewards</h1>
        <button className="sp-btn-primary" onClick={openCreate}>+ Create Reward</button>
      </div>

      {loading ? <div className="sp-loading-state">Loading…</div> : rewards.length === 0 ? (
        <div className="sp-empty-state">No rewards yet. Create your first reward to start a campaign.</div>
      ) : (
        <div className="sp-rewards-grid">
          {rewards.map(r => (
            <div key={r.reward_id} className="sp-reward-card">
              <div className="sp-reward-card-top">
                <span className={`sp-badge ${r.is_active ? 'active' : 'inactive'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
                {r.valid_until && new Date(r.valid_until) < new Date() && (
                  <span className="sp-badge expired">Expired</span>
                )}
              </div>
              <h3 className="sp-reward-name">{r.reward_name}</h3>
              <p className="sp-reward-desc">{r.description || '—'}</p>
              <div className="sp-reward-meta">
                <span>{r.points_required.toLocaleString()} pts</span>
                <span>{r.stock_quantity - r.redeemed_count} / {r.stock_quantity} stock</span>
              </div>
              <div className="sp-reward-actions">
                <button className="sp-btn-ghost" onClick={() => openEdit(r)}>Edit</button>
                <button className="sp-btn-ghost" onClick={() => toggleActive(r)}>
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="sp-btn-ghost danger" onClick={() => handleDelete(r.reward_id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="sp-modal-overlay" onClick={closeModal}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>{modal === 'create' ? 'Create Reward' : 'Edit Reward'}</h2>
              <button className="sp-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-form-group"><label>Reward Name *</label>
                <input value={form.reward_name} onChange={e => set('reward_name', e.target.value)} placeholder="e.g. Eco Tote Bag" /></div>
              <div className="sp-form-group"><label>Description</label>
                <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the reward" /></div>
              <div className="sp-form-row">
                <div className="sp-form-group"><label>Points Required *</label>
                  <input type="number" min={1} value={form.points_required} onChange={e => set('points_required', +e.target.value)} /></div>
                <div className="sp-form-group"><label>Stock Quantity</label>
                  <input type="number" min={0} value={form.stock_quantity} onChange={e => set('stock_quantity', +e.target.value)} /></div>
              </div>
              <div className="sp-form-row">
                <div className="sp-form-group"><label>Valid From</label>
                  <input type="date" value={form.valid_from ?? ''} onChange={e => set('valid_from', e.target.value)} /></div>
                <div className="sp-form-group"><label>Valid Until</label>
                  <input type="date" value={form.valid_until ?? ''} onChange={e => set('valid_until', e.target.value)} /></div>
              </div>
              <div className="sp-form-group"><label>Image URL</label>
                <input value={form.image_url ?? ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." /></div>
              {error && <div className="sp-form-error">{error}</div>}
            </div>
            <div className="sp-modal-footer">
              <button className="sp-btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="sp-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Reward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
