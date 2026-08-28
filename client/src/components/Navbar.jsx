import React from 'react';
import { Menu, X, LogOut, ShieldCheck, User } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, Link } from 'react-router-dom';

export const Navbar = ({ sidebarOpen, setSidebarOpen, isLanding = false, onLoginClick }) => {
  const { token, user, logout } = useAuth();
  const { showToast, confirmModal } = useNotification();
  const navigate = useNavigate();

  const handleLogout = () => {
    confirmModal({
      title: 'Log Out Session',
      message: 'Are you sure you want to log out of your session?',
      confirmText: 'Log Out',
      isDestructive: true,
      onConfirm: () => {
        logout();
        showToast('Logged out successfully.', 'info');
        navigate('/login');
      }
    });
  };

  return (
    <header
      style={{
        height: '70px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Sidebar Hamburger Trigger */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/Logos.png" 
            alt="SRI VARI PACKS Logo" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }} 
          />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }} className="gradient-text">
            SRI VARI PACKS
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* User / Admin Identity Badge */}
        {user && !isLanding && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            {user.role === 'admin' ? (
              <ShieldCheck size={16} style={{ color: '#a855f7' }} />
            ) : (
              <User size={16} style={{ color: 'var(--color-accent)' }} />
            )}
            <span>{user.full_name || user.username}</span>
          </div>
        )}

        <ThemeToggle />

        {/* Header Log Out Button */}
        {token && !isLanding && (
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.88rem',
              transition: 'all 0.2s ease'
            }}
            className="btn-logout-header"
            title="Log Out"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        )}

        {isLanding && !token && (
          <button
            onClick={onLoginClick}
            className="btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '0.9rem',
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
