import React from 'react';

export default function AnimatedBackground() {
  return (
    <div className="svp-animated-bg-root" aria-hidden="true">
      {/* Soft Studio Quality Lighting Gradient Background */}
      <div className="studio-light-environment" />

      {/* 3D Perspective Stage for Folding & Unfolding Cardboard Sheets */}
      <div className="cardboard-3d-stage">
        {/* Cardboard Sheet 1: Large Central Folding Hexagonal / Diamond Structure */}
        <div className="kraft-sheet sheet-1">
          <div className="fold-panel panel-left" />
          <div className="fold-panel panel-right" />
          <div className="fold-panel panel-top" />
          <div className="fold-panel panel-bottom" />
        </div>

        {/* Cardboard Sheet 2: Floating Light-Kraft Geometric Triangular Wing (Top Right) */}
        <div className="kraft-sheet sheet-2">
          <div className="fold-panel panel-main" />
          <div className="fold-panel panel-flap" />
        </div>

        {/* Cardboard Sheet 3: White Premium Cardboard Folding Pyramid (Bottom Left) */}
        <div className="white-cardboard-sheet sheet-3">
          <div className="fold-panel white-panel-a" />
          <div className="fold-panel white-panel-b" />
          <div className="fold-panel white-panel-c" />
        </div>

        {/* Cardboard Sheet 4: Unfolding Corrugated Box Blank Structure (Center-Left) */}
        <div className="kraft-sheet sheet-4">
          <div className="flute-lines" />
          <div className="fold-panel flap-1" />
          <div className="fold-panel flap-2" />
          <div className="fold-panel flap-3" />
        </div>

        {/* Cardboard Sheet 5: Floating Pure White Folding Polygonal Plate (Top Left) */}
        <div className="white-cardboard-sheet sheet-5">
          <div className="fold-panel white-wing-1" />
          <div className="fold-panel white-wing-2" />
        </div>

        {/* Cardboard Sheet 6: Kraft Ribbed Origami Facet (Bottom Right) */}
        <div className="kraft-sheet sheet-6">
          <div className="fold-panel kraft-facet-a" />
          <div className="fold-panel kraft-facet-b" />
        </div>
      </div>

      {/* Ambient Floating Gold Dust Particles */}
      <div className="gold-dust-particles">
        <div className="gold-particle p1" />
        <div className="gold-particle p2" />
        <div className="gold-particle p3" />
        <div className="gold-particle p4" />
        <div className="gold-particle p5" />
        <div className="gold-particle p6" />
        <div className="gold-particle p7" />
        <div className="gold-particle p8" />
      </div>

      {/* Subtle Studio Backdrop Grid */}
      <div className="studio-backdrop-grid" />
    </div>
  );
}
