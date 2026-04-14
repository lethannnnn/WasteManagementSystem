import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Reward {
  reward_id:       string
  reward_name:     string
  description:     string
  points_required: number
  stock_quantity:  number
  redeemed_count:  number
  is_active:       boolean
  valid_from:      string | null
  valid_until:     string | null
  image_url:       string | null
  category:        string
}

interface Submission {
  submission_id:   string
  reward_name:     string
  description:     string
  points_required: number
  stock_quantity:  number
  category:        string
  status:          'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at:      string
}

const CATEGORIES = ['Merchandise', 'Voucher', 'Discount', 'Food & Beverage', 'Experience', 'General']

const EMPTY_FORM = {
  reward_name: '', description: '', points_required: 100,
  stock_quantity: 50, category: 'General', valid_from: '', valid_until: '', image_url: '',
}

const STATUS_META = {
  pending:  { label: 'Pending Review', cls: 'pending' },
  approved: { label: 'Approved',       cls: 'active'  },
  rejected: { label: 'Rejected',       cls: 'inactive' },
}

export default function RewardsPage() {
  const { sponsor }                     = useAuth()
  const [rewards,      setRewards]      = useState<Reward[]>([])
  const [submissions,  setSubmissions]  = useState<Submission[]>([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState<'rewards' | 'submissions'>('rewards')
  const [modal,        setModal]        = useState<'submit' | 'edit' | null>(null)
  const [form,         setForm]         = useState({ ...EMPTY_FORM })
  const [editId,       setEditId]       = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => { if (sponsor?.id) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)
    const [{ data: rw }, { data: sb }] = await Promise.all([
      supabase.from('rewards').select('*').eq('sponsor_id', sponsor!.id).order('created_at', { ascending: false }),
      supabase.from('reward_submissions').select('*').eq('sponsor_id', sponsor!.id).order('created_at', { ascending: false }),
    ])
    setRewards(rw ?? [])
    setSubmissions(sb ?? [])
    setLoading(false)
  }

  const openSubmit = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setError(''); setModal('submit') }
  const openEdit   = (r: Reward) => {
    setForm({ reward_name: r.reward_name, description: r.description, points_required: r.points_required,
      stock_quantity: r.stock_quantity, category: r.category, valid_from: r.valid_from ?? '',
      valid_until: r.valid_until ?? '', image_url: r.image_url ?? '' })
    setEditId(r.reward_id); setError(''); setModal('edit')
  }
  const closeModal = () => { setModal(null); setError('') }
  const set = (k: keyof typeof EMPTY_FORM, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!form.reward_name.trim() || form.points_required < 1) { setError('Reward name and points are required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('reward_submissions').insert({
      sponsor_id:      sponsor!.id,
      reward_name:     form.reward_name.trim(),
      description:     form.description.trim() || null,
      points_required: form.points_required,
      stock_quantity:  form.stock_quantity,
      category:        form.category,
      valid_from:      form.valid_from  || null,
      valid_until:     form.valid_until || null,
      image_url:       form.image_url   || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    await load(); closeModal(); setTab('submissions'); setSaving(false)
  }

  const handleEditSave = async () => {
    if (!form.reward_name.trim()) { setError('Reward name is required.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('rewards').update({
      reward_name:     form.reward_name.trim(),
      description:     form.description || null,
      points_required: form.points_required,
      stock_quantity:  form.stock_quantity,
      valid_from:      form.valid_from  || null,
      valid_until:     form.valid_until || null,
      image_url:       form.image_url   || null,
    }).eq('reward_id', editId!)
    if (err) { setError(err.message); setSaving(false); return }
    await load(); closeModal(); setSaving(false)
  }

  const toggleActive = async (r: Reward) => {
    await supabase.from('rewards').update({ is_active: !r.is_active }).eq('reward_id', r.reward_id)
    setRewards(prev => prev.map(x => x.reward_id === r.reward_id ? { ...x, is_active: !r.is_active } : x))
  }

  const cancelSubmission = async (id: string) => {
    if (!confirm('Cancel this submission?')) return
    await supabase.from('reward_submissions').delete().eq('submission_id', id)
    setSubmissions(prev => prev.filter(s => s.submission_id !== id))
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1>Rewards</h1>
          <p>Manage your active rewards and submissions</p>
        </div>
        <button className="sp-btn-primary" onClick={openSubmit}>+ Submit Reward</button>
      </div>

      {/* Tabs */}
      <div className="sp-tab-bar">
        <button className={`sp-tab${tab === 'rewards' ? ' active' : ''}`} onClick={() => setTab('rewards')}>
          My Rewards <span className="sp-tab-count">{rewards.length}</span>
        </button>
        <button className={`sp-tab${tab === 'submissions' ? ' active' : ''}`} onClick={() => setTab('submissions')}>
          Submissions
          {pendingCount > 0 && <span className="sp-tab-badge">{pendingCount}</span>}
        </button>
      </div>

      {loading ? <div className="sp-loading-state">Loading…</div> : (

        tab === 'rewards' ? (
          rewards.length === 0 ? (
            <div className="sp-empty-state">No active rewards yet. Submit a reward for admin approval to get started.</div>
          ) : (
            <div className="sp-rewards-grid">
              {rewards.map(r => (
                <div key={r.reward_id} className="sp-reward-card">
                  <div className="sp-reward-card-top">
                    <span className={`sp-badge ${r.is_active ? 'active' : 'inactive'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="sp-reward-cat-tag">{r.category}</span>
                    {r.valid_until && new Date(r.valid_until) < new Date() && (
                      <span className="sp-badge expired">Expired</span>
                    )}
                  </div>
                  <h3 className="sp-reward-name">{r.reward_name}</h3>
                  <p className="sp-reward-desc">{r.description || '—'}</p>
                  <div className="sp-reward-meta">
                    <span>{r.points_required.toLocaleString()} pts</span>
                    <span>{r.stock_quantity - r.redeemed_count} / {r.stock_quantity} left</span>
                  </div>
                  <div className="sp-reward-actions">
                    <button className="sp-btn-ghost" onClick={() => openEdit(r)}>Edit</button>
                    <button className="sp-btn-ghost" onClick={() => toggleActive(r)}>
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          submissions.length === 0 ? (
            <div className="sp-empty-state">No submissions yet. Click "Submit Reward" to request a new reward.</div>
          ) : (
            <div className="sp-submissions-list">
              {submissions.map(s => {
                const meta = STATUS_META[s.status]
                return (
                  <div key={s.submission_id} className={`sp-submission-row sp-submission-${s.status}`}>
                    <div className="sp-submission-info">
                      <span className={`sp-badge ${meta.cls}`}>{meta.label}</span>
                      <span className="sp-submission-name">{s.reward_name}</span>
                      <span className="sp-submission-cat">{s.category}</span>
                    </div>
                    <div className="sp-submission-meta">
                      <span>{s.points_required.toLocaleString()} pts</span>
                      <span>{s.stock_quantity} stock</span>
                      <span>{new Date(s.created_at).toLocaleDateString('en-MY')}</span>
                    </div>
                    {s.status === 'rejected' && s.rejection_reason && (
                      <div className="sp-submission-reject-reason">
                        Reason: {s.rejection_reason}
                      </div>
                    )}
                    {s.status === 'pending' && (
                      <button className="sp-btn-ghost danger" onClick={() => cancelSubmission(s.submission_id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )
      )}

      {/* Submit / Edit modal */}
      {modal && (
        <div className="sp-modal-overlay" onClick={closeModal}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>{modal === 'submit' ? 'Submit Reward for Approval' : 'Edit Reward'}</h2>
              <button className="sp-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="sp-modal-body">
              {modal === 'submit' && (
                <div className="sp-submit-notice">
                  Your submission will be reviewed by the admin before going live.
                </div>
              )}
              <div className="sp-form-group"><label>Reward Name *</label>
                <input value={form.reward_name} onChange={e => set('reward_name', e.target.value)} placeholder="e.g. Eco Tote Bag" /></div>
              <div className="sp-form-group"><label>Description</label>
                <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the reward" /></div>
              <div className="sp-form-row">
                <div className="sp-form-group"><label>Points Required *</label>
                  <input type="number" min={1} value={form.points_required} onChange={e => set('points_required', +e.target.value)} /></div>
                <div className="sp-form-group"><label>Stock Quantity</label>
                  <input type="number" min={0} value={form.stock_quantity} onChange={e => set('stock_quantity', +e.target.value)} /></div>
              </div>
              <div className="sp-form-group"><label>Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div className="sp-form-row">
                <div className="sp-form-group"><label>Valid From</label>
                  <input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} /></div>
                <div className="sp-form-group"><label>Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} /></div>
              </div>
              <div className="sp-form-group"><label>Image URL</label>
                <input value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" /></div>
              {error && <div className="sp-form-error">{error}</div>}
            </div>
            <div className="sp-modal-footer">
              <button className="sp-btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="sp-btn-primary" onClick={modal === 'submit' ? handleSubmit : handleEditSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'submit' ? 'Submit for Approval' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
