import React, { useEffect, useState } from 'react';
import { useScrollReveal } from './hooks/useScrollReveal';

/**
 * QualityGauges — Animated SVG circular gauge meters for quality standards.
 * Each gauge fills up with a gradient ring when scrolled into view.
 */

const gauges = [
  { label: 'Burst Factor (BF)', value: 22, max: 30, unit: 'BF' },
  { label: 'Paper GSM', value: 180, max: 250, unit: 'GSM' },
  { label: 'Compression Strength', value: 88, max: 100, unit: '%' },
  { label: 'Moisture Resistance', value: 92, max: 100, unit: '%' },
  { label: 'Burst Test', value: 95, max: 100, unit: '%' },
];

function GaugeRing({ value, max, unit, isVisible, delay }) {
  const [animatedOffset, setAnimatedOffset] = useState(314);

  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314
  const progress = value / max;
  const targetOffset = circumference * (1 - progress);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setAnimatedOffset(targetOffset);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, targetOffset, delay]);

  return (
    <svg className="lp-gauge-svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id={`gauge-grad-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C4DF6" />
          <stop offset="50%" stopColor="#4F8CFF" />
          <stop offset="100%" stopColor="#57E6FF" />
        </linearGradient>
      </defs>

      {/* Track */}
      <circle
        className="lp-gauge-track"
        cx="60" cy="60" r={radius}
      />

      {/* Fill */}
      <circle
        className="lp-gauge-fill"
        cx="60" cy="60" r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={animatedOffset}
        stroke={`url(#gauge-grad-${value})`}
        style={{
          transition: `stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        }}
      />

      {/* Center text */}
      <text className="lp-gauge-value" x="60" y="56">
        {value}
      </text>
      <text
        x="60" y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--lp-text-muted)"
        fontSize="10"
        fontWeight="500"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {unit}
      </text>
    </svg>
  );
}

export default function QualityGauges() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="lp-section lp-section-bg" id="quality" ref={sectionRef}>
      <div className="lp-container">
        {/* Section header */}
        <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="lp-label">Quality Standards</span>
          <h2 className="lp-heading">
            Uncompromising <span className="lp-gradient-text">Quality</span>
          </h2>
          <p className="lp-subheading">
            Every batch is tested against rigorous quality parameters
            to ensure your products are protected at every step.
          </p>
        </div>

        {/* Gauges grid */}
        <div className="lp-gauges-grid">
          {gauges.map((gauge, index) => (
            <div
              key={gauge.label}
              className={`lp-gauge-card lp-reveal lp-reveal-delay-${index + 1} ${isVisible ? 'visible' : ''}`}
            >
              <GaugeRing
                value={gauge.value}
                max={gauge.max}
                unit={gauge.unit}
                isVisible={isVisible}
                delay={index * 200}
              />
              <div className="lp-gauge-label">{gauge.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}