import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Users, LogOut, Package, Factory, History, ShieldCheck, FileText, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { useNotification } from '../context/NotificationContext';

export const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, user } = useAuth();
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

  const navItems = user?.role === 'admin' 
    ? [
        { path: '/user-access', label: 'User Access', icon: <ShieldCheck size={20} /> },
        { path: '/company-management', label: 'Companies', icon: <Package size={20} /> },
        { path: '/to-address-management', label: 'To Address Management', icon: <Bookmark size={20} /> },
      ]
    : [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/add-customer', label: 'Add New Customer', icon: <UserPlus size={20} /> },
        { path: '/production', label: 'Production', icon: <Factory size={20} /> },
        { path: '/production-history', label: 'Production History', icon: <History size={20} /> },
        { path: '/customers', label: 'Customers', icon: <Users size={20} /> },
        { path: '/quotations', label: 'Quotations', icon: <FileText size={20} /> },
      ];

  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Sidebar Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <img 
          src="/Logos.png" 
          alt="SRI VARI PACKS Logo" 
          style={{ height: '54px', width: 'auto', objectFit: 'contain' }} 
        />
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', lineHeight: 1.15 }}>SRI VARI PACKS</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Box Manufacturing</span>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={toggleSidebar}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'var(--gradient-accent)' : 'transparent',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            })}
            className="sidebar-link"
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer Profile & Logout */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'var(--color-accent)',
            }}
          >
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              @{user?.username || 'user'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--color-error)',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease',
          }}
          className="logout-btn"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
