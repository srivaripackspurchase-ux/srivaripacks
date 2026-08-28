import { useEffect, useState } from 'react';

/**
 * Tracks mouse position relative to the window.
 * Returns normalized x/y values (-1 to 1) for parallax effects.
 * Throttled to avoid excessive re-renders.
 */
export function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let rafId = null;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e) => {
      lastX = (e.clientX / window.innerWidth) * 2 - 1;
      lastY = (e.clientY / window.innerHeight) * 2 - 1;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          setPosition({ x: lastX, y: lastY });
          rafId = null;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return position;
}