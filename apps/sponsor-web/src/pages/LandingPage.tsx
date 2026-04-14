import { Link } from 'react-router-dom'
import { useState } from 'react'

const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Targeted Consumer Reach',
    desc: 'Connect directly with thousands of eco-conscious Malaysians who actively recycle — your most aligned audience.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Measurable CSR Impact',
    desc: 'Every redemption is tied to real weight recycled and CO₂ saved — giving you concrete numbers to report.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    title: 'Real-Time Analytics',
    desc: 'Track redemptions, donor engagement, cost per redemption, and campaign ROI from your sponsor dashboard.',
  },
]

const STEPS = [
  { n: '01', title: 'Apply & Verify',    desc: 'Upload your business registration. Our OCR auto-fills your company details in seconds.' },
  { n: '02', title: 'Get Approved',      desc: 'Our team reviews your application within 3–5 business days and sets up your account.' },
  { n: '03', title: 'Create Rewards',    desc: 'Design reward campaigns — vouchers, discounts, or freebies — that donors can redeem with recycling points.' },
  { n: '04', title: 'Track Performance', desc: 'Monitor your campaign in real time: reach, redemptions, cost, and environmental impact attributed to your brand.' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo"><img src="/mycycle-logo.png" alt="MyCycle+" /></div>
          <div className={`nav-links${mobileMenuOpen ? ' open' : ''}`}>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)}>Benefits</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)}>Platform</a>
            <Link to="/login" className="btn-secondary" onClick={() => setMobileMenuOpen(false)}>Partner Login</Link>
            <Link to="/register" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>Become a Partner</Link>
          </div>
          <button className="nav-hamburger" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">Malaysia's #1 Recycling Reward Platform</div>
            <h1>Grow Your Brand with Eco-Conscious Consumers</h1>
            <p className="hero-subtitle">
              Partner with MyCycle+ to reach thousands of active recyclers, fund sustainable rewards,
              and turn your CSR goals into measurable environmental impact.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn-primary large">Become a Partner</Link>
              <Link to="/login" className="btn-secondary large">Partner Login</Link>
            </div>
            <div className="hero-stats">
              <div className="stat"><span className="stat-number">10K+</span><span className="stat-label">Active Donors</span></div>
              <div className="stat"><span className="stat-number">500+</span><span className="stat-label">Tons Recycled</span></div>
              <div className="stat"><span className="stat-number">50+</span><span className="stat-label">Partner Brands</span></div>
            </div>
          </div>
          <div className="hero-image">
            <div className="sp-dashboard-preview">
              <div className="sp-preview-header">
                <span className="sp-preview-dot-green" />
                <span>Campaign Performance</span>
                <span className="sp-preview-live">LIVE</span>
              </div>
              <div className="sp-preview-metrics">
                {[['2,840','Consumer Reach'],['1,204','Redeemed'],['RM 8.4k','Invested']].map(([n, l]) => (
                  <div key={l} className="sp-preview-metric">
                    <span className="sp-preview-num">{n}</span>
                    <span className="sp-preview-label">{l}</span>
                  </div>
                ))}
              </div>
              <div className="sp-preview-divider" />
              <div className="sp-preview-title">Top Rewards</div>
              {[['Eco Tote Bag', 47],['Starbucks RM5', 31],['Discount Code', 22]].map(([name, pct]) => (
                <div key={name} className="sp-preview-bar-row">
                  <span className="sp-preview-bar-name">{name}</span>
                  <div className="sp-preview-bar"><div className="sp-preview-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="sp-preview-bar-pct">{pct}%</span>
                </div>
              ))}
              <div className="sp-preview-sample-tag">Sample data</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="features">
        <div className="container">
          <h2 className="section-title">Why Partner with MyCycle+?</h2>
          <div className="features-grid three-col">
            {BENEFITS.map(b => (
              <div key={b.title} className="feature-card">
                <div className="feature-icon-svg">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">From application to live campaign in just a few steps.</p>
          <div className="steps">
            {STEPS.map(s => (
              <div key={s.n} className="step">
                <div className="step-number">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section id="stats" className="sp-trust-section">
        <div className="container">
          <h2 className="section-title">A Platform Built for Impact</h2>
          <div className="sp-trust-grid">
            {[['6','Recyclable Categories'],['10K+','Active Donors'],['500+','Tons Recycled'],['3','Cities Covered']].map(([n, l]) => (
              <div key={l} className="sp-trust-card">
                <span className="sp-trust-num">{n}</span>
                <span className="sp-trust-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="sponsors">
        <div className="container">
          <h2 className="section-title">Ready to Make an Impact?</h2>
          <p className="section-subtitle">Join leading Malaysian brands building a more sustainable future — one recycled kilogram at a time.</p>
          <div className="sponsor-cta">
            <Link to="/register" className="btn-primary large">Apply to Partner</Link>
            <Link to="/login" className="btn-secondary large">Existing Partner Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>MyCycle+</h3>
              <p>Malaysia's leading reward-based recycling platform — making sustainability accessible and rewarding for everyone.</p>
            </div>
            <div className="footer-section">
              <h4>Sponsors</h4>
              <ul>
                <li><Link to="/register">Become a Partner</Link></li>
                <li><Link to="/login">Partner Login</Link></li>
                <li><a href="#benefits">Benefits</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="mailto:support@mycycle.my">Contact Us</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Platform</h4>
              <ul>
                <li><a href="#">Donor App</a></li>
                <li><a href="#">Collector App</a></li>
                <li><a href="#">Admin Portal</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 MyCycle+. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
