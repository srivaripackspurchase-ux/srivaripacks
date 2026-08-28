import React from 'react';
import { useScrollReveal } from './hooks/useScrollReveal';
import { useCountUp } from './hooks/useCountUp';

/**
 * StatsSection — Premium animated counters that count up when visible.
 * Displays: Years Experience, Clients, Boxes Manufactured, Quality %.
 */

const stats = [
  { target: 30, suffix: '+', label: 'Years Experience', icon: '🏭' },
  { target: 500, suffix: '+', label: 'Happy Clients', icon: '🤝' },
  { target: 2, suffix: 'M+', label: 'Boxes Manufactured', icon: '📦' },
  { target: 99, suffix: '%', label: 'Quality Assurance', icon: '✅' },
];

function StatCard({ stat, isVisible, delay }) {
  const count = useCountUp(stat.target, isVisible, 2000);

  return (
    <div className={`lp-stat-card lp-reveal lp-reveal-delay-${delay} ${isVisible ? 'visible' : ''}`}>
      <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>{stat.icon}</div>
      <div className="lp-stat-value lp-gradient-text">
        {count}{stat.suffix}
      </div>
      <div className="lp-stat-label">{stat.label}</div>
    </div>
  );
}

export default function StatsSection() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="lp-section" id="stats" ref={sectionRef}>
      <div className="lp-container">
        <div className="lp-stats-grid">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              stat={stat}
              isVisible={isVisible}
              delay={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
