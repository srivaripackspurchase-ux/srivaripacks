import React, { useState, useEffect } from 'react';
import { Box, Layers, Cpu, ShieldCheck, CheckCircle2, Sparkles, Activity } from 'lucide-react';

export default function BrandSection() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Subtle Mouse Parallax Handler
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const centerX = window.innerWidth / 4;
    const centerY = window.innerHeight / 2;
    const moveX = (clientX - centerX) / 35;
    const moveY = (clientY - centerY) / 35;
    setParallax({ x: moveX, y: moveY });
  };

  const handleMouseLeave = () => {
    setParallax({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div 
      className={`svp-brand-section-col ${isHovered ? 'stage-hovered' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
    >
      {/* Background Animated Corrugated Paper Waves SVG */}
      <svg className="svp-wave-bg-svg" viewBox="0 0 800 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path 
          className="svp-wave-path wave-1" 
          d="M-100,200 C150,300 350,100 600,250 C750,340 850,200 950,300 L950,1000 L-100,1000 Z" 
          fill="url(#waveGrad1)" 
        />
        <path 
          className="svp-wave-path wave-2" 
          d="M-100,450 C200,350 400,550 700,400 C800,350 900,480 1000,420 L1000,1000 L-100,1000 Z" 
          fill="url(#waveGrad2)" 
        />
      </svg>

      {/* Floating Particle Orbs */}
      <div className="svp-particle-field" aria-hidden="true">
        <div className="svp-p-orb p1" style={{ transform: `translate3d(${parallax.x * 1.5}px, ${parallax.y * 1.5}px, 0)` }} />
        <div className="svp-p-orb p2" style={{ transform: `translate3d(${parallax.x * 2}px, ${parallax.y * 2}px, 0)` }} />
        <div className="svp-p-orb p3" style={{ transform: `translate3d(${parallax.x * 1.2}px, ${parallax.y * 1.2}px, 0)` }} />
      </div>

      <div className="svp-brand-content-wrapper">
        
        {/* Top Company Brand Tag (Entrance Animation 1) */}
        <div className="svp-brand-logo-row svp-anim-entry-1">
          <div className="svp-brand-logo-icon">
            <Box size={22} color="#ffffff" />
          </div>
          <span className="svp-brand-logo-text">SRI VARI PACKS</span>
        </div>

        {/* Headline & Subhead (Entrance Animation 2 & 3) */}
        <h1 className="svp-brand-headline svp-anim-entry-2">
          Smart Packaging.<br />
          <span className="svp-headline-gradient">Built for Business.</span>
        </h1>
        
        <p className="svp-brand-subhead svp-anim-entry-3">
          Enterprise corrugated container manufacturing, real-time stock control, and automated CAD flap size valuation system.
        </p>

        {/* CENTRAL STAGE: Multi-Element 3D Corrugated Packaging Composition */}
        <div className="svp-visual-stage svp-anim-entry-4">
          
          {/* Ambient Pulsing Halo Glow Behind Packaging */}
          <div className="svp-ambient-glow-halo" />

          {/* SVG Digital Connection Lines with Traveling Pulse Dots */}
          <svg className="svp-connect-svg" viewBox="0 0 500 320" aria-hidden="true">
            <path className="svp-connect-line line-1" d="M120,70 L250,140" />
            <path className="svp-connect-line line-2" d="M380,80 L280,160" />
            <path className="svp-connect-line line-3" d="M250,230 L370,270" />
            <circle className="svp-pulse-dot dot-1" cx="120" cy="70" r="4" />
            <circle className="svp-pulse-dot dot-2" cx="380" cy="80" r="4" />
            <circle className="svp-pulse-dot dot-3" cx="370" cy="270" r="4" />
          </svg>

          {/* 3D Multi-Box Packaging Composition Container */}
          <div 
            className="svp-3d-scene-container"
            style={{ 
              transform: `translate3d(${parallax.x * 2.8}px, ${parallax.y * 2.8}px, 0) rotateX(${-parallax.y * 0.4}deg) rotateY(${parallax.x * 0.4}deg)` 
            }}
          >
            
            {/* Secondary Element 1: Flat Corrugated Board Sheet (Bottom Layer) */}
            <div className="svp-box-element svp-sheet-layer">
              <div className="svp-sheet-fluting-pattern" />
            </div>

            {/* Secondary Element 2: Open Die-Cut Tray Carton (Left Side) */}
            <div className="svp-box-element svp-tray-carton">
              <div className="svp-tray-inner">
                <Layers size={22} color="#6366f1" />
                <span>Die-Cut Tray</span>
              </div>
            </div>

            {/* MAIN CENTRAL ELEMENT: Large 3D Corrugated Shipping Box */}
            <div className="svp-box-element svp-main-3d-box">
              <div className="svp-main-box-face svp-face-front">
                <div className="svp-box-tape-strip" />
                <div className="svp-box-stamp-badge">
                  <Box size={38} color="#ffffff" />
                  <span>SRI VARI</span>
                </div>
                <div className="svp-flute-chip-row">
                  <span className="svp-flute-tag">3 to 13-Ply</span>
                  <span className="svp-flute-tag active">Heavy Duty</span>
                </div>
              </div>
              <div className="svp-main-box-face svp-face-top" />
              <div className="svp-main-box-face svp-face-side" />
              <div className="svp-box-shadow-ground" />
            </div>

            {/* Secondary Element 3: Folded Flap Box (Right Side) */}
            <div className="svp-box-element svp-flap-box">
              <div className="svp-flap-inner">
                <Sparkles size={18} color="#f59e0b" />
                <span>Custom Order</span>
              </div>
            </div>

          </div>

          {/* FLOATING DIGITAL GLASS UI CARDS (Entrance Animation 5) */}
          
          {/* Floating Card 1: 7-Ply Heavy Duty */}
          <div 
            className="svp-glass-info-card card-top-left svp-anim-entry-5"
            style={{ transform: `translate3d(${parallax.x * 3.8}px, ${parallax.y * 3.8}px, 0)` }}
          >
            <div className="svp-card-icon-pill green">
              <ShieldCheck size={18} />
            </div>
            <div className="svp-card-text-block">
              <strong>7-Ply Heavy Duty</strong>
              <span>High Compression Rating</span>
            </div>
          </div>

          {/* Floating Card 2: B & C Flute Optimization */}
          <div 
            className="svp-glass-info-card card-top-right svp-anim-entry-5"
            style={{ transform: `translate3d(${parallax.x * 4.2}px, ${parallax.y * 4.2}px, 0)` }}
          >
            <div className="svp-card-icon-pill indigo">
              <Layers size={18} />
            </div>
            <div className="svp-card-text-block">
              <strong>B & C Flute Matrix</strong>
              <span>Fluting Structure Match</span>
            </div>
          </div>

          {/* Floating Card 3: CAD Precision Fit */}
          <div 
            className="svp-glass-info-card card-bottom-right svp-anim-entry-5"
            style={{ transform: `translate3d(${parallax.x * 3.5}px, ${parallax.y * 3.5}px, 0)` }}
          >
            <div className="svp-card-icon-pill amber">
              <Cpu size={18} />
            </div>
            <div className="svp-card-text-block">
              <strong>CAD Precision Fit</strong>
              <span>Reel & Flap Calculation</span>
            </div>
          </div>

        </div>

        {/* Industrial Capability Chips (Entrance Animation 6) */}
        <div className="svp-capability-chips-bar svp-anim-entry-6">
          <div className="svp-cap-chip">
            <CheckCircle2 size={16} className="svp-cap-icon" />
            <span>Industrial Packaging</span>
          </div>
          <div className="svp-cap-chip">
            <CheckCircle2 size={16} className="svp-cap-icon" />
            <span>Automated Reel Sizing</span>
          </div>
          <div className="svp-cap-chip">
            <CheckCircle2 size={16} className="svp-cap-icon" />
            <span>Stock & Production Control</span>
          </div>
        </div>

      </div>
    </div>
  );
}
