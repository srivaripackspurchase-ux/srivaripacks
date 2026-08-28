import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function QualitySection({ onOpenQuote }) {
  const qualityTests = [
    {
      title: 'Bursting Factor (BF) Testing',
      metric: '12 - 22 BF Tested Range',
      desc: 'Hydrostatic pressure testing of kraft paper layers to ensure high resistance against bursting under internal payload shock.',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Grammage (GSM) Uniformity',
      metric: '100 - 220 GSM Range',
      desc: 'Precision digital GSM scale checks across paper reels ensure consistent linerboard density and wall thickness.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Edge Crush Test (ECT)',
      metric: 'Standard Lab Verified',
      desc: 'Measures the cross-direction crushing strength of corrugated board flutes to guarantee vertical stacking column capacity.',
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Ring Crush Test (RCT)',
      metric: 'High Ring Stiffness',
      desc: 'Evaluates stiffness of paper strip in cylindrical form, ensuring liner resists buckling under high ambient humidity.',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <section id="quality" className="lp-quality-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <span className="lp-section-tag">LABORATORY STANDARDS</span>
          <h2 className="lp-section-title">
            Rigorous Quality & Load Assurance
          </h2>
          <p className="lp-section-desc">
            At <strong>SRI VARI PACKS</strong>, quality is measured, tested, and verified on every manufacturing batch.
          </p>
        </div>

        {/* Tangible Quality Testing Grid */}
        <div className="lp-quality-grid">
          {qualityTests.map((test, i) => (
            <div key={i} className="lp-quality-card">
              <div className="lp-quality-thumb">
                <img 
                  src={test.image} 
                  alt={test.title} 
                  className="lp-quality-img"
                  loading="lazy"
                  width="600"
                  height="400"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_PACKAGING_IMAGE;
                  }}
                />
                <div className="lp-quality-metric-badge">
                  <span>{test.metric}</span>
                </div>
              </div>
              <div className="lp-quality-body">
                <h3 className="lp-quality-card-title">{test.title}</h3>
                <p className="lp-quality-card-desc">{test.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Assurance Statement Banner */}
        <div className="lp-quality-banner">
          <div className="lp-banner-icon">
            <ShieldCheck size={32} color="#6366f1" />
          </div>
          <div className="lp-banner-text">
            <h4>Standardized Quality Verification</h4>
            <p>Every order dispatched from SRI VARI PACKS includes batch test compliance reports for BF, GSM, and stacking strength upon request.</p>
          </div>
          <div className="lp-banner-cta">
            <button 
              type="button" 
              className="lp-btn lp-btn-primary"
              onClick={onOpenQuote}
            >
              Request Custom Quote
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
