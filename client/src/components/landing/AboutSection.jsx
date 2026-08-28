import React from 'react';
import { MapPin, Phone, Mail, Building2, FileText } from 'lucide-react';
import { useScrollReveal } from './hooks/useScrollReveal';

/**
 * AboutSection — Company details section for SRIVARI PACKERS landing page.
 * Displays official address, state code 33 (Tamil Nadu), contact phone, and purchase email.
 */
export default function AboutSection() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="lp-section" id="about-us" ref={sectionRef}>
      <div className="lp-container">
        {/* Section header */}
        <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="lp-label">About Our Company</span>
          <h2 className="lp-heading">
            About <span className="lp-gradient-text">SRIVARI PACKERS</span>
          </h2>
          <p className="lp-subheading">
            Pioneering excellence in corrugated box manufacturing & custom industrial packaging solutions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '32px' }}>
          {/* Address Card */}
          <div className={`lp-feature-card lp-reveal lp-reveal-delay-1 ${isVisible ? 'visible' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="lp-feature-icon-wrapper" style={{ color: 'var(--color-accent)' }}>
              <MapPin size={28} />
            </div>
            <h3 className="lp-feature-title" style={{ fontSize: '1.2rem' }}>Registered Factory Address</h3>
            <p className="lp-feature-desc" style={{ fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--text-primary)' }}>
              8/26, C-2, Sreeram Amman Avenue, Megarali Street, Edayarpalayam, Vellalore, Coimbatore - 641111.
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Building2 size={16} />
              <span>State: <strong>Tamil Nadu</strong> (State Code: <strong>33</strong>)</span>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className={`lp-feature-card lp-reveal lp-reveal-delay-2 ${isVisible ? 'visible' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="lp-feature-icon-wrapper" style={{ color: '#10b981' }}>
              <Phone size={28} />
            </div>
            <h3 className="lp-feature-title" style={{ fontSize: '1.2rem' }}>Direct Contact Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              <a href="tel:+917397789656" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={18} />
                </div>
                <span>+91 7397789656</span>
              </a>
              <a href="mailto:srivaripackspurchase@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} />
                </div>
                <span>srivaripackspurchase@gmail.com</span>
              </a>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <FileText size={16} />
              <span>State Code: <strong>33</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
