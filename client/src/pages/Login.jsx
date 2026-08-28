import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeft } from 'lucide-react';

import LoginCard from '../components/auth/LoginCard';
import bgFactoryImage from '../loginbackground.png';

import { executeUserLogin } from '../services/userAuth';
import { executeAdminLogin } from '../services/adminAuth';

export default function Login() {
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'
  
  // Independent input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, adminLogin } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      const msg = 'Please enter both username and password.';
      setError(msg);
      showToast(msg, 'warning');
      return;
    }

    setError('');
    setSubmitting(true);

    if (activeTab === 'admin') {
      try {
        const result = await executeAdminLogin(adminLogin, username, password);
        setSubmitting(false);
        if (result.success) {
          showToast('Signed in successfully as Administrator!', 'success');
          navigate('/user-access');
        } else {
          const errMsg = result.error || 'Invalid admin credentials.';
          setError(errMsg);
          showToast(errMsg, 'error');
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message);
        showToast(err.message, 'error');
      }
    } else {
      try {
        const result = await executeUserLogin(login, username, password);
        setSubmitting(false);
        if (result.success) {
          showToast('Signed in successfully! Welcome back!', 'success');
          navigate('/dashboard');
        } else {
          const errMsg = result.error || 'Invalid credentials.';
          setError(errMsg);
          showToast(errMsg, 'error');
        }
      } catch (err) {
        setSubmitting(false);
        setError(err.message);
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="svp-auth-centered-root">
      {/* Responsive Full-Screen 8K Factory Background & Glassmorphic Login Card Stylesheet */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* FULL-SCREEN EDGE-TO-EDGE FACTORY BACKGROUND CONTAINER */
        .svp-auth-centered-root {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 40px 20px;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          box-sizing: border-box;

          /* Edge-to-Edge Responsive Factory Image Background with Ambient Dark Gradient Overlay */
          background-image: 
            linear-gradient(180deg, rgba(15, 23, 42, 0.42) 0%, rgba(15, 23, 42, 0.52) 100%),
            url(${bgFactoryImage});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        /* Top Back Navigation Pill */
        .svp-top-back-link {
          position: absolute;
          top: 24px;
          left: 24px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          color: #0f172a;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 35;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .svp-top-back-link:hover {
          color: #d97706;
          background: #ffffff;
          border-color: rgba(217, 119, 6, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
        }

        /* Ambient Glow Halo Behind Centered Card */
        .svp-centered-card-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 580px;
          height: 580px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.35) 0%, rgba(180, 83, 9, 0.12) 45%, rgba(15, 23, 42, 0) 70%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 5;
        }

        /* CENTERED GLASSMORPHISM LOGIN CARD WRAPPER */
        .svp-centered-card-wrapper {
          position: relative;
          z-index: 20;
          width: 100%;
          max-width: 470px;
          display: flex;
          justify-content: center;
          animation: svpCardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes svpCardEntrance {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .svp-login-card-column {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* High-Legibility Glassmorphic Card Surface */
        .svp-glass-login-card {
          width: 100%;
          max-width: 470px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.95);
          border-radius: 32px;
          padding: 46px 40px;
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.35),
            0 8px 24px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }

        .svp-glass-login-card:hover {
          box-shadow: 0 40px 96px rgba(0, 0, 0, 0.45);
        }

        .svp-card-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 18px;
          border-radius: 9999px;
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.25);
          color: #d97706;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .svp-card-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .svp-card-title {
          font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .svp-card-subtitle {
          font-size: 0.95rem;
          color: #64748b;
        }

        /* Segmented Control Tab Switcher */
        .svp-segmented-control {
          position: relative;
          display: flex;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 16px;
          margin-bottom: 24px;
          border: 1px solid rgba(15, 23, 42, 0.06);
        }

        .svp-segmented-indicator {
          position: absolute;
          top: 6px;
          bottom: 6px;
          width: calc(50% - 6px);
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .svp-segmented-indicator.is-user {
          transform: translateX(0);
        }

        .svp-segmented-indicator.is-admin {
          transform: translateX(100%);
        }

        .svp-segmented-btn {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.25s ease;
        }

        .svp-segmented-btn.active {
          color: #d97706;
        }

        .svp-tab-icon {
          transition: transform 0.25s ease;
        }

        .svp-segmented-btn:hover .svp-tab-icon {
          transform: scale(1.1);
        }

        .svp-form-state-header {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          text-align: center;
        }

        .svp-state-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .svp-state-title-row h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
        }

        .svp-state-icon.user {
          color: #d97706;
        }

        .svp-state-icon.admin {
          color: #c2410c;
        }

        .svp-state-desc {
          font-size: 0.85rem;
          color: #64748b;
        }

        /* Error Notice Alert */
        .svp-card-error-notice {
          padding: 12px 16px;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 0.88rem;
          font-weight: 500;
          margin-bottom: 20px;
          text-align: center;
        }

        .animate-shake {
          animation: svpShake 0.35s ease-in-out;
        }

        @keyframes svpShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        /* Form Inputs & Controls */
        .svp-form-fields-wrapper {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .animate-form-fade {
          animation: svpFormFade 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes svpFormFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .svp-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .svp-field-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .svp-input-control {
          position: relative;
          display: flex;
          align-items: center;
        }

        .svp-field-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          pointer-events: none;
          transition: color 0.25s ease;
        }

        .svp-text-input {
          width: 100%;
          padding: 13px 16px 13px 46px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          font-size: 0.95rem;
          color: #0f172a;
          transition: all 0.25s ease;
          outline: none;
        }

        .svp-text-input:hover {
          border-color: #cbd5e1;
          background: #ffffff;
        }

        .svp-text-input:focus {
          background: #ffffff;
          border-color: #d97706;
          box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.18);
        }

        .svp-text-input:focus + .svp-field-icon,
        .svp-input-control:focus-within .svp-field-icon {
          color: #d97706;
        }

        .svp-password-toggle-btn {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }

        .svp-password-toggle-btn:hover {
          color: #475569;
        }

        /* Full-Width Gradient Action Button */
        .svp-login-submit-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px 24px;
          border-radius: 14px;
          color: #ffffff;
          border: none;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 6px;
        }

        .svp-login-submit-btn.user-gradient {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.38);
        }

        .svp-login-submit-btn.admin-gradient {
          background: linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%);
          box-shadow: 0 8px 24px rgba(194, 65, 12, 0.38);
        }

        .svp-login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(217, 119, 6, 0.48);
        }

        .svp-login-submit-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.99);
        }

        .svp-login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .svp-spinner {
          animation: svpSpin 1s linear infinite;
        }

        @keyframes svpSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* RESPONSIVE MEDIA BREAKPOINTS */
        @media (max-width: 1024px) {
          .svp-auth-centered-root {
            background-position: center center;
            background-size: cover;
          }
        }

        @media (max-width: 640px) {
          .svp-auth-centered-root {
            /* Mobile: Intelligently crop image while keeping factory machinery & packing boxes visible */
            background-position: 65% center;
            background-size: cover;
            padding: 24px 16px;
          }

          .svp-top-back-link {
            top: 16px;
            left: 16px;
            padding: 8px 16px;
            font-size: 0.82rem;
          }

          .svp-glass-login-card {
            padding: 36px 24px;
            border-radius: 26px;
          }

          .svp-card-title {
            font-size: 1.85rem;
          }
        }
      `}</style>

      {/* Navigation Return Pill */}
      <button 
        type="button" 
        onClick={() => navigate('/')} 
        className="svp-top-back-link"
        aria-label="Return to homepage"
      >
        <ArrowLeft size={16} />
        <span>Back to Site</span>
      </button>

      {/* Radial Glow Halo Behind Centered Card */}
      <div className="svp-centered-card-glow" aria-hidden="true" />

      {/* Perfectly Centered Login Card */}
      <div className="svp-centered-card-wrapper">
        <LoginCard 
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          error={error}
          loading={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
