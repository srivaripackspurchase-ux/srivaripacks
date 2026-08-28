import React from 'react';
import { MapPin, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function AboutFacilitySection() {
  return (
    <section id="about" className="lp-about-section">
      <div className="lp-container">
        <div className="lp-about-grid">
          {/* Visual Showcase */}
          <div className="lp-about-visual">
            <div className="lp-about-image-frame">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80" 
                alt="SRI VARI PACKS Corrugated Plant"
                className="lp-about-img"
                loading="lazy"
                width="1200"
                height="800"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_PACKAGING_IMAGE;
                }}
              />
              <div className="lp-about-experience-badge">
                <span className="lp-exp-num">3 - 13 Ply</span>
                <span className="lp-exp-label">Industrial Corrugation Range</span>
              </div>
            </div>
          </div>

          {/* Company Story & Capability Info */}
          <div className="lp-about-content">
            <span className="lp-section-tag">ABOUT SRI VARI PACKS</span>
            <h2 className="lp-about-title">
              Precision Corrugated Packaging Manufacturers
            </h2>

            <p className="lp-about-lead">
              Headquartered in Coimbatore, <strong>SRI VARI PACKS</strong> is a specialized manufacturer of corrugated shipping containers, die-cut packaging boxes, and heavy-duty multi-wall industrial cartons up to 13-Ply.
            </p>

            <p className="lp-about-body">
              Equipped with high-speed corrugators, multi-color flexographic printing presses, and rotary die-cutters, our operations serve automotive, pharmaceutical, e-commerce, and FMCG leaders across regional and national distribution networks.
            </p>

            {/* Verified Capability Stats */}
            <div className="lp-about-highlights-grid">
              <div className="lp-about-highlight-box">
                <CheckCircle2 size={18} className="lp-about-check" />
                <div>
                  <strong>High-Speed Production</strong>
                  <span>Automatic Corrugation Lines</span>
                </div>
              </div>
              <div className="lp-about-highlight-box">
                <CheckCircle2 size={18} className="lp-about-check" />
                <div>
                  <strong>Custom CAD Prototyping</strong>
                  <span>Sample CAD Box Development</span>
                </div>
              </div>
              <div className="lp-about-highlight-box">
                <CheckCircle2 size={18} className="lp-about-check" />
                <div>
                  <strong>Quality Lab Controls</strong>
                  <span>BF, GSM, RCT & ECT Testing</span>
                </div>
              </div>
              <div className="lp-about-highlight-box">
                <CheckCircle2 size={18} className="lp-about-check" />
                <div>
                  <strong>Factory-Direct Delivery</strong>
                  <span>Scheduled Supply Fleet Dispatch</span>
                </div>
              </div>
            </div>

            {/* Direct Contact & Location Summary */}
            <div className="lp-about-contact-bar">
              <div className="lp-contact-item">
                <MapPin size={16} className="lp-contact-icon" />
                <span>8/26, C-2, Sreeram Amman Avenue, Megarali Street, Edayarpalayam, Vellalore, Coimbatore - 641111</span>
              </div>
              <div className="lp-contact-item">
                <Phone size={16} className="lp-contact-icon" />
                <a href="tel:+917397789656">+91 73977 89656</a>
              </div>
              <div className="lp-contact-item">
                <Mail size={16} className="lp-contact-icon" />
                <a href="mailto:srivaripackspurchase@gmail.com">srivaripackspurchase@gmail.com</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
