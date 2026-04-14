import { useState } from 'react'
import type { RegisterData } from '../../types'

interface Props {
  data:   Partial<RegisterData>
  onBack: () => void
  onNext: (reviewed: Partial<RegisterData>) => void
}

const INDUSTRIES = [
  'Retail & E-commerce','Food & Beverage','Technology','Financial Services',
  'Healthcare','Automotive','Hospitality & Tourism','Manufacturing','Telecommunications','Other',
]

const SIZES = ['Startup (1–10)','Small (11–50)','Medium (51–200)','Large (201–1000)','Enterprise (1000+)']

const SALUTATIONS = ['Mr','Mrs','Ms','Dr','Prof']

const MY_STATES = [
  'Johor','Kedah','Kelantan','Kuala Lumpur','Labuan','Melaka','Negeri Sembilan',
  'Pahang','Penang','Perak','Perlis','Putrajaya','Sabah','Sarawak','Selangor','Terengganu',
]

export default function StepReview({ data, onBack, onNext }: Props) {
  const [form, setForm] = useState<Partial<RegisterData>>(data)

  const set = (k: keyof RegisterData, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const handleNext = () => {
    if (!form.companyName || !form.contactPerson || !form.email || !form.phone) {
      alert('Please fill in all required fields.')
      return
    }
    onNext(form)
  }

  return (
    <div className="sp-step-card wide">
      <h2>Review & Edit Your Details</h2>
      <p className="sp-step-desc">
        Fields marked with (*) are required. Fields with a green border were auto-filled from your document — please verify them.
      </p>

      <div className="sp-review-grid">
        <div className="sp-review-section">
          <h3>Company Information</h3>

          <div className="sp-form-group">
            <label htmlFor="r-company-name">Company Name *</label>
            <input
              id="r-company-name"
              name="companyName"
              className={form.companyName ? 'ocr-filled' : ''}
              value={form.companyName ?? ''}
              onChange={e => set('companyName', e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-reg-num">Registration Number</label>
            <input
              id="r-reg-num"
              name="businessRegistration"
              className={form.businessRegistration ? 'ocr-filled' : ''}
              value={form.businessRegistration ?? ''}
              onChange={e => set('businessRegistration', e.target.value)}
              placeholder="e.g. 1234567-A"
            />
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-industry">Industry *</label>
            <select
              id="r-industry"
              name="industry"
              value={form.industry ?? ''}
              onChange={e => set('industry', e.target.value)}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-company-size">Company Size *</label>
            <select
              id="r-company-size"
              name="companySize"
              value={form.companySize ?? ''}
              onChange={e => set('companySize', e.target.value)}
            >
              <option value="">Select size</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-website">Website</label>
            <input
              id="r-website"
              name="website"
              type="url"
              value={form.website ?? ''}
              onChange={e => set('website', e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </div>
        </div>

        <div className="sp-review-section">
          <h3>Contact Information</h3>

          <div className="sp-form-row">
            <div className="sp-form-group sp-form-group-narrow">
              <label htmlFor="r-salutation">Salutation</label>
              <select
                id="r-salutation"
                name="salutation"
                value={form.salutation ?? ''}
                onChange={e => set('salutation', e.target.value)}
              >
                <option value="">—</option>
                {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sp-form-group sp-form-group-wide">
              <label htmlFor="r-contact-person">Contact Person *</label>
              <input
                id="r-contact-person"
                name="contactPerson"
                autoComplete="name"
                value={form.contactPerson ?? ''}
                onChange={e => set('contactPerson', e.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-position">Position / Title</label>
            <input
              id="r-position"
              name="position"
              autoComplete="organization-title"
              value={form.position ?? ''}
              onChange={e => set('position', e.target.value)}
              placeholder="e.g. Marketing Manager"
            />
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-email">Business Email *</label>
            <input
              id="r-email"
              name="email"
              type="email"
              autoComplete="email"
              className={form.email ? 'ocr-filled' : ''}
              value={form.email ?? ''}
              onChange={e => set('email', e.target.value)}
              placeholder="contact@yourcompany.com"
            />
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-phone">Phone Number *</label>
            <input
              id="r-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={form.phone ? 'ocr-filled' : ''}
              value={form.phone ?? ''}
              onChange={e => set('phone', e.target.value)}
              placeholder="+60 12-345 6789"
            />
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-office-state">Office State</label>
            <select
              id="r-office-state"
              name="officeState"
              value={form.officeState ?? ''}
              onChange={e => set('officeState', e.target.value)}
            >
              <option value="">Select state</option>
              {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="sp-form-group">
            <label htmlFor="r-linkedin">LinkedIn Profile</label>
            <input
              id="r-linkedin"
              name="linkedin"
              type="url"
              value={form.linkedin ?? ''}
              onChange={e => set('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>
        </div>
      </div>

      {(form.companyName || form.businessRegistration || form.email || form.phone) && (
        <div className="sp-ocr-note">
          Fields with a green left border were auto-filled from your document. Please verify they are correct.
        </div>
      )}

      <div className="sp-step-actions">
        <button className="sp-btn-secondary" onClick={onBack}>Back</button>
        <button className="sp-btn-primary" onClick={handleNext}>Continue</button>
      </div>
    </div>
  )
}
