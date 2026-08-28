import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function WhyChooseUs({ onOpenQuote }) {
  const differentiators = [
    {
      num: '01',
      title: 'High Compression & Edge Crush Strength (ECT)',
      desc: 'Our corrugated boards are engineered using high BF virgin kraft liners and dense fluting to resist intense stacking pressure during multi-tier warehouse storage and transit.',
      image: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      stat: 'Up to 22 BF',
      statLabel: 'Bursting Factor'
    },
    {
      num: '02',
      title: 'Precision CAD Dimensional Tolerances',
      desc: 'Using automated rotary die-cutting and CAD template modeling, every box fits product contours within ±0.5mm tolerance, eliminating internal void movement and product damage.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      stat: '±0.5mm',
      statLabel: 'Fit Accuracy'
    },
    {
      num: '03',
      title: 'Rapid Turnaround & JIT Dispatch',
      desc: 'With continuous high-speed corrugation lines and automated bundling, we support Just-In-Time (JIT) delivery, allowing clients to maintain lean inventory levels.',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
      stat: 'JIT Fleet',
      statLabel: 'Dispatch Service'
    },
    {
      num: '04',
      title: '100% Recyclable & Sustainable Kraft Materials',
      desc: 'We prioritize eco-friendly kraft paper and water-based inks that deliver superior strength while remaining 100% biodegradable and compliant with environmental standards.',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
      stat: '100%',
      statLabel: 'Recyclable Board'
    }
  ];

  return (
    <section id="why-us" className="lp-why-section">
      <div className="lp-container">
        <div className="lp-why-intro">
          <div className="lp-why-intro-content">
            <span className="lp-section-tag">ENGINEERED ADVANTAGE</span>
            <h2 className="lp-why-headline">
              Packaging Engineered Around Your Business.
            </h2>
            <p className="lp-why-subhead">
              At <strong>SRI VARI PACKS</strong>, we don't just supply cardboard containers — we engineer protection solutions that cut freight damage, streamline packing lines, and elevate brand presentation.
            </p>
          </div>
          <div className="lp-why-intro-action">
            <button 
              type="button" 
              className="lp-btn lp-btn-primary"
              onClick={onOpenQuote}
            >
              <span>Get Custom Specification Quote</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* 4 Strong Differentiators Grid with Close-Up Material Photography */}
        <div className="lp-differentiators-grid">
          {differentiators.map((diff, i) => (
            <div key={i} className="lp-diff-card">
              <div className="lp-diff-image-wrapper">
                <img 
                  src={diff.image} 
                  alt={diff.title} 
                  className="lp-diff-img"
                  loading="lazy"
                  width="600"
                  height="400"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_PACKAGING_IMAGE;
                  }}
                />
                <div className="lp-diff-stat-overlay">
                  <span className="lp-diff-stat-val">{diff.stat}</span>
                  <span className="lp-diff-stat-lbl">{diff.statLabel}</span>
                </div>
              </div>
              <div className="lp-diff-content">
                <span className="lp-diff-num">{diff.num}</span>
                <h3 className="lp-diff-title">{diff.title}</h3>
                <p className="lp-diff-desc">{diff.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}