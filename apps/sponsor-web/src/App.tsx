import React, { useState } from 'react';
import './App.css';

function App() {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    website: '',
    contactPerson: '',
    email: '',
    phone: '',
    position: '',
    companySize: '',
    partnershipType: '',
    budget: '',
    objectives: '',
    targetAudience: '',
    sustainabilityGoals: '',
    additionalInfo: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
    alert('Thank you for your interest! We will contact you within 24 hours.');
    setShowRegistrationForm(false);
    // Reset form
    setFormData({
      companyName: '',
      industry: '',
      website: '',
      contactPerson: '',
      email: '',
      phone: '',
      position: '',
      companySize: '',
      partnershipType: '',
      budget: '',
      objectives: '',
      targetAudience: '',
      sustainabilityGoals: '',
      additionalInfo: ''
    });
  };

  if (showRegistrationForm) {
    return (
      <div className="App">
        {/* Navigation Header */}
        <nav className="navbar">
          <div className="nav-content">
            <div className="logo">
              <h2>MyCycle+</h2>
            </div>
            <div className="nav-links">
              <button 
                className="btn-secondary" 
                onClick={() => setShowRegistrationForm(false)}
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </nav>

        {/* Registration Form Section */}
        <section className="registration-form-section">
          <div className="container">
            <div className="form-header">
              <h1>Become a MyCycle+ Partner</h1>
              <p>Join leading brands in promoting sustainability and engaging with eco-conscious consumers</p>
            </div>

            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Company Information */}
                <div className="form-section">
                  <h3>Company Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="companyName">Company Name *</label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      placeholder="Your company name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="industry">Industry *</label>
                    <select
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select your industry</option>
                      <option value="retail">Retail & E-commerce</option>
                      <option value="food-beverage">Food & Beverage</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Financial Services</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="automotive">Automotive</option>
                      <option value="hospitality">Hospitality & Tourism</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="telecommunications">Telecommunications</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="website">Company Website</label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://www.yourcompany.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="companySize">Company Size *</label>
                    <select
                      id="companySize"
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select company size</option>
                      <option value="startup">Startup (1-10 employees)</option>
                      <option value="small">Small (11-50 employees)</option>
                      <option value="medium">Medium (51-200 employees)</option>
                      <option value="large">Large (201-1000 employees)</option>
                      <option value="enterprise">Enterprise (1000+ employees)</option>
                    </select>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                  <h3>Contact Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="contactPerson">Contact Person *</label>
                    <input
                      type="text"
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      required
                      placeholder="Full name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="position">Position/Title *</label>
                    <input
                      type="text"
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      required
                      placeholder="Your job title"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Business Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="contact@yourcompany.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="+60 12-345-6789"
                    />
                  </div>
                </div>

                {/* Partnership Details */}
                <div className="form-section">
                  <h3>Partnership Preferences</h3>
                  
                  <div className="form-group">
                    <label htmlFor="partnershipType">Partnership Type *</label>
                    <select
                      id="partnershipType"
                      name="partnershipType"
                      value={formData.partnershipType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select partnership type</option>
                      <option value="reward-sponsor">Reward Sponsor</option>
                      <option value="brand-integration">Brand Integration</option>
                      <option value="co-marketing">Co-Marketing</option>
                      <option value="csr-partnership">CSR Partnership</option>
                      <option value="technology-partner">Technology Partner</option>
                      <option value="full-partnership">Full Partnership</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="budget">Estimated Monthly Budget (RM) *</label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select budget range</option>
                      <option value="1000-5000">RM 1,000 - 5,000</option>
                      <option value="5000-15000">RM 5,000 - 15,000</option>
                      <option value="15000-50000">RM 15,000 - 50,000</option>
                      <option value="50000-100000">RM 50,000 - 100,000</option>
                      <option value="100000+">RM 100,000+</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="targetAudience">Target Audience</label>
                    <input
                      type="text"
                      id="targetAudience"
                      name="targetAudience"
                      value={formData.targetAudience}
                      onChange={handleInputChange}
                      placeholder="e.g., Young professionals, Families, Students"
                    />
                  </div>
                </div>

                {/* Goals and Objectives */}
                <div className="form-section">
                  <h3>Goals & Objectives</h3>
                  
                  <div className="form-group">
                    <label htmlFor="objectives">Marketing Objectives *</label>
                    <textarea
                      id="objectives"
                      name="objectives"
                      value={formData.objectives}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      placeholder="What do you hope to achieve through this partnership? (e.g., brand awareness, customer acquisition, CSR goals)"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="sustainabilityGoals">Sustainability Goals</label>
                    <textarea
                      id="sustainabilityGoals"
                      name="sustainabilityGoals"
                      value={formData.sustainabilityGoals}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe your company's sustainability initiatives and environmental goals"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="additionalInfo">Additional Information</label>
                    <textarea
                      id="additionalInfo"
                      name="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any additional information you'd like to share about your company or partnership expectations"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRegistrationForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary large">
                  Submit Partnership Application
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-bottom">
              <p>&copy; 2024 MyCycle+. All rights reserved. Made with 💚 for a sustainable future.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">
            <h2>MyCycle+</h2>
          </div>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#sponsors">For Sponsors</a>
            <a href="#contact">Contact</a>
            <button className="btn-primary">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Turn Your Recyclables Into Rewards</h1>
            <p className="hero-subtitle">
              Malaysia's first reward-based recycling management system. 
              Schedule pickups, earn points, and make a positive environmental impact.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary large">Download App</button>
              <button className="btn-secondary large">Learn More</button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat">
                <span className="stat-number">500+</span>
                <span className="stat-label">Tons Recycled</span>
              </div>
              <div className="stat">
                <span className="stat-number">50+</span>
                <span className="stat-label">Partner Brands</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="app-preview">📱 MyCycle+ App</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Why Choose MyCycle+?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Easy Scheduling</h3>
              <p>Schedule recycling pickups with just a few taps. Our collectors will come to you at your convenience.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Earn Rewards</h3>
              <p>Get points for every kilogram recycled. Redeem rewards from our partner brands and local businesses.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Real-time Tracking</h3>
              <p>Track your pickup in real-time and get notifications when collectors are on their way.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Environmental Impact</h3>
              <p>See your positive environmental impact with detailed analytics and carbon footprint tracking.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚛</div>
              <h3>Smart Routes</h3>
              <p>AI-powered route optimization ensures efficient collection and reduces carbon emissions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics Dashboard</h3>
              <p>Comprehensive analytics for individuals, businesses, and communities to track progress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Schedule Pickup</h3>
              <p>Use our mobile app to schedule a convenient pickup time for your recyclables.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Prepare Materials</h3>
              <p>Sort your recyclables according to our guidelines and place them at the pickup location.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Collection & Weighing</h3>
              <p>Our certified collectors arrive, weigh your materials, and provide instant point credits.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Earn & Redeem</h3>
              <p>Accumulate points and redeem them for rewards from our extensive partner network.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section id="sponsors" className="sponsors">
        <div className="container">
          <h2 className="section-title">Partner With Us</h2>
          <p className="section-subtitle">
            Join leading brands in promoting sustainability while engaging with environmentally conscious consumers.
          </p>
          <div className="sponsor-benefits">
            <div className="benefit-card">
              <h3>🎯 Targeted Engagement</h3>
              <p>Connect with eco-conscious consumers who actively participate in recycling activities.</p>
            </div>
            <div className="benefit-card">
              <h3>📈 Brand Visibility</h3>
              <p>Increase brand awareness through our reward system and sustainability initiatives.</p>
            </div>
            <div className="benefit-card">
              <h3>🌍 CSR Impact</h3>
              <p>Demonstrate corporate social responsibility with measurable environmental impact.</p>
            </div>
          </div>
          <div className="sponsor-cta">
            <button 
              className="btn-primary large"
              onClick={() => setShowRegistrationForm(true)}
            >
              Become a Partner
            </button>
            <button className="btn-secondary large">View Partner Portal</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>MyCycle+</h3>
              <p>Malaysia's leading reward-based recycling platform, making sustainability accessible and rewarding for everyone.</p>
              <div className="social-links">
                <a href="#" className="social-link">📘</a>
                <a href="#" className="social-link">📸</a>
                <a href="#" className="social-link">🐦</a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#sponsors">For Sponsors</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#contact">Contact Us</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Download</h4>
              <div className="app-buttons">
                <button className="app-button">📱 App Store</button>
                <button className="app-button">🤖 Google Play</button>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 MyCycle+. All rights reserved. Made with 💚 for a sustainable future.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
