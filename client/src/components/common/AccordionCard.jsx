import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const AccordionCard = ({ id, label, color = 'var(--color-accent)', activeId, onToggle, children }) => {
  const isOpen = activeId === id;

  return (
    <div className="glass-panel" style={{ marginBottom: '20px', overflow: 'hidden', borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius-lg)' }}>
      <button
        type="button"
        onClick={() => onToggle(activeId === id ? null : id)}
        style={{
          width: '100%',
          padding: '18px 24px',
          background: isOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          color: 'var(--text-primary)',
          fontSize: '1.05rem',
          fontWeight: '700',
          fontFamily: 'var(--font-heading)',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '0', textAlign: 'left' }}>
          <span style={{ width: '10px', height: '10px', minWidth: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: isOpen ? color : 'var(--text-secondary)', fontWeight: '600', flexShrink: 0, marginLeft: '16px' }}>
          <span>{isOpen ? 'Collapse Section' : 'Expand Calculation'}</span>
          {isOpen ? <ChevronUp size={18} color={color} /> : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>
      </button>
      {isOpen && (
        <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)' }}>
          {children}
        </div>
      )}
    </div>
  );
};
