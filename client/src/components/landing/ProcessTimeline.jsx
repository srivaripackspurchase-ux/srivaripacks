import React from 'react';
import {
  Palette, Layers, Activity, Scissors,
  Printer, Wrench, ShieldCheck, Package, Truck
} from 'lucide-react';
import { useScrollReveal } from './hooks/useScrollReveal';

/**
 * ProcessTimeline — Beautiful horizontal animated timeline showing
 * the manufacturing process from Design to Delivery.
 * Each step animates and lights up on scroll.
 */

const steps = [
  { icon: Palette, label: 'Design' },
  { icon: Layers, label: 'Material Selection' },
  { icon: Activity, label: 'Corrugation' },
  { icon: Scissors, label: 'Precision Cutting' },
  { icon: Printer, label: 'Printing' },
  { icon: Wrench, label: 'Assembly' },
  { icon: ShieldCheck, label: 'Quality Inspection' },
  { icon: Package, label: 'Packaging' },
  { icon: Truck, label: 'Delivery' },
];

export default function ProcessTimeline() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="lp-section lp-section-bg" id="process" ref={sectionRef}>
      <div className="lp-container">
        {/* Section header */}
        <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="lp-label">Our Process</span>
          <h2 className="lp-heading">
            Manufacturing <span className="lp-gradient-text">Excellence</span>
          </h2>
          <p className="lp-subheading">
            Every box goes through a rigorous 9-step process ensuring
            precision, quality, and durability.
          </p>
        </div>

        {/* Timeline */}
        <div className="lp-timeline">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = isVisible;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.label}
                className={`lp-timeline-step ${isActive ? 'active' : ''}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Connector line (not on last step) */}
                {!isLast && (
                  <div className="lp-timeline-connector">
                    <div
                      className="lp-timeline-connector-fill"
                      style={{
                        transitionDelay: `${index * 150 + 200}ms`,
                      }}
                    />
                  </div>
                )}

                {/* Node circle */}
                <div
                  className="lp-timeline-node"
                  style={{
                    transitionDelay: `${index * 150}ms`,
                  }}
                >
                  <Icon size={22} />
                </div>

                {/* Label */}
                <div
                  className="lp-timeline-label"
                  style={{
                    transitionDelay: `${index * 150 + 100}ms`,
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
