import React from 'react';

// Landing page scoped stylesheet
import '../landing.css';

// Landing page components
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import TrustSection from '../components/landing/TrustSection';
import ProductShowcase from '../components/landing/ProductShowcase';
import ManufacturingSection from '../components/landing/ManufacturingSection';
import IndustriesSection from '../components/landing/IndustriesSection';
import AboutFacilitySection from '../components/landing/AboutFacilitySection';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';

/**
 * Landing — Premium Public Marketing Website for SRI VARI PACKS.
 * 
 * Features:
 * - Real photographic imagery (corrugated manufacturing, kraft paper, precision machinery)
 * - Exact company branding: SRI VARI PACKS
 * - Editorial industrial design, high impact typography, restrained deep dark slate color palette
 * - Complete responsiveness across Desktop, Tablet, and Mobile
 * - Fully isolated from internal calculation components / APIs / logic.
 */
export default function Landing() {
  return (
    <div className="landing-page">
      {/* Floating navigation header */}
      <LandingNavbar />

      {/* Main marketing content sections */}
      <main className="lp-main-content">
        {/* 1. High Impact Photographic Hero */}
        <HeroSection />

        {/* 2. Editorial Trust & Verification Metrics */}
        <TrustSection />

        {/* 3. Detailed Product Showcases */}
        <ProductShowcase />

        {/* 4. Factory Manufacturing Sequence */}
        <ManufacturingSection />

        {/* 5. Industries Served */}
        <IndustriesSection />

        {/* 6. Authentic About & Facility Presentation */}
        <AboutFacilitySection />

        {/* 7. High Impact Call to Action */}
        <CTASection />
      </main>

      {/* 8. Refined Footer */}
      <LandingFooter />
    </div>
  );
}
