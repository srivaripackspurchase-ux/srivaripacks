import React from 'react';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useCountUp } from './hooks/useCountUp';

/**
 * FacilitySection — Manufacturing facility showcase with parallax effect,
 * animated conveyor belt, and facility statistics.
 */

function FacilityStat({ value, suffix, label, isVisible, delay }) {
  const count = useCountUp(value, isVisible, 2000);

  return (
    <div
      className={`lp-facility-stat lp-reveal lp-reveal-delay-${delay} ${isVisible ? 'visible' : ''}`}
    >
      <div className="lp-facility-stat-value lp-gradient-text">
        {count}{suffix}
      </div>
      <div className="lp-facility-stat-label">{label}</div>
    </div>
  );
}

export default function FacilitySection() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="lp-section lp-facility" id="facility" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-facility-content">
          {/* Section header */}
          <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
            <span className="lp-label">Our Facility</span>
            <h2 className="lp-heading">
              State-of-the-Art{' '}
              <span className="lp-gradient-text">Manufacturing</span>
            </h2>
            <p className="lp-subheading">
              Our modern manufacturing facility is equipped with advanced corrugation
              machinery, precision cutting systems, and quality testing laboratories.
            </p>
          </div>

          {/* Facility stats */}
          <div className="lp-facility-stats">
            <FacilityStat
              value={25000}
              suffix=" sq ft"
              label="Factory Floor Area"
              isVisible={isVisible}
              delay={1}
            />
            <FacilityStat
              value={12}
              suffix="+"
              label="Advanced Machines"
              isVisible={isVisible}
              delay={2}
            />
            <FacilityStat
              value={5000}
              suffix="+"
              label="Boxes / Day Capacity"
              isVisible={isVisible}
              delay={3}
            />
          </div>

          {/* Animated conveyor belt */}
          <div className={`lp-conveyor lp-reveal lp-reveal-delay-4 ${isVisible ? 'visible' : ''}`}>
            <div className="lp-conveyor-belt" />
            <div className="lp-conveyor-boxes">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="lp-conveyor-box" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
