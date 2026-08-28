import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Send, Box, Phone, Mail, User, Building } from 'lucide-react';

export default function QuoteModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      setSubmitted(false);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="lp-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button 
          type="button" 
          className="lp-modal-close" 
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="lp-modal-success">
            <div className="lp-modal-success-icon">
              <CheckCircle2 size={48} color="#10b981" />
            </div>
            <h3 className="lp-modal-title">Quote Request Received!</h3>
            <p className="lp-modal-desc">
              Thank you, <strong>{formData.name}</strong>. Our team at <strong>SRI VARI PACKS</strong> will contact you shortly.
            </p>
            <div className="lp-modal-summary">
              <div><span>Company:</span> <strong>{formData.company || 'Individual'}</strong></div>
              <div><span>Phone:</span> <strong>{formData.phone}</strong></div>
              <div><span>Email:</span> <strong>{formData.email || 'Not Provided'}</strong></div>
            </div>
            <button 
              type="button" 
              className="lp-btn lp-btn-primary" 
              onClick={() => { setSubmitted(false); onClose(); }}
              style={{ width: '100%', marginTop: '20px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lp-modal-form">
            <div className="lp-modal-header">
              <div className="lp-modal-badge">
                <Box size={14} />
                <span>SRI VARI PACKS</span>
              </div>
              <h3 className="lp-modal-title">Request Custom Packaging Quote</h3>
              <p className="lp-modal-desc">
                Get factory-direct pricing for high-compression corrugated boxes engineered to your exact specifications.
              </p>
            </div>

            <div className="lp-form-grid">
              <div className="lp-form-group">
                <label className="lp-form-label">
                  <User size={14} /> Your Full Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Anand Kumar" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="lp-form-input"
                />
              </div>

              <div className="lp-form-group">
                <label className="lp-form-label">
                  <Building size={14} /> Company Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Apex Industries" 
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="lp-form-input"
                />
              </div>

              <div className="lp-form-group">
                <label className="lp-form-label">
                  <Mail size={14} /> Email Address (Optional)
                </label>
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="lp-form-input"
                />
              </div>

              <div className="lp-form-group">
                <label className="lp-form-label">
                  <Phone size={14} /> Phone / WhatsApp *
                </label>
                <input 
                  type="tel" 
                  required
                  placeholder="+91 98765 43210" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="lp-form-input"
                />
              </div>

              <div className="lp-form-group full-width">
                <label className="lp-form-label">Additional Notes or Material Specifications</label>
                <textarea 
                  rows={3}
                  placeholder="Describe your load weight, ply requirements, printing instructions, or delivery timeline..." 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="lp-form-textarea"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="lp-btn lp-btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              {loading ? 'Processing Specification...' : 'Submit Quote Request'}
              <Send size={16} style={{ marginLeft: '8px' }} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
