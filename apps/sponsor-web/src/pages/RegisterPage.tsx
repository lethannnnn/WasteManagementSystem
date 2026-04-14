import { useState } from 'react'
import { Link } from 'react-router-dom'
import StepUpload from '../components/register/StepUpload'
import StepReview from '../components/register/StepReview'
import StepSubmit from '../components/register/StepSubmit'
import type { RegisterData } from '../types'

type Step = 1 | 2 | 3 | 'done'

function StepDot({ n, active, label }: { n: number; active: boolean; label: string }) {
  return (
    <div className="sp-step-dot-wrap">
      <div className={`sp-step-dot${active ? ' active' : ''}`}>{n}</div>
      <span className="sp-step-dot-label">{label}</span>
    </div>
  )
}

function SuccessScreen() {
  return (
    <div className="sp-success-screen">
      <div className="sp-success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2>Application Submitted!</h2>
      <p>
        Thank you for your interest in partnering with MyCycle+.<br />
        Our team will review your application and contact you within 3–5 business days.
      </p>
      <Link to="/" className="sp-btn-primary">Back to Home</Link>
    </div>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<Partial<RegisterData>>({})

  const merge = (partial: Partial<RegisterData>) => setData(prev => ({ ...prev, ...partial }))

  return (
    <div className="sp-register-page">
      <div className="sp-register-nav">
        <Link to="/" className="sp-register-logo"><img src="/mycycle-logo.png" alt="MyCycle+" /></Link>
        <Link to="/login" className="sp-btn-secondary small">Partner Login</Link>
      </div>

      {step !== 'done' && (
        <div className="sp-register-header">
          <h1>Become a Partner</h1>
          <p>Join Malaysia's leading recycling reward platform</p>
          <div className="sp-steps-indicator">
            <StepDot n={1} active={step >= 1} label="Upload Document" />
            <div className="sp-step-connector" />
            <StepDot n={2} active={step >= 2} label="Review Details" />
            <div className="sp-step-connector" />
            <StepDot n={3} active={step >= 3} label="Partnership Info" />
          </div>
        </div>
      )}

      <div className="sp-register-body">
        {step === 'done' && <SuccessScreen />}
        {step === 1 && (
          <StepUpload onNext={extracted => { merge(extracted); setStep(2) }} />
        )}
        {step === 2 && (
          <StepReview
            data={data}
            onBack={() => setStep(1)}
            onNext={reviewed => { merge(reviewed); setStep(3) }}
          />
        )}
        {step === 3 && (
          <StepSubmit
            data={data}
            onBack={() => setStep(2)}
            onDone={() => setStep('done')}
          />
        )}
      </div>
    </div>
  )
}
