import React from 'react';
import { Box, CheckCircle, Layers, Shield, Cpu } from 'lucide-react';

export default function PackagingIllustration() {
  return (
    <div className="svp-visual-column">
      {/* Background Animated Gradient Blobs */}
      <div className="svp-bg-blob-1" />
      <div className="svp-bg-blob-2" />

      {/* Main Branded Packaging Showcase Card */}
      <div className="svp-visual-card">
        {/* Animated 3D Cardboard Box Icon Container */}
        <div className="svp-box-icon-container">
          <Box size={48} color="#ffffff" />
        </div>

        <h2 className="svp-brand-heading">SRI VARI PACKS</h2>
        <p className="svp-brand-subtitle">
          Precision Corrugated Packaging & Inventory Management System.
        </p>

        {/* Sophisticated Industrial Feature Cards */}
        <div className="svp-feature-pills">
          <div className="svp-feature-pill">
            <Layers size={20} className="svp-pill-icon" />
            <div className="svp-pill-text">
              <strong>Multi-Wall Corrugation Intelligence</strong>
              <span>Heavy-Duty 3-Ply up to 13-Ply Box Formulations</span>
            </div>
          </div>

          <div className="svp-feature-pill">
            <Cpu size={20} className="svp-pill-icon" />
            <div className="svp-pill-text">
              <strong>CAD & Reel Cut Size Optimization</strong>
              <span>Automated GSM paper calculations & flap allowances</span>
            </div>
          </div>

          <div className="svp-feature-pill">
            <Shield size={20} className="svp-pill-icon" />
            <div className="svp-pill-text">
              <strong>Factory Production & Stock Control</strong>
              <span>Real-time customer billing, inventory, and order tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
