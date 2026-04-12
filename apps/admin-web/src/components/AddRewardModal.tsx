import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = ['Food & Beverage', 'Transport', 'Entertainment', 'Lifestyle', 'Voucher', 'General']

export default function AddRewardModal({ onClose, onSuccess }: Props) {
  const [name,     setName]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [points,   setPoints]   = useState('')
  const [category, setCategory] = useState('General')
  const [stock,    setStock]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleCreate = async () => {
    if (!name.trim() || !points || !stock) {
      setError('Name, points, and stock quantity are required.')
      return
    }
    const pointsNum = parseInt(points, 10)
    const stockNum  = parseInt(stock, 10)
    if (isNaN(pointsNum) || pointsNum < 1) { setError('Points must be a positive number.'); return }
    if (isNaN(stockNum)  || stockNum  < 0) { setError('Stock must be 0 or more.');          return }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('rewards').insert({
      reward_name:      name.trim(),
      description:      desc.trim() || null,
      points_required:  pointsNum,
      category,
      stock_quantity:   stockNum,
      redeemed_count:   0,
      is_active:        true,
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    onSuccess()
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New Reward</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-field">
            <label>Reward Name <span className="required">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. RM10 Grab Voucher" autoFocus />
          </div>

          <div className="modal-field">
            <label>Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional short description" />
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label>Points Required <span className="required">*</span></label>
              <input type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. 100" />
            </div>
            <div className="modal-field">
              <label>Stock Quantity <span className="required">*</span></label>
              <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>

          <div className="modal-field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="modal-select">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Reward'}
          </button>
        </div>
      </div>
    </div>
  )
}
