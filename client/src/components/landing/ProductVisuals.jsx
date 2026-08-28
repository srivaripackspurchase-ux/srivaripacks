import React from 'react';

/**
 * ProductVisuals.jsx — Precision Technical Structural Diagrams for SRI VARI PACKS.
 * 
 * Provides crisp, clean CAD-style vector renders for each of the 9 corrugated packaging types.
 */

export default function ProductVisual({ calcType, className = '' }) {
  switch (calcType) {
    case 'box': // Standard Box (RSC)
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Main Box Body */}
          <path d="M100 120 L200 70 L300 120 L200 170 Z" fill="#d97706" opacity="0.85" stroke="#f59e0b" strokeWidth="2" />
          <path d="M100 120 L200 170 L200 240 L100 190 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 170 L300 120 L300 190 L200 240 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Top Flaps Meeting at Center */}
          <path d="M100 120 L150 95 L200 120 L150 145 Z" fill="#fbbf24" opacity="0.9" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M300 120 L250 95 L200 120 L250 145 Z" fill="#f59e0b" opacity="0.9" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
          <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Standard RSC Outer Flaps Meeting at Center</text>
        </svg>
      );

    case 'pad': // Flat Pad
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Flat Pad Stack */}
          <path d="M80 140 L200 80 L320 140 L200 200 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M80 140 L200 200 L200 215 L80 155 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 200 L320 140 L320 155 L200 215 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Flute Detail Lines */}
          <path d="M90 145 L195 198" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M110 135 L215 188" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
          <text x="200" y="260" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Flat Corrugated Layer Pad Sheet</text>
        </svg>
      );

    case 'partition': // Partition Grid
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Outer Box Frame */}
          <path d="M90 100 L200 50 L310 100 L310 220 L200 270 L90 220 Z" stroke="#475569" strokeWidth="2" fill="none" strokeDasharray="4 4" />
          {/* Interlocking Grid Lines */}
          <path d="M145 125 L255 75 L255 195 L145 245 Z" fill="#d97706" opacity="0.75" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M175 140 L285 90 L285 210 L175 260 Z" fill="#b45309" opacity="0.75" stroke="#f59e0b" strokeWidth="1.5" />
          <path d="M130 78 L130 198 L240 248 L240 128 Z" fill="#f59e0b" opacity="0.6" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M170 60 L170 180 L280 230 L280 110 Z" fill="#f59e0b" opacity="0.6" stroke="#ffffff" strokeWidth="1.5" />
          <text x="200" y="285" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Interlocking Cell Divider Matrix</text>
        </svg>
      );

    case 'tray': // Corrugated Tray
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Tray Bottom & Low Side Walls */}
          <path d="M90 140 L200 85 L310 140 L200 195 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M90 140 L200 195 L200 230 L90 175 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 195 L310 140 L310 175 L200 230 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Front Corner Rolled Lips */}
          <path d="M90 140 L90 175 M200 195 L200 230 M310 140 L310 175" stroke="#ffffff" strokeWidth="2" />
          <text x="200" y="265" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Open-Top Shallow Corrugated Tray</text>
        </svg>
      );

    case 'sleave': // Sleeve Enclosure
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Open Tube Sleeve */}
          <path d="M120 90 L220 40 L300 80 L200 130 Z" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M120 90 L200 130 L200 230 L120 190 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 130 L300 80 L300 180 L200 230 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M120 90 L220 40 L220 140 L120 190 Z" fill="#78350f" opacity="0.5" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="200" y="265" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">4-Sided Open Wrap-Around Sleeve</text>
        </svg>
      );

    case 'coller_box': // Collar Box
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Heavy Duty Collar Rim */}
          <path d="M80 110 L200 50 L320 110 L200 170 Z" fill="none" stroke="#f59e0b" strokeWidth="3" />
          <path d="M80 110 L200 170 L200 240 L80 180 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 170 L320 110 L320 180 L200 240 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          {/* Reinforced Wall Ribs */}
          <line x1="140" y1="140" x2="140" y2="210" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
          <line x1="260" y1="140" x2="260" y2="210" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
          <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Reinforced Vertical Wall Collar Container</text>
        </svg>
      );

    case 'top_side_tray_box': // Top Side Tray Box
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Deep Tray Body */}
          <path d="M90 120 L200 65 L310 120 L200 175 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M90 120 L200 175 L200 240 L90 185 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 175 L310 120 L310 185 L200 240 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Top Flanged Side Lips */}
          <path d="M90 120 L65 108 L175 53 L200 65 Z" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M310 120 L335 108 L225 53 L200 65 Z" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Top-Side Flanged Tray Container</text>
        </svg>
      );

    case 'universal_type': // Universal Type
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Universal Multi-Score Box */}
          <path d="M90 110 L200 55 L310 110 L200 165 Z" fill="#d97706" opacity="0.8" stroke="#f59e0b" strokeWidth="2" />
          <path d="M90 110 L200 165 L200 235 L90 180 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 165 L310 110 L310 180 L200 235 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Crease Lines */}
          <line x1="90" y1="135" x2="200" y2="190" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="200" y1="190" x2="310" y2="135" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
          <text x="200" y="265" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Multi-Utility Universal Slotted Container</text>
        </svg>
      );

    case 'full_closing_box': // Full Closing Box
      return (
        <svg className={`lp-product-svg ${className}`} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" rx="16" fill="#121422" />
          {/* Box Body */}
          <path d="M90 130 L200 75 L310 130 L200 185 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
          <path d="M90 130 L200 185 L200 245 L90 190 Z" fill="#d97706" stroke="#f59e0b" strokeWidth="2" />
          <path d="M200 185 L310 130 L310 190 L200 245 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="2" />
          {/* Overlapping Full Flaps */}
          <path d="M90 130 L200 75 L310 130 L200 185 Z" fill="#f59e0b" opacity="0.9" stroke="#ffffff" strokeWidth="2" />
          <path d="M310 130 L200 75 L90 130 L200 185 Z" fill="#fbbf24" opacity="0.5" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="200" y="270" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600">Full Overlapping Top & Bottom Flaps</text>
        </svg>
      );

    default:
      return null;
  }
}
