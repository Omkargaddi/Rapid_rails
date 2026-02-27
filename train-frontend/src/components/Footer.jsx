import React from 'react';
import { Github, Mail, Info, MapPin, Twitter, ExternalLink } from 'lucide-react';
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
  
      <footer className="ft-root">
        <div className="ft-inner">
          <div className="ft-grid">

            <div>
              <img src="/logo2.png" alt="Rail Route Logo" className="ft-logo" />
              <p className="ft-desc">
                Simplifying Indian Railway journeys with intelligent multi-leg route planning and real-time insights.
              </p>
              <div className="ft-socials">
                {[Twitter, Github, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="ft-social-btn"><Icon size={16} /></a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="ft-col-title">Navigation</h4>
              <ul className="ft-links">
                {[['Find Routes', '/'], ['Saved Journeys', '/favorites'], ['Live Schedules', '/schedules'], ['Station Index', '/stations']].map(([label, href]) => (
                  <li key={label}><a href={href} className="ft-link">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="ft-col-title">Support</h4>
              <ul className="ft-links">
                {['Help Center', 'Privacy Policy', 'Terms of Service'].map(label => (
                  <li key={label}><a href="#" className="ft-link">{label}</a></li>
                ))}
                <li>
                  <a href="#" className="ft-link">
                    Data Sources <ExternalLink size={11} />
                  </a>
                </li>
              </ul>
            </div>
            <div className="ft-status-card">
              <h4 className="ft-status-title">Platform Status</h4>
              <div className="ft-status-badge">
                <div className="ft-status-dot" />
                <span className="ft-status-txt">All Systems Operational</span>
              </div>
              <p className="ft-status-desc">
                Get updates on new features and engine optimizations.
              </p>
              <div className="ft-email-wrap">
                <input type="email" placeholder="your@email.com" className="ft-email-input" />
                <button className="ft-email-btn"><Mail size={14} /></button>
              </div>
            </div>
          </div>
          <div className="ft-bottom">
            <p className="ft-copy">© {currentYear} Rail Route Engine. Built for optimized travel.</p>
            <div className="ft-meta">
              <div className="ft-meta-item">
                <MapPin size={11} style={{ color: '#f97316' }} /> India
              </div>
              <div className="ft-meta-item">
                <Info size={11} style={{ color: '#fbbf24' }} /> v2.4.0-stable
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;