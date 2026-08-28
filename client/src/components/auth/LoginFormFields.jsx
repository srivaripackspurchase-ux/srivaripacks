import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, LogIn, Shield } from 'lucide-react';

export default function LoginFormFields({
  activeTab,
  username,
  setUsername,
  password,
  setPassword,
  onSubmit,
  loading
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isAdmin = activeTab === 'admin';

  return (
    <form onSubmit={onSubmit} className="svp-form-fields-wrapper animate-form-fade">
      {/* Username Field */}
      <div className="svp-field-group">
        <label className="svp-field-label" htmlFor="auth-username">
          {isAdmin ? 'Admin Username' : 'Username'}
        </label>
        <div className="svp-input-control">
          {isAdmin ? (
            <Shield size={18} className="svp-field-icon" />
          ) : (
            <User size={18} className="svp-field-icon" />
          )}
          <input
            type="text"
            id="auth-username"
            placeholder={isAdmin ? 'Enter your admin username' : 'Enter your username'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="svp-text-input"
            autoComplete="username"
            required
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="svp-field-group">
        <label className="svp-field-label" htmlFor="auth-password">
          Password
        </label>
        <div className="svp-input-control">
          <Lock size={18} className="svp-field-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            id="auth-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="svp-text-input"
            style={{ paddingRight: '46px' }}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="svp-password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Full-Width Gradient Login Button */}
      <button
        type="submit"
        disabled={loading}
        className={`svp-login-submit-btn ${isAdmin ? 'admin-gradient' : 'user-gradient'}`}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="svp-spinner" />
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <LogIn size={18} />
            <span>{isAdmin ? 'Sign In to Admin Portal' : 'Login'}</span>
          </>
        )}
      </button>
    </form>
  );
}
