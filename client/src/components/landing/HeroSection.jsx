import React from 'react';
import { ShieldCheck, Cpu, Truck, CheckCircle2 } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function HeroSection() {
  return (
    <section id="hero" className="lp-hero-section">
      <div className="lp-hero-bg-overlay" />
      <div className="lp-container lp-hero-container">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            <span>Industrial Packaging Excellence — SRI VARI PACKS</span>
          </div>

          <h1 className="lp-hero-title">
            Precision Corrugated Packaging.{' '}
            <span className="lp-hero-title-gradient">Built for Industry.</span>
          </h1>

          <p className="lp-hero-lead">
            Engineering high-bursting strength corrugated containers, custom die-cut boxes, and heavy-duty 3-Ply up to 13-Ply shipping solutions tailored for modern industrial supply chains.
          </p>

          <div className="lp-hero-highlights">
            <div className="lp-hero-highlight-item">
              <ShieldCheck size={18} className="lp-highlight-icon" />
              <span>High Stacking Strength</span>
            </div>
            <div className="lp-hero-highlight-item">
              <Cpu size={18} className="lp-highlight-icon" />
              <span>CAD Precision Fitting</span>
            </div>
            <div className="lp-hero-highlight-item">
              <Truck size={18} className="lp-highlight-icon" />
              <span>Rapid JIT Dispatch</span>
            </div>
          </div>
        </div>

        {/* Real Industrial Photography Hero Showcase */}
        <div className="lp-hero-visual">
          <div className="lp-hero-image-wrapper">
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80" 
              alt="SRI VARI PACKS Corrugated Box Packaging Manufacturing Facility" 
              className="lp-hero-img"
              loading="eager"
              width="1200"
              height="800"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_PACKAGING_IMAGE;
              }}
            />
            <div className="lp-hero-img-badge">
              <CheckCircle2 size={16} color="#10b981" />
              <div>
                <strong>ISO Quality Standardized</strong>
                <span>Heavy-Duty 3 to 13-Ply Flutes</span>
              </div>
            </div>
          </div>

          {/* Secondary Close-Up Detail Card */}
          <div className="lp-hero-floating-card">
            <div className="lp-floating-card-thumb">
              <img 
                src="https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80" 
                alt="Corrugated Flute Material Detail"
                loading="eager"
                width="400"
                height="300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = FALLBACK_PACKAGING_IMAGE;
                }}
              />
            </div>
            <div className="lp-floating-card-info">
              <span className="lp-tag">Kraft Material</span>
              <h4>100% Recyclable Fluting</h4>
              <p>Reinforced B, C, E & Heavy Double-Wall Fluting</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
