import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute, ProtectedAdminRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddCustomer from './pages/AddCustomer';
import Production from './pages/Production';
import ProductionHistory from './pages/ProductionHistory';
import Customers from './pages/Customers';
import Quotations from './pages/Quotations';
import UserAccess from './pages/UserAccess';
import CompanyManagement from './pages/CompanyManagement';
import ToAddressManagement from './pages/ToAddressManagement';

import './App.css';

// Global Error Boundary to catch and display rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          backgroundColor: '#0a0b16', 
          color: '#f8fafc', 
          fontFamily: 'system-ui, sans-serif', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ maxWidth: '600px', width: '100%', background: '#121324', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h1 style={{ color: '#ef4444', fontSize: '1.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              ⚠️ Application Render Error
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '0.95rem' }}>
              A runtime crash occurred inside the React components tree:
            </p>
            <pre style={{ 
              backgroundColor: '#0a0b16', 
              padding: '16px', 
              borderRadius: '8px', 
              overflowX: 'auto', 
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.85rem',
              color: '#fca5a5',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              marginBottom: '24px'
            }}>
              {this.state.error ? this.state.error.toString() : 'Unknown Error'}
              {this.state.error?.stack && `\n\nStack Trace:\n${this.state.error.stack.split('\n').slice(0, 5).join('\n')}`}
            </pre>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  flex: 1,
                  padding: '12px', 
                  backgroundColor: '#6366f1', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Reload Page
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                style={{ 
                  padding: '12px 20px', 
                  backgroundColor: 'transparent', 
                  color: '#94a3b8', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Clear Data & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AuthenticatedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />
      
      {/* Sidebar backdrop overlay when open */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 95,
          }}
        />
      )}

      {/* Main container right of sidebar */}
      <div
        className={`main-layout-container ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%',
        }}
      >
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { token, user } = useAuth();
  const defaultRedirect = user?.role === 'admin' ? '/user-access' : '/dashboard';

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={token ? <Navigate to={defaultRedirect} replace /> : <Landing />} />
      <Route path="/login" element={token ? <Navigate to={defaultRedirect} replace /> : <Login />} />

      {/* Authenticated Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Dashboard />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-customer"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <AddCustomer />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Production />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/production-history"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <ProductionHistory />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Customers />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotations"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Quotations />
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-access"
        element={
          <ProtectedAdminRoute>
            <AuthenticatedLayout>
              <UserAccess />
            </AuthenticatedLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/company-management"
        element={
          <ProtectedAdminRoute>
            <AuthenticatedLayout>
              <CompanyManagement />
            </AuthenticatedLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/to-address-management"
        element={
          <ProtectedAdminRoute>
            <AuthenticatedLayout>
              <ToAddressManagement />
            </AuthenticatedLayout>
          </ProtectedAdminRoute>
        }
      />

      {/* Fallback Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

