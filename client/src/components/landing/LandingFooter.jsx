import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, MapPin, Mail, Phone, LogIn } from 'lucide-react';

export default function LandingFooter() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-grid">
          {/* Brand Column */}
          <div className="lp-footer-brand-col">
            <div className="lp-navbar-brand mb-16" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="/Logos.png" 
                alt="SRI VARI PACKS Logo" 
                style={{ height: '54px', width: 'auto', objectFit: 'contain' }} 
              />
              <span className="lp-brand-title">SRI VARI PACKS</span>
            </div>

            <p className="lp-footer-about-text">
              Precision manufacturer of high-bursting strength corrugated packaging containers, custom die-cut boxes, and heavy-duty multi-wall shipping boxes engineered for modern industrial supply chains.
            </p>

            <div className="lp-footer-location">
              <MapPin size={16} className="lp-footer-icon" />
              <span>8/26, C-2, Sreeram Amman Avenue, Megarali Street, Edayarpalayam, Vellalore, Coimbatore - 641111.</span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">Navigation</h4>
            <ul className="lp-footer-links">
              <li>
                <button type="button" onClick={() => scrollToSection('hero')}>
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Products & Catalog
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('manufacturing')}>
                  Manufacturing Flow
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('industries')}>
                  Industries Served
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('about')}>
                  About Company
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('contact')}>
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Product Categories */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">Products</h4>
            <ul className="lp-footer-links">
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Standard Box
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Pad & Partition Inserts
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Tray & Sleeve Enclosures
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Coller Box & Top Side Tray
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('products')}>
                  Universal Type & Full Closing
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Contact Column */}
          <div className="lp-footer-col">
            <h4 className="lp-footer-col-title">Contact & Inquiries</h4>
            <ul className="lp-footer-contact-list">
              <li>
                <Phone size={16} className="lp-footer-icon" />
                <a href="tel:+917397789656">
                  +91 73977 89656
                </a>
              </li>
              <li>
                <Mail size={16} className="lp-footer-icon" />
                <a href="mailto:srivaripackspurchase@gmail.com">
                  srivaripackspurchase@gmail.com
                </a>
              </li>
              <li className="mt-12">
                <button 
                  type="button" 
                  className="lp-btn lp-btn-primary" 
                  onClick={() => navigate('/login')}
                  style={{ width: '100%' }}
                >
                  <LogIn size={16} />
                  <span>Client Login Portal</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="lp-footer-bottom">
          <p>© 2026 <strong>SRI VARI PACKS</strong>. All rights reserved. Precision Corrugated Packaging Solutions.</p>
          <div className="lp-footer-legal">
            <span>ISO Quality Verified</span>
            <span>•</span>
            <span>100% Recyclable Kraft Board</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
