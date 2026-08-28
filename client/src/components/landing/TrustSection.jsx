import React from 'react';
import { Factory } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function TrustSection() {
  return (
    <section className="lp-trust-section">
      <div className="lp-container">
        <div className="lp-trust-grid">
          {/* Editorial Statement & Verified Technical Metrics */}
          <div className="lp-trust-content">
            <span className="lp-section-tag">ENGINEERED CAPABILITY</span>
            <h2 className="lp-trust-title">
              Precision Corrugated Manufacturing & Standardized Quality Controls
            </h2>
            <p className="lp-trust-text">
              At <strong>SRI VARI PACKS</strong>, every carton is engineered using verified GSM and Bursting Factor (BF) standards to guarantee structural integrity across global supply chains.
            </p>

            <div className="lp-trust-metrics">
              <div className="lp-metric-item">
                <div className="lp-metric-number">3 to 13-Ply</div>
                <div className="lp-metric-label">Multi-Wall Corrugation Capability</div>
              </div>
              <div className="lp-metric-item">
                <div className="lp-metric-number">100 - 220</div>
                <div className="lp-metric-label">GSM Paper Weight Options</div>
              </div>
              <div className="lp-metric-item">
                <div className="lp-metric-number">12 - 22 BF</div>
                <div className="lp-metric-label">Tested Bursting Factor Grades</div>
              </div>
            </div>
          </div>

          {/* Real Photography Industrial Showcase */}
          <div className="lp-trust-visual">
            <div className="lp-trust-image-card">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80" 
                alt="SRI VARI PACKS Corrugated Packaging Manufacturing"
                className="lp-trust-img"
                loading="lazy"
                width="1000"
                height="650"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_PACKAGING_IMAGE;
                }}
              />
              <div className="lp-trust-image-overlay">
                <div className="lp-overlay-badge">
                  <Factory size={16} />
                  <span>Verified Corrugation & Die-Cutting Production</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
