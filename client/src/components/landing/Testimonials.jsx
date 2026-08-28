import React, { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useScrollReveal } from './hooks/useScrollReveal';

/**
 * Testimonials — Glass card slider with customer reviews.
 * Auto-scrolling with dot navigation and scroll-snap alignment.
 * Uses realistic placeholder testimonials (can be swapped later).
 */

const testimonials = [
  {
    quote: 'SRI VARI PACKS transformed our shipping operations. Their custom-sized boxes reduced our material waste by 35% and improved product protection significantly.',
    name: 'Rajesh Kumar',
    role: 'Supply Chain Manager',
    company: 'TechVision Electronics',
    initials: 'RK',
    rating: 5,
  },
  {
    quote: 'The quality of their 7-ply heavy duty boxes is exceptional. We ship automotive parts internationally and have had zero damage claims since switching to SRI VARI PACKS.',
    name: 'Priya Sharma',
    role: 'Operations Director',
    company: 'AutoParts Global',
    initials: 'PS',
    rating: 5,
  },
  {
    quote: 'Incredibly responsive team with fast turnaround. They custom-designed printed packaging for our new product line and delivered ahead of schedule.',
    name: 'Anand Patel',
    role: 'Product Manager',
    company: 'FreshFarm Organics',
    initials: 'AP',
    rating: 5,
  },
  {
    quote: 'We switched to SRI VARI PACKS for our e-commerce packaging needs. Their lightweight yet durable boxes have reduced our shipping costs by 20%. Highly recommended.',
    name: 'Meera Sundaram',
    role: 'Logistics Head',
    company: 'QuickCart Online',
    initials: 'MS',
    rating: 4,
  },
  {
    quote: 'Their attention to detail is remarkable. The burst factor and GSM specifications are always spot-on. A truly reliable manufacturing partner.',
    name: 'Vijay Reddy',
    role: 'Procurement Officer',
    company: 'PharmaLife Solutions',
    initials: 'VR',
    rating: 5,
  },
];

export default function Testimonials() {
  const [sectionRef, isVisible] = useScrollReveal({ threshold: 0.1 });
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Scroll the track horizontally to the active card (NOT scrollIntoView, which moves the whole page)
  useEffect(() => {
    if (trackRef.current) {
      const card = trackRef.current.children[activeIndex];
      if (card) {
        const trackRect = trackRef.current.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const scrollLeft = trackRef.current.scrollLeft + (cardRect.left - trackRect.left) - (trackRect.width / 2 - cardRect.width / 2);
        trackRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  // Handle scroll-snap position detection
  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft } = trackRef.current;
    const cardWidth = trackRef.current.children[0]?.offsetWidth || 400;
    const gap = 24;
    const newIndex = Math.round(scrollLeft / (cardWidth + gap));
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < testimonials.length) {
      setActiveIndex(newIndex);
    }
  };

  return (
    <section className="lp-section" id="testimonials" ref={sectionRef}>
      <div className="lp-container">
        {/* Section header */}
        <div className={`lp-section-header lp-reveal ${isVisible ? 'visible' : ''}`}>
          <span className="lp-label">Testimonials</span>
          <h2 className="lp-heading">
            Loved by <span className="lp-gradient-text">Businesses</span>
          </h2>
          <p className="lp-subheading">
            See what our clients say about partnering with SRI VARI PACKS.
          </p>
        </div>

        {/* Slider track */}
        <div
          className={`lp-testimonials-track lp-reveal lp-reveal-delay-2 ${isVisible ? 'visible' : ''}`}
          ref={trackRef}
          onScroll={handleScroll}
        >
          {testimonials.map((t, index) => (
            <div key={index} className="lp-testimonial-card">
              {/* Stars */}
              <div className="lp-testimonial-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i < t.rating ? '#f59e0b' : 'transparent'}
                    strokeWidth={i < t.rating ? 0 : 1.5}
                    style={{ color: i < t.rating ? '#f59e0b' : 'var(--lp-text-muted)' }}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="lp-testimonial-quote">"{t.quote}"</p>

              {/* Author */}
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar">{t.initials}</div>
                <div>
                  <div className="lp-testimonial-name">{t.name}</div>
                  <div className="lp-testimonial-role">
                    {t.role} • {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots navigation */}
        <div className="lp-testimonials-dots">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={`lp-testimonials-dot ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
