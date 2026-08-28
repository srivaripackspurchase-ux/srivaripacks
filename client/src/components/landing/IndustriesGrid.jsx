import React from 'react';
import { useScrollReveal } from './hooks/useScrollReveal';

/**
 * IndustriesGrid — Interactive grid of industries served by SRIVARI PACKERS.
 * Each card has an emoji icon and hover animation with gradient background.
 */

const industries = [
  { icon: '🍕', name: 'Food & Beverage', color: '#ef4444' },
  { icon: '💊', name: 'Pharmaceuticals', color: '#3b82f6' },
  { icon: '🚗', name: 'Automobile', color: '#f59e0b' },
  { icon: '📱', name: 'Electronics', color: '#6366f1' },
  { icon: '🧵', name: 'Textiles', color: '#ec4899' },
  { icon: '🪑', name: 'Furniture', color: '#8b5cf6' },
  { icon: '🌾', name: 'Agriculture', color: '#22c55e' },
  { icon: '🛒', name: 'E-Commerce', color: '#06b6d4' },
];

export default function IndustriesGrid() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="lp-section lp-section-bg" id="industries" ref={sectionRef}>
      <div className="lp-container">
        {/* Section header */}
        <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="lp-label">Industries We Serve</span>
          <h2 className="lp-heading">
            Trusted Across <span className="lp-gradient-text">Industries</span>
          </h2>
          <p className="lp-subheading">
            From food to furniture, our packaging protects products across
            every major industry vertical.
          </p>
        </div>

        {/* Grid */}
        <div className="lp-industries-grid">
          {industries.map((industry, index) => (
            <div
              key={industry.name}
              className={`lp-industry-card lp-reveal lp-reveal-delay-${index + 1} ${isVisible ? 'visible' : ''}`}
            >
              <div className="lp-industry-icon">{industry.icon}</div>
              <div className="lp-industry-name">{industry.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
