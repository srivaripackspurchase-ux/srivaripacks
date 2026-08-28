import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 up to a target value when triggered.
 * Returns the current animated value.
 *
 * @param {number} target - The target number to count up to
 * @param {boolean} shouldStart - Whether the animation should begin
 * @param {number} duration - Animation duration in milliseconds
 */
export function useCountUp(target, shouldStart, duration = 2000) {
  const [value, setValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!shouldStart) return;

    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for a natural deceleration feel
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (target - startValue) * easedProgress);

      setValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, shouldStart, duration]);

  return value;
}
