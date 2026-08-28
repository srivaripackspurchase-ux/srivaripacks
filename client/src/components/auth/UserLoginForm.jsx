import React from 'react';
import { User, Lock, Loader2, LogIn } from 'lucide-react';
import LoginInput from './LoginInput';

export default function UserLoginForm({ 
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
        id="user-username"
        label="Username"
        type="text"
        placeholder="Enter your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        icon={User}
        autoComplete="username"
      />

      <LoginInput 
        id="user-password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        icon={Lock}
        autoComplete="current-password"
      />

      <button 
        type="submit" 
        disabled={loading}
        className="svp-submit-btn"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Authenticating User...</span>
          </>
        ) : (
          <>
            <LogIn size={18} />
            <span>Sign In to Console</span>
          </>
        )}
      </button>
    </form>
  );
}
