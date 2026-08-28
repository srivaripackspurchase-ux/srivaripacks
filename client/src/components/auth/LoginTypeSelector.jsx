import React from 'react';
import { User, ShieldCheck } from 'lucide-react';

export default function LoginTypeSelector({ activeTab, onSelectTab }) {
  return (
    <div className="svp-segmented-control" role="tablist" aria-label="Login Type Selection">
      {/* Sliding Active Background Pill Indicator */}
      <div className={`svp-segmented-indicator ${activeTab === 'admin' ? 'is-admin' : 'is-user'}`} />

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'user'}
        className={`svp-segmented-btn ${activeTab === 'user' ? 'active' : ''}`}
        onClick={() => onSelectTab('user')}
      >
        <User size={18} className="svp-tab-icon" />
        <span>User Login</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'admin'}
        className={`svp-segmented-btn ${activeTab === 'admin' ? 'active' : ''}`}
        onClick={() => onSelectTab('admin')}
      >
        <ShieldCheck size={18} className="svp-tab-icon" />
        <span>Admin Login</span>
      </button>
    </div>
  );
}
