import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { VERIFIED_PACKAGING_TYPES } from '../../utils/publicCatalog';

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState(VERIFIED_PACKAGING_TYPES[0].id);

  const featured = VERIFIED_PACKAGING_TYPES.find(p => p.id === activeTab) || VERIFIED_PACKAGING_TYPES[0];
  const formattedCalcType = featured.calcType ? featured.calcType.replace(/_/g, ' ').toUpperCase() : '';

  return (
    <section id="products" className="lp-products-section">
      <div className="lp-container">
        <div className="lp-section-header text-left">
          <span className="lp-section-tag">CATALOG & SOLUTIONS</span>
          <h2 className="lp-section-title">
            Precision Corrugated Packaging Range
          </h2>
          <p className="lp-section-desc">
            Explore factory-engineered corrugated packaging manufactured with rigorous GSM and Bursting Factor controls.
          </p>
        </div>

        {/* Product Navigation Pills with Numbered Badges */}
        <div className="lp-product-tabs">
          {VERIFIED_PACKAGING_TYPES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              className={`lp-product-tab ${activeTab === p.id ? 'active' : ''}`}
              onClick={() => setActiveTab(p.id)}
            >
              <span className="lp-product-tab-num">0{idx + 1}</span>
              <span className="lp-product-tab-title">{p.title}</span>
            </button>
          ))}
        </div>

        {/* Featured Editorial Product Showcase Layout */}
        <div className={`lp-product-showcase-card ${!featured.image ? 'no-image-layout' : ''}`}>
          {/* Custom User Image Container (Full Covered Border Wall-to-Wall Placement) */}
          {featured.image ? (
            <div className="lp-showcase-visual">
              <div className="lp-material-photo-wrapper">
                <img 
                  src={featured.image} 
                  alt={featured.title}
                  className="lp-showcase-img"
                  loading="lazy"
                  width="1000"
                  height="750"
                />
                <div className="lp-showcase-badge">
                  <span>{formattedCalcType} CONFIGURATION</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="lp-showcase-details">
            <span className="lp-showcase-category">CALCULATION TYPE: {formattedCalcType}</span>
            <h3 className="lp-showcase-title">{featured.title}</h3>
            <p className="lp-showcase-desc">{featured.description}</p>

            {/* Verified Specifications Grid */}
            <div className="lp-showcase-specs">
              <div className="lp-spec-box">
                <span className="lp-spec-label">Supported Ply Range</span>
                <span className="lp-spec-value">{featured.plyOptions.join(', ')}</span>
              </div>
              <div className="lp-spec-box">
                <span className="lp-spec-label">GSM Paper Weight</span>
                <span className="lp-spec-value">{featured.gsmRange}</span>
              </div>
              <div className="lp-spec-box">
                <span className="lp-spec-label">Bursting Factor (BF)</span>
                <span className="lp-spec-value">{featured.bfRange}</span>
              </div>
              <div className="lp-spec-box">
                <span className="lp-spec-label">Target Applications</span>
                <span className="lp-spec-value">{featured.applications}</span>
              </div>
            </div>

            {/* Verified Feature Highlights */}
            <div className="lp-showcase-features">
              <div className="lp-feature-item">
                <Check size={16} className="lp-check-icon" />
                <span>Custom CAD Dimensions & Flap Allowances</span>
              </div>
              <div className="lp-feature-item">
                <Check size={16} className="lp-check-icon" />
                <span>Multi-Color Flexographic Branding & Water-Based Inks</span>
              </div>
              <div className="lp-feature-item">
                <Check size={16} className="lp-check-icon" />
                <span>Lab Test Verified Bursting Factor (BF) & Edge Crush Test (ECT)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
