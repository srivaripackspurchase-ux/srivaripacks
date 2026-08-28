import React from 'react';
import { Box, User, ShieldCheck } from 'lucide-react';
import LoginTypeSelector from './LoginTypeSelector';
import LoginFormFields from './LoginFormFields';

export default function LoginCard({
  activeTab,
  onSelectTab,
  username,
  setUsername,
  password,
  setPassword,
  error,
  loading,
  onSubmit
}) {
  const isAdmin = activeTab === 'admin';

  return (
    <div className="svp-login-card-column">
      <div className="svp-glass-login-card">
        
        {/* Top Brand Tag */}
        <div className="svp-card-brand-badge" style={{ padding: '8px 20px', gap: '10px' }}>
          <img 
            src="/Logos.png" 
            alt="SRI VARI PACKS Logo" 
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
          />
          <span>SRI VARI PACKS</span>
        </div>

        {/* Card Header Title */}
        <div className="svp-card-header">
          <h2 className="svp-card-title">Welcome Back</h2>
          <p className="svp-card-subtitle">
            Sign in to continue to your workspace
          </p>
        </div>

        {/* User / Admin Segmented Control Tab Switcher */}
        <LoginTypeSelector 
          activeTab={activeTab} 
          onSelectTab={onSelectTab} 
        />

        {/* Dynamic Form Header View */}
        <div className="svp-form-state-header">
          <div className="svp-state-title-row">
            {isAdmin ? (
              <ShieldCheck size={20} className="svp-state-icon admin" />
            ) : (
              <User size={20} className="svp-state-icon user" />
            )}
            <h3>{isAdmin ? 'Admin Login' : 'User Login'}</h3>
          </div>
          <p className="svp-state-desc">
            {isAdmin 
              ? 'Sign in to access the administration panel' 
              : 'Sign in to access your account'}
          </p>
        </div>

        {/* Error Notice Box */}
        {error && (
          <div className="svp-card-error-notice animate-shake" role="alert">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form Fields */}
        <LoginFormFields 
          activeTab={activeTab}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          onSubmit={onSubmit}
          loading={loading}
        />

      </div>
    </div>
  );
}
