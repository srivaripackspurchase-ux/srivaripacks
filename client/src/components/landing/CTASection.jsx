import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function CTASection() {
  return (
    <section id="contact" className="lp-cta-section">
      <div className="lp-container">
        <div className="lp-cta-card">
          <img 
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1600&q=80" 
            alt="SRI VARI PACKS Corrugated Factory Manufacturing Floor"
            className="lp-cta-bg-img"
            loading="lazy"
            width="1600"
            height="900"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_PACKAGING_IMAGE;
            }}
          />
          <div className="lp-cta-overlay" />

          <div className="lp-cta-content">
            <span className="lp-cta-tag">DIRECT FACTORY CONTACT</span>
            <h2 className="lp-cta-title">
              Contact Factory Operations
            </h2>
            <p className="lp-cta-desc">
              Connect directly with the <strong>SRI VARI PACKS</strong> sales, engineering, and logistics teams.
            </p>

            {/* Direct Official Contact Cards (3 Columns Desktop/Laptop, 1 Column Mobile) */}
            <div className="lp-contact-cards-grid">
              <div className="lp-contact-info-card">
                <div className="lp-contact-card-header">
                  <MapPin size={20} className="lp-contact-card-icon" />
                  <span className="lp-contact-card-label">Factory & Registered Address</span>
                </div>
                <strong className="lp-contact-card-val">
                  8/26, C-2, Sreeram Amman Avenue, Megarali Street, Edayarpalayam, Vellalore, Coimbatore - 641111.
                </strong>
              </div>

              <div className="lp-contact-info-card">
                <div className="lp-contact-card-header">
                  <Phone size={20} className="lp-contact-card-icon" />
                  <span className="lp-contact-card-label">Phone / WhatsApp Line</span>
                </div>
                <a href="tel:+917397789656" className="lp-contact-card-link">
                  +91 73977 89656
                </a>
              </div>

              <div className="lp-contact-info-card">
                <div className="lp-contact-card-header">
                  <Mail size={20} className="lp-contact-card-icon" />
                  <span className="lp-contact-card-label">Purchase & Email Line</span>
                </div>
                <a href="mailto:srivaripackspurchase@gmail.com" className="lp-contact-card-link lp-email-link">
                  srivaripackspurchase@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
