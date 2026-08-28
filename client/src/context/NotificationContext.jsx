import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'confirm'|'prompt', title, message, defaultValue, confirmText, cancelText, isDestructive, onConfirm }
  const [promptInput, setPromptInput] = useState('');

  // ─── Toast Notifications ───────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Confirmation Modal ─────────────────────────────────────────────────────
  const confirmModal = useCallback(({ title = 'Confirm Action', message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm }) => {
    setModal({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
      isDestructive,
      onConfirm: async () => {
        setModal(null);
        if (onConfirm) await onConfirm();
      }
    });
  }, []);

  // ─── Prompt Modal ───────────────────────────────────────────────────────────
  const promptModal = useCallback(({ title = 'Enter Details', message, defaultValue = '', confirmText = 'Save', cancelText = 'Cancel', onConfirm }) => {
    setPromptInput(defaultValue);
    setModal({
      type: 'prompt',
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: async (val) => {
        setModal(null);
        if (onConfirm) await onConfirm(val);
      }
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, confirmModal, promptModal }}>
      {children}

      {/* ── Toast Notifications Layer ── */}
      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const bg = isSuccess ? 'rgba(16, 185, 129, 0.15)' : isError ? 'rgba(239, 68, 68, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)';
          const border = isSuccess ? 'var(--color-success, #10b981)' : isError ? 'var(--color-error, #ef4444)' : isWarning ? 'hsl(38, 92%, 50%)' : 'var(--color-accent, #6366f1)';
          const color = isSuccess ? 'var(--color-success, #10b981)' : isError ? 'var(--color-error, #ef4444)' : isWarning ? 'hsl(38, 92%, 50%)' : 'var(--color-accent, #6366f1)';

          return (
            <div
              key={toast.id}
              className="glass-panel animate-fade"
              style={{
                pointerEvents: 'auto',
                minWidth: '300px',
                maxWidth: '420px',
                padding: '14px 18px',
                backgroundColor: bg,
                borderLeft: `4px solid ${border}`,
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                color: 'var(--text-primary)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.36)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSuccess && <CheckCircle2 size={20} color={color} />}
                {isError && <AlertCircle size={20} color={color} />}
                {isWarning && <AlertTriangle size={20} color={color} />}
                {!isSuccess && !isError && !isWarning && <Info size={20} color={color} />}
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Modal Overlay Layer ── */}
      {modal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }} className="animate-fade">
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {modal.isDestructive ? <AlertTriangle size={24} color="var(--color-error, #ef4444)" /> : <Info size={24} color="var(--color-accent, #6366f1)" />}
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', margin: 0 }}>{modal.title}</h2>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
              {modal.message}
            </p>

            {modal.type === 'prompt' && (
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter' && promptInput.trim()) {
                      modal.onConfirm(promptInput.trim());
                    }
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {modal.cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modal.type === 'prompt') {
                    if (!promptInput.trim()) return;
                    modal.onConfirm(promptInput.trim());
                  } else {
                    modal.onConfirm();
                  }
                }}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  backgroundColor: modal.isDestructive ? 'var(--color-error, #ef4444)' : 'var(--color-accent)',
                  backgroundImage: modal.isDestructive ? 'none' : undefined,
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
