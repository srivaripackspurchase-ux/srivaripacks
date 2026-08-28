import React from 'react';
import { ShieldCheck, Lock, Loader2, Shield } from 'lucide-react';
import LoginInput from './LoginInput';

export default function AdminLoginForm({ 
  username, 
  setUsername, 
  password, 
  setPassword, 
  onSubmit, 
  loading 
}) {
  return (
    <form onSubmit={onSubmit} className="svp-auth-form animate-fade-in">
      <LoginInput 
        id="admin-username"
        label="Admin Username"
        type="text"
        placeholder="Enter your admin username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        icon={ShieldCheck}
        autoComplete="username"
      />

      <LoginInput 
        id="admin-password"
        label="Admin Password"
        type="password"
        placeholder="Enter your admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={Lock}
        autoComplete="current-password"
      />

      <button 
        type="submit" 
        disabled={loading}
        className="svp-submit-btn svp-admin-btn"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Authenticating Admin...</span>
          </>
        ) : (
          <>
            <Shield size={18} />
            <span>Sign In as Admin</span>
          </>
        )}
      </button>
    </form>
  );
}
