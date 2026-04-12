import { useState } from 'react'

interface Props {
  name:    string
  email:   string
  phone:   string
  onClose: () => void
}

export default function CollectorContactModal({ name, email, phone, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '380px' }}>
        <div className="modal-header">
          <h3>Contact Collector</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="contact-avatar-row">
            <div className="contact-avatar">{name.charAt(0).toUpperCase()}</div>
            <span className="contact-name">{name}</span>
          </div>

          <div className="contact-row">
            <div className="contact-info">
              <span className="contact-label">Email</span>
              <span className="contact-value">{email || '—'}</span>
            </div>
            {email && (
              <button className="copy-btn" onClick={() => copy(email, 'email')}>
                {copied === 'email' ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          <div className="contact-row">
            <div className="contact-info">
              <span className="contact-label">Phone</span>
              <span className="contact-value">{phone || '—'}</span>
            </div>
            {phone && (
              <button className="copy-btn" onClick={() => copy(phone, 'phone')}>
                {copied === 'phone' ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {email && (
            <a href={`mailto:${email}`} className="modal-btn primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginTop: '0.5rem' }}>
              Open Email Client
            </a>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
