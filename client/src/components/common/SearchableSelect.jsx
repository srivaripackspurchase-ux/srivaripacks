import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function SearchableSelect({
  options = [], // Array of { value: string | number, label: string }
  value = '',
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt =>
    String(opt.label || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', minWidth: '0', ...style }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`form-control ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          width: '100%',
          gap: '8px',
          background: 'var(--bg-secondary, rgba(15, 23, 42, 0.6))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '0.9rem',
          color: selectedOption ? 'var(--text-primary, #ffffff)' : 'var(--text-muted, #94a3b8)',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedOption ? selectedOption.label : (options.length === 0 ? 'No options available' : placeholder)}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0, opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)',
            padding: '8px',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted, #94a3b8)' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                background: 'var(--bg-secondary, rgba(15, 23, 42, 0.8))',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm, 4px)',
                      border: 'none',
                      background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      color: isSelected ? 'var(--color-accent, #818cf8)' : 'var(--text-primary, #ffffff)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      fontWeight: isSelected ? '600' : '400',
                      transition: 'background 0.15s',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                    {isSelected && <Check size={14} style={{ color: 'var(--color-accent, #818cf8)', flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
