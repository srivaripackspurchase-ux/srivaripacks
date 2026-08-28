import React from 'react';

/**
 * AnimatedBackground — Subtle animated grid, floating gradient orbs,
 * and noise texture overlay that sits behind all landing page content.
 */
export default function AnimatedBackground() {
  return (
    <>
      {/* Subtle noise texture */}
      <div className="lp-noise" aria-hidden="true" />

      {/* Animated gradient orbs + grid pattern */}
      <div className="lp-animated-bg" aria-hidden="true">
        <div className="lp-grid-pattern" />
        <div className="lp-gradient-orb lp-gradient-orb-1" />
        <div className="lp-gradient-orb lp-gradient-orb-2" />
        <div className="lp-gradient-orb lp-gradient-orb-3" />
      </div>
    </>
  );
}
