import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginInput({ 
  id, 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  icon: Icon,
  autoComplete,
  required = true
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';

  return (
    <div className="svp-input-group">
      <label className="svp-input-label" htmlFor={id}>
        {label}
      </label>
      <div className="svp-input-wrapper">
        {Icon && <Icon size={18} className="svp-input-icon" />}
        <input 
          type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="svp-input-field"
          autoComplete={autoComplete}
          style={isPasswordField ? { paddingRight: '44px' } : undefined}
          required={required}
        />
        {isPasswordField && (
          <button 
            type="button" 
            className="svp-eye-btn"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
