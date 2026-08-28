import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Menu, X, Sun, Moon, LogIn, Box, ChevronRight } from 'lucide-react';

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className={`lp-navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Brand Logo & Name */}
        <div className="lp-navbar-brand" onClick={() => scrollToSection('hero')}>
          <img 
            src="/Logos.png" 
            alt="SRI VARI PACKS Logo" 
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }} 
          />
          <span className="lp-brand-title">SRI VARI PACKS</span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="lp-nav-links-wrapper">
          <ul className="lp-nav-links">
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('hero')}>
                Home
              </button>
            </li>
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('products')}>
                Products
              </button>
            </li>
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('manufacturing')}>
                Manufacturing
              </button>
            </li>
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('industries')}>
                Industries
              </button>
            </li>
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('about')}>
                About
              </button>
            </li>
            <li>
              <button type="button" className="lp-nav-link" onClick={() => scrollToSection('contact')}>
                Contact
              </button>
            </li>
          </ul>
        </nav>

        {/* Right Header Actions */}
        <div className="lp-navbar-actions">
          {/* Dark / Light Mode Toggle */}
          <button 
            type="button" 
            className="lp-icon-btn lp-theme-toggle-btn" 
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Login Button */}
          <button 
            type="button" 
            className="lp-btn lp-btn-primary lp-login-nav-btn" 
            onClick={() => navigate('/login')}
          >
            <LogIn size={15} />
            <span>Login to Portal</span>
          </button>

          {/* Mobile Menu Trigger */}
          <button 
            type="button" 
            className="lp-mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop & Drawer Menu */}
      <div 
        className={`lp-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)} 
      />

      <aside className={`lp-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="lp-mobile-drawer-header">
          <div className="lp-navbar-brand">
            <img 
              src="/Logos.png" 
              alt="SRI VARI PACKS Logo" 
              style={{ height: '44px', width: 'auto', objectFit: 'contain' }} 
            />
            <span className="lp-brand-title">SRI VARI PACKS</span>
          </div>
          <button 
            type="button" 
            className="lp-mobile-menu-close" 
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="lp-mobile-drawer-body">
          {/* Mobile Theme Toggle Row */}
          <div className="lp-mobile-theme-row">
            <span className="lp-theme-row-label">Theme Mode</span>
            <button 
              type="button" 
              className="lp-mobile-theme-switch-btn" 
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('hero')}>
            <span>Home</span>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('products')}>
            <span>Products</span>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('manufacturing')}>
            <span>Manufacturing</span>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('industries')}>
            <span>Industries</span>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('about')}>
            <span>About</span>
            <ChevronRight size={16} />
          </button>
          <button type="button" className="lp-mobile-nav-link" onClick={() => scrollToSection('contact')}>
            <span>Contact</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="lp-mobile-drawer-footer">
          <button 
            type="button" 
            className="lp-btn lp-btn-primary" 
            style={{ width: '100%' }}
            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
          >
            <LogIn size={16} />
            <span>Login to Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
}
