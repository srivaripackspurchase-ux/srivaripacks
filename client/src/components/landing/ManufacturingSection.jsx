import React, { useState } from 'react';
import { ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';
import { VERIFIED_MANUFACTURING_STAGES, FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

export default function ManufacturingSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = VERIFIED_MANUFACTURING_STAGES;
  const totalStepsStr = String(steps.length).padStart(2, '0');

  return (
    <section id="manufacturing" className="lp-manufacturing-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <span className="lp-section-tag">FACTORY PROCESS</span>
          <h2 className="lp-section-title">
            State-of-the-Art Corrugated Manufacturing
          </h2>
          <p className="lp-section-desc">
            Take a visual walk through the <strong>SRI VARI PACKS</strong> automated production floor from customer order & design to final storage & delivery.
          </p>
        </div>

        {/* Process Step Navigation Bar */}
        <div className="lp-manufacturing-stepper">
          {steps.map((step, idx) => (
            <button
              key={idx}
              type="button"
              className={`lp-stepper-btn ${activeStep === idx ? 'active' : ''}`}
              onClick={() => setActiveStep(idx)}
            >
              <span className="lp-step-num">{step.num}</span>
              <span className="lp-step-name">{step.shortTitle || step.title}</span>
            </button>
          ))}
        </div>

        {/* Featured Process Step Card */}
        <div className="lp-manufacturing-card">
          <div className="lp-manufacturing-visual">
            <img 
              src={steps[activeStep].image} 
              alt={steps[activeStep].title}
              className="lp-manufacturing-img"
              loading="lazy"
              width="1000"
              height="650"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = FALLBACK_PACKAGING_IMAGE;
              }}
            />
            <div className="lp-manufacturing-num-badge">
              <span>STEP {steps[activeStep].num} / {totalStepsStr}</span>
            </div>
          </div>

          <div className="lp-manufacturing-info">
            <span className="lp-info-tag">STAGE {steps[activeStep].num} OF MANUFACTURING</span>
            <h3 className="lp-info-title">{steps[activeStep].title}</h3>
            <p className="lp-info-desc">{steps[activeStep].desc}</p>

            <div className="lp-info-spec-badge">
              <CheckCircle size={16} color="#10b981" />
              <span>Standard: {steps[activeStep].spec}</span>
            </div>

            <div className="lp-info-controls">
              <button 
                type="button" 
                className="lp-btn lp-btn-secondary"
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
              >
                Previous Step
              </button>

              <button 
                type="button" 
                className="lp-btn lp-btn-primary"
                onClick={() => {
                  if (activeStep < steps.length - 1) {
                    setActiveStep(prev => prev + 1);
                  } else {
                    setActiveStep(0);
                  }
                }}
              >
                <span>{activeStep < steps.length - 1 ? 'Next Process Stage' : 'Restart Tour'}</span>
                {activeStep < steps.length - 1 ? <ArrowRight size={16} /> : <RotateCcw size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Vertical Storytelling Sequence */}
        <div className="lp-mobile-manufacturing-list">
          {steps.map((step, idx) => (
            <div key={idx} className="lp-mobile-step-card">
              <div className="lp-mobile-step-thumb">
                <img 
                  src={step.image} 
                  alt={step.title} 
                  loading="lazy" 
                  width="400" 
                  height="260" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_PACKAGING_IMAGE;
                  }}
                />
                <span className="lp-mobile-step-num">{step.num}</span>
              </div>
              <div className="lp-mobile-step-body">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                <div className="lp-mobile-spec-tag">✓ {step.spec}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
