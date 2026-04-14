import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RegisterData } from '../../types'

interface Props {
  data:   Partial<RegisterData>
  onBack: () => void
  onDone: () => void
}

const PARTNERSHIP_TYPES = [
  'Reward Sponsor','Brand Integration','Co-Marketing','CSR Partnership','Technology Partner','Full Partnership',
]

const BUDGETS = [
  'RM 1,000 – 5,000','RM 5,000 – 15,000','RM 15,000 – 50,000','RM 50,000 – 100,000','RM 100,000+',
]

export default function StepSubmit({ data, onBack, onDone }: Props) {
  const [form, setForm] = useState({
    partnershipType:     data.partnershipType     ?? '',
    budget:              data.budget              ?? '',
    objectives:          data.objectives          ?? '',
    sustainabilityGoals: data.sustainabilityGoals ?? '',
    additionalInfo:      data.additionalInfo      ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!form.partnershipType || !form.budget || !form.objectives) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError('')

    const { error: insertErr } = await supabase.from('sponsor_inquiries').insert({
      company_name:         data.companyName        ?? '',
      industry:             data.industry           ?? '',
      website:              data.website            ?? '',
      salutation:           data.salutation         ?? null,
      contact_person:       data.contactPerson      ?? '',
      email:                data.email              ?? '',
      phone:                data.phone              ?? '',
      position:             data.position           ?? '',
      company_size:         data.companySize        ?? '',
      office_state:         data.officeState        ?? null,
      linkedin:             data.linkedin           ?? null,
      partnership_type:     form.partnershipType,
      budget:               form.budget,
      objectives:           form.objectives,
      sustainability_goals: form.sustainabilityGoals,
      additional_info:      form.additionalInfo,
      doc_url:              data.docUrl             ?? null,
      status:               'pending',
    })

    if (insertErr) { setError(insertErr.message); setSubmitting(false); return }
    onDone()
  }

  return (
    <div className="sp-step-card">
      <h2>Partnership Preferences</h2>
      <p className="sp-step-desc">
        Tell us about your partnership goals. This helps us match you with the right program.
      </p>

      <div className="sp-form-group">
        <label htmlFor="s-partnership-type">Partnership Type *</label>
        <select
          id="s-partnership-type"
          name="partnershipType"
          value={form.partnershipType}
          onChange={e => set('partnershipType', e.target.value)}
        >
          <option value="">Select type</option>
          {PARTNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="sp-form-group">
        <label htmlFor="s-budget">Estimated Monthly Budget *</label>
        <select
          id="s-budget"
          name="budget"
          value={form.budget}
          onChange={e => set('budget', e.target.value)}
        >
          <option value="">Select budget range</option>
          {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="sp-form-group">
        <label htmlFor="s-objectives">Marketing Objectives *</label>
        <textarea
          id="s-objectives"
          name="objectives"
          rows={4}
          value={form.objectives}
          onChange={e => set('objectives', e.target.value)}
          placeholder="What do you hope to achieve? (e.g. brand awareness, CSR goals, customer acquisition)"
        />
      </div>

      <div className="sp-form-group">
        <label htmlFor="s-sustainability">Sustainability Goals</label>
        <textarea
          id="s-sustainability"
          name="sustainabilityGoals"
          rows={3}
          value={form.sustainabilityGoals}
          onChange={e => set('sustainabilityGoals', e.target.value)}
          placeholder="Describe your company's environmental initiatives"
        />
      </div>

      <div className="sp-form-group">
        <label htmlFor="s-additional">Additional Information</label>
        <textarea
          id="s-additional"
          name="additionalInfo"
          rows={3}
          value={form.additionalInfo}
          onChange={e => set('additionalInfo', e.target.value)}
          placeholder="Anything else you'd like us to know"
        />
      </div>

      {error && <div className="sp-form-error">{error}</div>}

      <div className="sp-step-actions">
        <button className="sp-btn-secondary" onClick={onBack} disabled={submitting}>Back</button>
        <button className="sp-btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}
