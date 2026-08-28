import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { calculateBoxPricing, calculatePadPricing, calculatePartitionPricing, calculatePairedPartitionPricing, calculateTrayPricing, calculateSleavePricing, calculateCollerBoxPricing, calculateTopSideTrayBoxPricing, calculateUniversalTypePricing, calculateFullClosingBoxPricing, convertToInches, PLY_CONFIG, PAD_CALC_PREFIX, PARTITION_CALC_PREFIX, TRAY_CALC_PREFIX, SLEAVE_CALC_PREFIX, COLLER_BOX_CALC_PREFIX, TOP_SIDE_TRAY_BOX_CALC_PREFIX, UNIVERSAL_TYPE_CALC_PREFIX, FULL_CLOSING_BOX_CALC_PREFIX } from '../utils/calculations';
import { Save, Calculator, CheckCircle2, ChevronDown, ChevronUp, History, FolderPlus, FolderOpen, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchableSelect from '../components/common/SearchableSelect';

const AccordionCard = ({ id, label, color = 'var(--color-accent)', activeId, onToggle, children }) => {
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

import { useNotification } from '../context/NotificationContext';

// ─── Input Sanitization Helpers (Strict Numeric/Decimal & Signed Adjustments) ──
const sanitizeSignedInput = (val) => {
  if (val === '' || val === '-' || val === '+') return val;
  if (/^[+-]?\d*\.?\d*$/.test(val)) return val;
  return null; // Rejects letters & invalid text
};

const sanitizeUnsignedDecimalInput = (val) => {
  if (val === '') return '';
  if (/^\d*\.?\d*$/.test(val)) return val;
  return null; // Rejects letters & invalid text
};

const sanitizeUnsignedIntegerInput = (val) => {
  if (val === '') return '';
  if (/^\d*$/.test(val)) return val;
  return null; // Rejects letters & invalid text
};

const parseNumeric = (val, defaultVal = 0) => {
  if (val === '' || val === '-' || val === '+') return defaultVal;
  const num = parseFloat(val);
  return isNaN(num) ? defaultVal : num;
};

const formatToIsoDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  return clean;
};

// Helper: Filter companies for a specific calculation type
const filterCompaniesForType = (companiesList, calcType) => {
  if (!Array.isArray(companiesList)) return [];
  const target = (calcType || '').toLowerCase().trim();
  return companiesList.filter(c => {
    if (!c.available_types || !Array.isArray(c.available_types)) return true;
    if (c.available_types.length === 0 || c.available_types.includes('all')) return true;
    return c.available_types.some(t => {
      const norm = (t || '').toLowerCase().trim();
      if (norm === target) return true;
      if ((target === 'box' || target === 'standard_box') && (norm === 'box' || norm === 'standard_box')) return true;
      if ((target === 'sleave' || target === 'sleave_box') && (norm === 'sleave' || norm === 'sleave_box')) return true;
      if ((target === 'coller_box' || target === 'coller') && (norm === 'coller_box' || norm === 'coller')) return true;
      if ((target === 'top_side_tray' || target === 'top_side_tray_box') && (norm === 'top_side_tray' || norm === 'top_side_tray_box')) return true;
      if ((target === 'universal' || target === 'universal_type') && (norm === 'universal' || norm === 'universal_type')) return true;
      if ((target === 'full_closing' || target === 'full_closing_box') && (norm === 'full_closing' || norm === 'full_closing_box')) return true;
      return false;
    });
  });
};

// ─── Reusable production form builder ──────────────────────────────────────
const ProductionFormFields = ({ companies, prefix, state, setState, showH = true, showPacking = true, calcType }) => {
  const gsmOptions = [100, 120, 140, 150, 180, 200, 220];
  const bfOptions = [12, 14, 16, 18, 20, 22];
  const filteredCompanies = filterCompaniesForType(companies, calcType);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }} className="form-grid">
      <div className="form-group" style={{ gridColumn: calcType === 'partition' ? 'span 2' : 'span 1' }}>
        <label className="form-label">Company Name</label>
        <SearchableSelect
          options={filteredCompanies.map(c => ({ value: c.id, label: c.name }))}
          value={state.companyId}
          onChange={val => setState.setCompanyId(val)}
          placeholder="Select Company..."
          searchPlaceholder="Search company..."
        />
      </div>
      <div className="form-group" style={{ gridColumn: calcType === 'partition' ? 'span 2' : 'span 1' }}>
        <label className="form-label">{showH ? 'Size Option (L × W × H)' : 'Size Option (L × W)'}</label>
        <SearchableSelect
          options={state.sizes.map(s => {
            if (calcType === 'partition') {
              if (s.type === 'paired') {
                return { value: s.id, label: s.label };
              } else {
                const parts = s.size.label.split('×').map(p => p.trim());
                const lbl = parts.length >= 2 ? `${parts[0]} × ${parts[1]}` : s.size.label;
                return { value: s.id, label: `${lbl} (L × W)` };
              }
            }
            if (!showH) {
              const parts = s.label.split('×').map(p => p.trim());
              const padLabel = parts.length >= 2 ? `${parts[0]} × ${parts[1]}` : s.label;
              return { value: s.id, label: `${padLabel} (L × W)` };
            }
            return { value: s.id, label: s.label };
          })}
          value={state.sizeId}
          onChange={val => setState.setSizeId(val)}
          placeholder="Select Size..."
          searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
          disabled={state.sizes.length === 0}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Quantity of {prefix}</label>
        <input 
          type="text"
          inputMode="numeric"
          value={state.qty} 
          onChange={e => {
            const val = sanitizeUnsignedIntegerInput(e.target.value);
            if (val !== null) setState.setQty(val);
          }} 
          className="form-control" 
          placeholder="e.g. 100" 
        />
      </div>
      {calcType === 'partition' && (
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: '700', color: 'var(--color-accent)' }}>Set</label>
          <input 
            type="text"
            inputMode="numeric"
            value={state.set} 
            onChange={e => {
              const val = sanitizeUnsignedIntegerInput(e.target.value);
              if (val !== null && setState.setSet) setState.setSet(val);
            }} 
            className="form-control" 
            placeholder="e.g. 1" 
          />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Ply Type Option</label>
        <select value={state.plyType} onChange={e => setState.setPlyType(e.target.value)} className="form-control">
          <option value="3">3 Ply (1 Liner + 1 Packing)</option>
          <option value="5">5 Ply (2 Liner + 1 Packing)</option>
          <option value="7">7 Ply (3 Liner + 1 Packing)</option>
          <option value="9">9 Ply (4 Liner + 1 Packing)</option>
          <option value="11">11 Ply (5 Liner + 1 Packing)</option>
          <option value="13">13 Ply (6 Liner + 1 Packing)</option>
        </select>
      </div>
      {showPacking && (
        <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px' }}>
          <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={state.hasPacking} onChange={e => setState.setHasPacking(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <span style={{ fontWeight: '700' }}>Use Packing Paper</span>
          </label>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Uncheck to disable packing paper calculations and sheet counts</span>
        </div>
      )}
      {showPacking && (
        <div className="form-group">
          <label className="form-label">Packing Paper Option</label>
          {state.hasPacking ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {['N', 'G'].map(opt => (
                <button key={opt} type="button" onClick={() => setState.setPackingOption(opt)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: state.packingOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: state.packingOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  Option {opt}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
              No Packing Paper selected (Indicated as 0)
            </div>
          )}
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Liner Paper Option</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['G/N', 'G/G', 'N/G', 'N/N'].map(opt => (
            <button key={opt} type="button" onClick={() => setState.setLinerOption(opt)} style={{ flex: '1 1 calc(50% - 4px)', minWidth: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: state.linerOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: state.linerOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">GSM (Paper Thickness)</label>
        <select value={state.gsmPaper} onChange={e => setState.setGsmPaper(e.target.value)} className="form-control">
          {gsmOptions.map(v => <option key={v} value={v}>{v} GSM</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">BF (Burst Factor)</label>
        <select value={state.bf} onChange={e => setState.setBf(e.target.value)} className="form-control">
          {bfOptions.map(v => <option key={v} value={v}>{v} BF</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Reel Size (+)</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={state.reelSizePlus} 
          onChange={e => {
            const val = sanitizeUnsignedDecimalInput(e.target.value);
            if (val !== null) setState.setReelSizePlus(val);
          }} 
          className="form-control" 
          placeholder="e.g. 0.5" 
        />
      </div>
      <div className="form-group">
        <label className="form-label">Reel Size (-)</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={state.reelSizeMinus} 
          onChange={e => {
            const val = sanitizeUnsignedDecimalInput(e.target.value);
            if (val !== null) setState.setReelSizeMinus(val);
          }} 
          className="form-control" 
          placeholder="e.g. 0.5" 
        />
      </div>
      <div className="form-group">
        <label className="form-label">Cut Size (+)</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={state.cutSizePlus} 
          onChange={e => {
            const val = sanitizeUnsignedDecimalInput(e.target.value);
            if (val !== null) setState.setCutSizePlus(val);
          }} 
          className="form-control" 
          placeholder="e.g. 0.5" 
        />
      </div>
      <div className="form-group">
        <label className="form-label">Cut Size (-)</label>
        <input 
          type="text" 
          inputMode="decimal"
          value={state.cutSizeMinus} 
          onChange={e => {
            const val = sanitizeUnsignedDecimalInput(e.target.value);
            if (val !== null) setState.setCutSizeMinus(val);
          }} 
          className="form-control" 
          placeholder="e.g. 0.5" 
        />
      </div>
    </div>
  );
};

export default function Production() {
  const { authenticatedFetch } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const editId = new URLSearchParams(location.search).get('editId');
  const [editingId, setEditingId] = useState(editId);
  const [editingType, setEditingType] = useState(null);
  const [loadedSizeId, setLoadedSizeId] = useState(null);

  const [showCancelEditModal, setShowCancelEditModal] = useState(false);
  const [pendingAccordionId, setPendingAccordionId] = useState(null);
  const [pendingNavigationPath, setPendingNavigationPath] = useState(null);

  const handleAccordionToggle = (targetId) => {
    if (editingId) {
      // Trigger confirmation on closing current calculation OR switching to another calculation
      if (activeAccordion === targetId || targetId === null || (activeAccordion && activeAccordion !== targetId)) {
        setPendingAccordionId(targetId);
        setShowCancelEditModal(true);
        return;
      }
    }
    setActiveAccordion(targetId);
  };

  const handleConfirmCancelEdit = () => {
    setShowCancelEditModal(false);
    const targetPath = pendingNavigationPath;
    const targetAcc = pendingAccordionId;

    setEditingId(null);
    setEditingType(null);
    setPendingNavigationPath(null);
    setPendingAccordionId(null);

    const params = new URLSearchParams(location.search);
    params.delete('editId');
    params.delete('edit');
    params.delete('type');
    const newSearch = params.toString();
    window.history.replaceState(null, '', `${location.pathname}${newSearch ? '?' + newSearch : ''}`);

    if (targetPath) {
      navigate(targetPath);
    } else {
      setActiveAccordion(targetAcc);
    }
  };

  const handleKeepEditing = () => {
    setShowCancelEditModal(false);
    setPendingAccordionId(null);
    setPendingNavigationPath(null);
  };

  // Editing session protection for external page navigation & sidebar links
  useEffect(() => {
    if (!editingId) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handleGlobalClick = (e) => {
      const linkEl = e.target.closest('a, button, [role="button"]');
      if (!linkEl) return;

      // Allow form controls and buttons inside active form / accordion card
      if (e.target.closest('form') || e.target.closest('.svp-form-container')) {
        return;
      }

      const href = linkEl.getAttribute('href');
      if (linkEl.closest('.sidebar') || (href && !href.startsWith('#') && !href.includes('javascript:'))) {
        e.preventDefault();
        e.stopPropagation();
        setPendingNavigationPath(href || '/production-history');
        setShowCancelEditModal(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [editingId]);

  // List arrays
  const [companies, setCompanies] = useState([]);
  const [sizes, setSizes] = useState([]);

  // Basic Form State
  const [companyId, setCompanyId] = useState('');
  const [sizeId, setSizeId] = useState('');
  const [qtyBoxes, setQtyBoxes] = useState('100');
  const [plyType, setPlyType] = useState('5');
  const [packingOption, setPackingOption] = useState('N'); // N or G
  const [linerOption, setLinerOption] = useState('G/N'); // G/N, G/G, N/G, N/N
  const [hasPacking, setHasPacking] = useState(true);
  const [gsmPaper, setGsmPaper] = useState('150');
  const [bf, setBf] = useState('16');
  const [customerName, setCustomerName] = useState('');
  const [dateOfFinish, setDateOfFinish] = useState('');

  // Advanced Form State (Collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fluteExtraPercent, setFluteExtraPercent] = useState('45');
  const [gsmFlute, setGsmFlute] = useState('150');
  const [gsmPacking, setGsmPacking] = useState('150');
  const [qtyData, setQtyData] = useState('2');
  const [reelSizePlus, setReelSizePlus] = useState('');
  const [reelSizeMinus, setReelSizeMinus] = useState('');
  const [cutSizePlus, setCutSizePlus] = useState('');
  const [cutSizeMinus, setCutSizeMinus] = useState('');
  const [reelMultiplier, setReelMultiplier] = useState(1);
  const [cutMultiplier, setCutMultiplier] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState(null);

  const renderConvertedSizeDisplay = (selectedSize, showH = true) => {
    if (!selectedSize) return null;
    const isMM = selectedSize.unit?.toLowerCase() === 'mm';
    const L = selectedSize.length_inches || 0;
    const W = selectedSize.width_inches || 0;
    const H = selectedSize.height_inches || 0;

    if (isMM) {
      const lIn = (L / 25.4).toFixed(2);
      const wIn = (W / 25.4).toFixed(2);
      const hIn = (H / 25.4).toFixed(2);
      const label = showH ? 'Size in Inches (L × W × H)' : 'Size in Inches (L × W)';
      const val = showH ? `${lIn} × ${wIn} × ${hIn} in` : `${lIn} × ${wIn} in`;
      return (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{val}</div>
        </div>
      );
    } else {
      const lMm = Math.round(L * 25.4);
      const wMm = Math.round(W * 25.4);
      const hMm = Math.round(H * 25.4);
      const label = showH ? 'Size in MM (L × W × H)' : 'Size in MM (L × W)';
      const val = showH ? `${lMm} × ${wMm} × ${hMm} mm` : `${lMm} × ${wMm} mm`;
      return (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{val}</div>
        </div>
      );
    }
  };

  // Results State
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  // Production File State
  const [productionFile, setProductionFile] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [existingFiles, setExistingFiles] = useState([]);
  const [showNewFileInput, setShowNewFileInput] = useState(false);

  // ─── Pad Calculation State (no price fields) ───────────────────────────────
  const [padCompanyId, setPadCompanyId] = useState('');
  const [padSizes, setPadSizes] = useState([]);
  const [padSizeId, setPadSizeId] = useState('');
  const [padQtyPads, setPadQtyPads] = useState('100');
  const [padPlyType, setPadPlyType] = useState('5');
  const [padPackingOption, setPadPackingOption] = useState('N');
  const [padLinerOption, setPadLinerOption] = useState('G/N');
  const [padHasPacking, setPadHasPacking] = useState(true);
  const [padGsmPaper, setPadGsmPaper] = useState('150');
  const [padBf, setPadBf] = useState('16');
  const [padCustomerName, setPadCustomerName] = useState('');
  const [padDateOfFinish, setPadDateOfFinish] = useState('');
  const [padShowAdvanced, setPadShowAdvanced] = useState(false);
  const [padFluteExtraPercent, setPadFluteExtraPercent] = useState('45');
  const [padGsmFlute, setPadGsmFlute] = useState('150');
  const [padGsmPacking, setPadGsmPacking] = useState('150');
  const [padQtyData, setPadQtyData] = useState('2');
  const [padReelSizePlus, setPadReelSizePlus] = useState('');
  const [padReelSizeMinus, setPadReelSizeMinus] = useState('');
  const [padCutSizePlus, setPadCutSizePlus] = useState('');
  const [padCutSizeMinus, setPadCutSizeMinus] = useState('');
  const [padReelMultiplier, setPadReelMultiplier] = useState(1);
  const [padCutMultiplier, setPadCutMultiplier] = useState(1);
  const [padResults, setPadResults] = useState(null);
  const [padSaving, setPadSaving] = useState(false);
  const [padSavedSuccess, setPadSavedSuccess] = useState(false);
  const [padError, setPadError] = useState('');
  const [padShowSizeDropdown, setPadShowSizeDropdown] = useState(false);
  const [padProductionFile, setPadProductionFile] = useState('');
  const [padNewFileName, setPadNewFileName] = useState('');
  const [padShowNewFileInput, setPadShowNewFileInput] = useState(false);

  // ─── Partition Calculation State (no price fields) ─────────────────────────
  const [partitionCompanyId, setPartitionCompanyId] = useState('');
  const [partitionSizes, setPartitionSizes] = useState([]);
  const [partitionGroupedSizes, setPartitionGroupedSizes] = useState([]);
  const [partitionSizeId, setPartitionSizeId] = useState('');
  const [partitionQtyPads, setPartitionQtyPads] = useState('100');
  const [partitionPlyType, setPartitionPlyType] = useState('5');
  const [partitionPackingOption, setPartitionPackingOption] = useState('N');
  const [partitionLinerOption, setPartitionLinerOption] = useState('G/N');
  const [partitionHasPacking, setPartitionHasPacking] = useState(true);
  const [partitionGsmPaper, setPartitionGsmPaper] = useState('150');
  const [partitionBf, setPartitionBf] = useState('16');
  const [partitionCustomerName, setPartitionCustomerName] = useState('');
  const [partitionDateOfFinish, setPartitionDateOfFinish] = useState('');
  const [partitionShowAdvanced, setPartitionShowAdvanced] = useState(false);
  const [partitionFluteExtraPercent, setPartitionFluteExtraPercent] = useState('45');
  const [partitionGsmFlute, setPartitionGsmFlute] = useState('150');
  const [partitionGsmPacking, setPartitionGsmPacking] = useState('150');
  const [partitionQtyData, setPartitionQtyData] = useState('2');
  const [partitionSet, setPartitionSet] = useState('1');
  const [partitionReelSizePlus, setPartitionReelSizePlus] = useState('');
  const [partitionReelSizeMinus, setPartitionReelSizeMinus] = useState('');
  const [partitionCutSizePlus, setPartitionCutSizePlus] = useState('');
  const [partitionCutSizeMinus, setPartitionCutSizeMinus] = useState('');
  const [partitionReelMultiplier, setPartitionReelMultiplier] = useState(1);
  const [partitionCutMultiplier, setPartitionCutMultiplier] = useState(1);
  const [partitionResults, setPartitionResults] = useState(null);
  const [partitionSaving, setPartitionSaving] = useState(false);
  const [partitionSavedSuccess, setPartitionSavedSuccess] = useState(false);
  const [partitionError, setPartitionError] = useState('');
  const [partitionShowSizeDropdown, setPartitionShowSizeDropdown] = useState(false);
  const [partitionProductionFile, setPartitionProductionFile] = useState('');
  const [partitionNewFileName, setPartitionNewFileName] = useState('');
  const [partitionShowNewFileInput, setPartitionShowNewFileInput] = useState(false);

  // ─── Tray Calculation State (no price fields, like pad production but with H) ─
  const [trayCompanyId, setTrayCompanyId] = useState('');
  const [traySizes, setTraySizes] = useState([]);
  const [traySizeId, setTraySizeId] = useState('');
  const [trayQtyTrays, setTrayQtyTrays] = useState('100');
  const [trayPlyType, setTrayPlyType] = useState('5');
  const [trayPackingOption, setTrayPackingOption] = useState('N');
  const [trayLinerOption, setTrayLinerOption] = useState('G/N');
  const [trayHasPacking, setTrayHasPacking] = useState(true);
  const [trayGsmPaper, setTrayGsmPaper] = useState('150');
  const [trayBf, setTrayBf] = useState('16');
  const [trayCustomerName, setTrayCustomerName] = useState('');
  const [trayDateOfFinish, setTrayDateOfFinish] = useState('');
  const [trayShowAdvanced, setTrayShowAdvanced] = useState(false);
  const [trayFluteExtraPercent, setTrayFluteExtraPercent] = useState('45');
  const [trayGsmFlute, setTrayGsmFlute] = useState('150');
  const [trayGsmPacking, setTrayGsmPacking] = useState('150');
  const [trayQtyData, setTrayQtyData] = useState('2');
  const [trayReelSizePlus, setTrayReelSizePlus] = useState('');
  const [trayReelSizeMinus, setTrayReelSizeMinus] = useState('');
  const [trayCutSizePlus, setTrayCutSizePlus] = useState('');
  const [trayCutSizeMinus, setTrayCutSizeMinus] = useState('');
  const [trayReelMultiplier, setTrayReelMultiplier] = useState(1);
  const [trayCutMultiplier, setTrayCutMultiplier] = useState(1);
  const [trayResults, setTrayResults] = useState(null);
  const [traySaving, setTraySaving] = useState(false);
  const [traySavedSuccess, setTraySavedSuccess] = useState(false);
  const [trayError, setTrayError] = useState('');
  const [trayProductionFile, setTrayProductionFile] = useState('');
  const [trayNewFileName, setTrayNewFileName] = useState('');
  const [trayShowNewFileInput, setTrayShowNewFileInput] = useState(false);

  // ─── Sleave Calculation State ──────────────────────────────────────────────
  const [sleaveCompanyId, setSleaveCompanyId] = useState('');
  const [sleaveSizes, setSleaveSizes] = useState([]);
  const [sleaveSizeId, setSleaveSizeId] = useState('');
  const [sleaveQty, setSleaveQty] = useState('100');
  const [sleavePlyType, setSleavePlyType] = useState('5');
  const [sleavePackingOption, setSleavePackingOption] = useState('N');
  const [sleaveLinerOption, setSleaveLinerOption] = useState('G/N');
  const [sleaveHasPacking, setSleaveHasPacking] = useState(true);
  const [sleaveGsmPaper, setSleaveGsmPaper] = useState('150');
  const [sleaveBf, setSleaveBf] = useState('16');
  const [sleaveCustomerName, setSleaveCustomerName] = useState('');
  const [sleaveDateOfFinish, setSleaveDateOfFinish] = useState('');
  const [sleaveShowAdvanced, setSleaveShowAdvanced] = useState(false);
  const [sleaveFluteExtraPercent, setSleaveFluteExtraPercent] = useState('45');
  const [sleaveGsmFlute, setSleaveGsmFlute] = useState('150');
  const [sleaveGsmPacking, setSleaveGsmPacking] = useState('150');
  const [sleaveQtyData, setSleaveQtyData] = useState('2');
  const [sleaveReelSizePlus, setSleaveReelSizePlus] = useState('');
  const [sleaveReelSizeMinus, setSleaveReelSizeMinus] = useState('');
  const [sleaveCutSizePlus, setSleaveCutSizePlus] = useState('');
  const [sleaveCutSizeMinus, setSleaveCutSizeMinus] = useState('');
  const [sleaveFlabL, setSleaveFlabL] = useState('0');
  const [sleaveFlabW, setSleaveFlabW] = useState('0');
  const [sleaveReelMultiplier, setSleaveReelMultiplier] = useState(1);
  const [sleaveCutMultiplier, setSleaveCutMultiplier] = useState(1);
  const [sleaveResults, setSleaveResults] = useState(null);
  const [sleaveSaving, setSleaveSaving] = useState(false);
  const [sleaveSavedSuccess, setSleaveSavedSuccess] = useState(false);
  const [sleaveError, setSleaveError] = useState('');
  const [sleaveProductionFile, setSleaveProductionFile] = useState('');
  const [sleaveNewFileName, setSleaveNewFileName] = useState('');
  const [sleaveShowNewFileInput, setSleaveShowNewFileInput] = useState(false);

  // ─── Coller Box Calculation State ──────────────────────────────────────────────
  const [collerBoxCompanyId, setCollerBoxCompanyId] = useState('');
  const [collerBoxSizes, setCollerBoxSizes] = useState([]);
  const [collerBoxSizeId, setCollerBoxSizeId] = useState('');
  const [collerBoxQty, setCollerBoxQty] = useState('100');
  const [collerBoxPlyType, setCollerBoxPlyType] = useState('5');
  const [collerBoxPackingOption, setCollerBoxPackingOption] = useState('N');
  const [collerBoxLinerOption, setCollerBoxLinerOption] = useState('G/N');
  const [collerBoxHasPacking, setCollerBoxHasPacking] = useState(true);
  const [collerBoxGsmPaper, setCollerBoxGsmPaper] = useState('150');
  const [collerBoxBf, setCollerBoxBf] = useState('16');
  const [collerBoxCustomerName, setCollerBoxCustomerName] = useState('');
  const [collerBoxDateOfFinish, setCollerBoxDateOfFinish] = useState('');
  const [collerBoxShowAdvanced, setCollerBoxShowAdvanced] = useState(false);
  const [collerBoxFluteExtraPercent, setCollerBoxFluteExtraPercent] = useState('45');
  const [collerBoxGsmFlute, setCollerBoxGsmFlute] = useState('150');
  const [collerBoxGsmPacking, setCollerBoxGsmPacking] = useState('150');
  const [collerBoxQtyData, setCollerBoxQtyData] = useState('2');
  const [collerBoxReelSizePlus, setCollerBoxReelSizePlus] = useState('');
  const [collerBoxReelSizeMinus, setCollerBoxReelSizeMinus] = useState('');
  const [collerBoxCutSizePlus, setCollerBoxCutSizePlus] = useState('');
  const [collerBoxCutSizeMinus, setCollerBoxCutSizeMinus] = useState('');
  const [collerBoxFlabL, setCollerBoxFlabL] = useState('0');
  const [collerBoxFlabW, setCollerBoxFlabW] = useState('0');
  const [collerBoxReelMultiplier, setCollerBoxReelMultiplier] = useState(1);
  const [collerBoxCutMultiplier, setCollerBoxCutMultiplier] = useState(1);
  const [collerBoxResults, setCollerBoxResults] = useState(null);
  const [collerBoxSaving, setCollerBoxSaving] = useState(false);
  const [collerBoxSavedSuccess, setCollerBoxSavedSuccess] = useState(false);
  const [collerBoxError, setCollerBoxError] = useState('');
  const [collerBoxProductionFile, setCollerBoxProductionFile] = useState('');
  const [collerBoxNewFileName, setCollerBoxNewFileName] = useState('');
  const [collerBoxShowNewFileInput, setCollerBoxShowNewFileInput] = useState(false);

  // ─── Top Side Tray Box Calculation State (no price fields) ──────────────────────
  const [uBoxCompanyId, setUBoxCompanyId] = useState('');
  const [uBoxSizes, setUBoxSizes] = useState([]);
  const [uBoxSizeId, setUBoxSizeId] = useState('');
  const [uBoxQty, setUBoxQty] = useState('100');
  const [uBoxPlyType, setUBoxPlyType] = useState('5');
  const [uBoxPackingOption, setUBoxPackingOption] = useState('N');
  const [uBoxLinerOption, setUBoxLinerOption] = useState('G/N');
  const [uBoxHasPacking, setUBoxHasPacking] = useState(true);
  const [uBoxGsmPaper, setUBoxGsmPaper] = useState('150');
  const [uBoxBf, setUBoxBf] = useState('16');
  const [uBoxCustomerName, setUBoxCustomerName] = useState('');
  const [uBoxDateOfFinish, setUBoxDateOfFinish] = useState('');
  const [uBoxShowAdvanced, setUBoxShowAdvanced] = useState(false);
  const [uBoxFluteExtraPercent, setUBoxFluteExtraPercent] = useState('45');
  const [uBoxGsmFlute, setUBoxGsmFlute] = useState('150');
  const [uBoxGsmPacking, setUBoxGsmPacking] = useState('150');
  const [uBoxQtyData, setUBoxQtyData] = useState('2');
  const [uBoxReelSizePlus, setUBoxReelSizePlus] = useState('');
  const [uBoxReelSizeMinus, setUBoxReelSizeMinus] = useState('');
  const [uBoxCutSizePlus, setUBoxCutSizePlus] = useState('');
  const [uBoxCutSizeMinus, setUBoxCutSizeMinus] = useState('');
  const [uBoxFlabL, setUBoxFlabL] = useState('0');
  const [uBoxFlabW, setUBoxFlabW] = useState('0');
  const [uBoxReelMultiplier, setUBoxReelMultiplier] = useState(1);
  const [uBoxCutMultiplier, setUBoxCutMultiplier] = useState(1);
  const [uBoxResults, setUBoxResults] = useState(null);
  const [uBoxSaving, setUBoxSaving] = useState(false);
  const [uBoxSavedSuccess, setUBoxSavedSuccess] = useState(false);
  const [uBoxError, setUBoxError] = useState('');
  const [uBoxProductionFile, setUBoxProductionFile] = useState('');
  const [uBoxNewFileName, setUBoxNewFileName] = useState('');
  const [uBoxShowNewFileInput, setUBoxShowNewFileInput] = useState(false);

  // ─── Universal Type Calculation State (no price fields) ──────────────────────
  const [uTypeCompanyId, setUTypeCompanyId] = useState('');
  const [uTypeSizes, setUTypeSizes] = useState([]);
  const [uTypeSizeId, setUTypeSizeId] = useState('');
  const [uTypeQty, setUTypeQty] = useState('100');
  const [uTypePlyType, setUTypePlyType] = useState('5');
  const [uTypePackingOption, setUTypePackingOption] = useState('N');
  const [uTypeLinerOption, setUTypeLinerOption] = useState('G/N');
  const [uTypeHasPacking, setUTypeHasPacking] = useState(true);
  const [uTypeGsmPaper, setUTypeGsmPaper] = useState('150');
  const [uTypeBf, setUTypeBf] = useState('16');
  const [uTypeCustomerName, setUTypeCustomerName] = useState('');
  const [uTypeDateOfFinish, setUTypeDateOfFinish] = useState('');
  const [uTypeShowAdvanced, setUTypeShowAdvanced] = useState(false);
  const [uTypeFluteExtraPercent, setUTypeFluteExtraPercent] = useState('45');
  const [uTypeGsmFlute, setUTypeGsmFlute] = useState('150');
  const [uTypeGsmPacking, setUTypeGsmPacking] = useState('150');
  const [uTypeQtyData, setUTypeQtyData] = useState('2');
  const [uTypeReelSizePlus, setUTypeReelSizePlus] = useState('');
  const [uTypeReelSizeMinus, setUTypeReelSizeMinus] = useState('');
  const [uTypeCutSizePlus, setUTypeCutSizePlus] = useState('');
  const [uTypeCutSizeMinus, setUTypeCutSizeMinus] = useState('');
  const [uTypeReelMultiplier, setUTypeReelMultiplier] = useState(1);
  const [uTypeCutMultiplier, setUTypeCutMultiplier] = useState(1);
  const [uTypeResults, setUTypeResults] = useState(null);
  const [uTypeSaving, setUTypeSaving] = useState(false);
  const [uTypeSavedSuccess, setUTypeSavedSuccess] = useState(false);
  const [uTypeError, setUTypeError] = useState('');
  const [uTypeProductionFile, setUTypeProductionFile] = useState('');
  const [uTypeNewFileName, setUTypeNewFileName] = useState('');
  const [uTypeShowNewFileInput, setUTypeShowNewFileInput] = useState(false);

  // ─── Full Closing Box Calculation State (no price fields) ───────────────────
  const [fcBoxCompanyId, setFcBoxCompanyId] = useState('');
  const [fcBoxSizes, setFcBoxSizes] = useState([]);
  const [fcBoxSizeId, setFcBoxSizeId] = useState('');
  const [fcBoxQtyBoxes, setFcBoxQtyBoxes] = useState('100');
  const [fcBoxPlyType, setFcBoxPlyType] = useState('5');
  const [fcBoxPackingOption, setFcBoxPackingOption] = useState('N');
  const [fcBoxLinerOption, setFcBoxLinerOption] = useState('G/N');
  const [fcBoxHasPacking, setFcBoxHasPacking] = useState(true);
  const [fcBoxGsmPaper, setFcBoxGsmPaper] = useState('150');
  const [fcBoxBf, setFcBoxBf] = useState('16');
  const [fcBoxCustomerName, setFcBoxCustomerName] = useState('');
  const [fcBoxDateOfFinish, setFcBoxDateOfFinish] = useState('');
  const [fcBoxShowAdvanced, setFcBoxShowAdvanced] = useState(false);
  const [fcBoxFluteExtraPercent, setFcBoxFluteExtraPercent] = useState('45');
  const [fcBoxGsmFlute, setFcBoxGsmFlute] = useState('150');
  const [fcBoxGsmPacking, setFcBoxGsmPacking] = useState('150');
  const [fcBoxQtyData, setFcBoxQtyData] = useState('2');
  const [fcBoxReelSizePlus, setFcBoxReelSizePlus] = useState('');
  const [fcBoxReelSizeMinus, setFcBoxReelSizeMinus] = useState('');
  const [fcBoxCutSizePlus, setFcBoxCutSizePlus] = useState('');
  const [fcBoxCutSizeMinus, setFcBoxCutSizeMinus] = useState('');
  const [fcBoxReelMultiplier, setFcBoxReelMultiplier] = useState(1);
  const [fcBoxCutMultiplier, setFcBoxCutMultiplier] = useState(1);
  const [fcBoxResults, setFcBoxResults] = useState(null);
  const [fcBoxSaving, setFcBoxSaving] = useState(false);
  const [fcBoxSavedSuccess, setFcBoxSavedSuccess] = useState(false);
  const [fcBoxError, setFcBoxError] = useState('');
  const [fcBoxShowSizeDropdown, setFcBoxShowSizeDropdown] = useState(false);
  const [fcBoxProductionFile, setFcBoxProductionFile] = useState('');
  const [fcBoxNewFileName, setFcBoxNewFileName] = useState('');
  const [fcBoxShowNewFileInput, setFcBoxShowNewFileInput] = useState(false);

  // Fetch companies initially
  useEffect(() => {
    async function getCompanies() {
      try {
        const res = await authenticatedFetch('/api/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
          if (data.length > 0 && !editId) {
            const getFirstVal = (type) => {
              const filtered = filterCompaniesForType(data, type);
              return filtered.length > 0 ? filtered[0].id : data[0].id;
            };
            setCompanyId(getFirstVal('box')); // box
            setPadCompanyId(getFirstVal('pad'));
            setPartitionCompanyId(getFirstVal('partition'));
            setTrayCompanyId(getFirstVal('tray'));
            setSleaveCompanyId(getFirstVal('sleave'));
            setCollerBoxCompanyId(getFirstVal('coller_box'));
            setUBoxCompanyId(getFirstVal('top_side_tray'));
            setUTypeCompanyId(getFirstVal('universal'));
            setFcBoxCompanyId(getFirstVal('full_closing'));
          }
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    }
    getCompanies();
  }, [editId]);

  // Fetch existing production file names
  const fetchProductionFiles = async (selectFile = null) => {
    try {
      const res = await authenticatedFetch('/api/customers/files?type=production');
      if (res.ok) {
        const filesData = await res.json();
        if (Array.isArray(filesData)) {
          setExistingFiles(filesData);
          const defaultFile = filesData.length > 0 ? filesData[0] : '';
          const targetFile = selectFile || defaultFile;
          if (targetFile) {
            setProductionFile(prev => selectFile || prev || targetFile);
            setPadProductionFile(prev => selectFile || prev || targetFile);
            setPartitionProductionFile(prev => selectFile || prev || targetFile);
            setTrayProductionFile(prev => selectFile || prev || targetFile);
            setSleaveProductionFile(prev => selectFile || prev || targetFile);
            setCollerBoxProductionFile(prev => selectFile || prev || targetFile);
            setUBoxProductionFile(prev => selectFile || prev || targetFile);
            setUTypeProductionFile(prev => selectFile || prev || targetFile);
            setFcBoxProductionFile(prev => selectFile || prev || targetFile);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  useEffect(() => {
    fetchProductionFiles();
  }, []);

  const checkDuplicateProductionFile = (showNewInput, fileName, setError) => {
    if (!showNewInput || !fileName) return false;
    const clean = fileName.trim().toLowerCase();
    const isDup = existingFiles.some(f => (f || '').trim().toLowerCase() === clean);
    if (isDup) {
      const msg = `Production file "${fileName.trim()}" already exists in Production! Please select it from the dropdown or enter a different file name.`;
      if (setError) setError(msg);
      showToast && showToast(msg, 'error');
    }
    return isDup;
  };

  useEffect(() => {
    if (!editId) return;
    async function loadProductionOrderToEdit() {
      try {
        const res = await authenticatedFetch(`/api/customers/${editId}`);
        if (res.ok) {
          const item = await res.json();
          if (item.company_id) {
            setLoadedSizeId(item.size_id);
            setEditingId(item.id);
            
            let parsed = {};
            try {
              parsed = JSON.parse(item.customer_name) || {};
            } catch (e) {}

            const calcType = (item.company_sizes && item.company_sizes.calc_type) || item.calc_type || '';

            let activeAcc = 'box';
            if (item.is_pad || parsed.isPad || calcType === 'pad') activeAcc = 'pad';
            else if (item.is_partition || parsed.isPartition || calcType === 'partition') activeAcc = 'partition';
            else if (item.is_tray || parsed.isTray || calcType === 'tray') activeAcc = 'tray';
            else if (item.is_sleave || parsed.isSleave || calcType === 'sleave') activeAcc = 'sleave';
            else if (item.is_coller_box || parsed.isCollerBox || calcType === 'coller_box' || calcType === 'coller') activeAcc = 'coller';
            else if (item.is_top_side_tray_box || parsed.isTopSideTrayBox || calcType === 'top_side_tray_box' || calcType === 'top_side_tray') activeAcc = 'topSideTray';
            else if (item.is_universal_type || parsed.isUniversalType || calcType === 'universal' || calcType === 'universal_type') activeAcc = 'universal';
            else if (item.is_full_closing_box || parsed.isFullClosingBox || calcType === 'full_closing' || calcType === 'full_closing_box') activeAcc = 'fullClosing';

            setEditingType(activeAcc);
            setActiveAccordion(activeAcc);
            window.history.replaceState(null, '', '/production');

            const hasVal = (v) => v !== undefined && v !== null;
            const populateAdjust = (val, setPlus, setMinus) => {
              const num = parseFloat(val);
              if (isNaN(num) || num === 0) {
                setPlus('');
                setMinus('');
              } else if (num > 0) {
                setPlus(String(num));
                setMinus('');
              } else {
                setPlus('');
                setMinus(String(Math.abs(num)));
              }
            };

            const getCleanRefName = (itemRecord, parsedObj) => {
              let candidate = (parsedObj && typeof parsedObj.ref === 'string' && parsedObj.ref.trim()) ? parsedObj.ref : (itemRecord.ref_name || '');
              if (!candidate || typeof candidate !== 'string') return '';
              let clean = candidate.replace(/^\[Meta:.*?\]\s*/s, '');
              clean = clean.replace(/\[FinishDate:.*?\]/gi, '');
              return clean.trim();
            };

            const finishDateVal = parsed.dateOfFinish || item.date_of_finish || '';

            // Populate active accordion specific states
            if (activeAcc === 'box') {
              setCompanyId(item.company_id);
              setDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setQtyBoxes(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setReelSizePlus, setReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setCutSizePlus, setCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setPackingOption(pOpt);
                setHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setProductionFile(parsed.productionFile);
            } else if (activeAcc === 'pad') {
              setPadCompanyId(item.company_id);
              setPadDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setPadQtyPads(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setPadPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setPadFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setPadGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setPadGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setPadGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setPadBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setPadQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setPadReelSizePlus, setPadReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setPadCutSizePlus, setPadCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setPadPackingOption(pOpt);
                setPadHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setPadLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setPadCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setPadReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setPadCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setPadProductionFile(parsed.productionFile);
            } else if (activeAcc === 'partition') {
              setPartitionCompanyId(item.company_id);
              setPartitionDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setPartitionQtyPads(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setPartitionPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setPartitionFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setPartitionGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setPartitionGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setPartitionGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setPartitionBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) {
                setPartitionQtyData(item.quantity_of_data);
                setPartitionSet(item.quantity_of_data);
              }
              populateAdjust(item.reel_size_adjust, setPartitionReelSizePlus, setPartitionReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setPartitionCutSizePlus, setPartitionCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setPartitionPackingOption(pOpt);
                setPartitionHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setPartitionLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setPartitionCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setPartitionReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setPartitionCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setPartitionProductionFile(parsed.productionFile);
              if (hasVal(parsed.set)) setPartitionSet(parsed.set);
            } else if (activeAcc === 'tray') {
              setTrayCompanyId(item.company_id);
              setTrayDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setTrayQtyTrays(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setTrayPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setTrayFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setTrayGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setTrayGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setTrayGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setTrayBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setTrayQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setTrayReelSizePlus, setTrayReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setTrayCutSizePlus, setTrayCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setTrayPackingOption(pOpt);
                setTrayHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setTrayLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setTrayCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setTrayReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setTrayCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setTrayProductionFile(parsed.productionFile);
            } else if (activeAcc === 'sleave') {
              setSleaveCompanyId(item.company_id);
              setSleaveDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setSleaveQty(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setSleavePlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setSleaveFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setSleaveGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setSleaveGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setSleaveGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setSleaveBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setSleaveQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setSleaveReelSizePlus, setSleaveReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setSleaveCutSizePlus, setSleaveCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setSleavePackingOption(pOpt);
                setSleaveHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setSleaveLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setSleaveCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setSleaveReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setSleaveCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setSleaveProductionFile(parsed.productionFile);
              if (hasVal(parsed.flabL)) setSleaveFlabL(parsed.flabL);
              if (hasVal(parsed.flabW)) setSleaveFlabW(parsed.flabW);
            } else if (activeAcc === 'coller') {
              setCollerBoxCompanyId(item.company_id);
              setCollerBoxDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setCollerBoxQty(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setCollerBoxPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setCollerBoxFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setCollerBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setCollerBoxGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setCollerBoxGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setCollerBoxBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setCollerBoxQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setCollerBoxReelSizePlus, setCollerBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setCollerBoxCutSizePlus, setCollerBoxCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setCollerBoxPackingOption(pOpt);
                setCollerBoxHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setCollerBoxLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setCollerBoxCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setCollerBoxReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setCollerBoxCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setCollerBoxProductionFile(parsed.productionFile);
              if (hasVal(parsed.flabL)) setCollerBoxFlabL(parsed.flabL);
              if (hasVal(parsed.flabW)) setCollerBoxFlabW(parsed.flabW);
            } else if (activeAcc === 'topSideTray') {
              setUBoxCompanyId(item.company_id);
              setUBoxDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setUBoxQty(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setUBoxPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setUBoxFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setUBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setUBoxGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setUBoxGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setUBoxBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setUBoxQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setUBoxReelSizePlus, setUBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setUBoxCutSizePlus, setUBoxCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setUBoxPackingOption(pOpt);
                setUBoxHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setUBoxLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setUBoxCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setUBoxReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setUBoxCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setUBoxProductionFile(parsed.productionFile);
              if (hasVal(parsed.flabL)) setUBoxFlabL(parsed.flabL);
              if (hasVal(parsed.flabW)) setUBoxFlabW(parsed.flabW);
            } else if (activeAcc === 'universal') {
              setUTypeCompanyId(item.company_id);
              setUTypeDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setUTypeQty(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setUTypePlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setUTypeFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setUTypeGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setUTypeGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setUTypeGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setUTypeBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setUTypeQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setUTypeReelSizePlus, setUTypeReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setUTypeCutSizePlus, setUTypeCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setUTypePackingOption(pOpt);
                setUTypeHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setUTypeLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setUTypeCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setUTypeReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setUTypeCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setUTypeProductionFile(parsed.productionFile);
            } else if (activeAcc === 'fullClosing') {
              setFcBoxCompanyId(item.company_id);
              setFcBoxDateOfFinish(finishDateVal);
              if (hasVal(item.quantity_of_boxes)) setFcBoxQtyBoxes(item.quantity_of_boxes);
              if (hasVal(item.ply_type)) setFcBoxPlyType(String(item.ply_type));
              if (hasVal(item.flute_extra_percent)) setFcBoxFluteExtraPercent(item.flute_extra_percent);
              if (hasVal(item.gsm_paper) || hasVal(item.gsm)) setFcBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (hasVal(item.gsm_flute)) setFcBoxGsmFlute(String(item.gsm_flute));
              if (hasVal(item.gsm_packing)) setFcBoxGsmPacking(String(item.gsm_packing));
              if (hasVal(item.bf)) setFcBoxBf(String(item.bf));
              if (hasVal(item.quantity_of_data)) setFcBoxQtyData(item.quantity_of_data);
              populateAdjust(item.reel_size_adjust, setFcBoxReelSizePlus, setFcBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setFcBoxCutSizePlus, setFcBoxCutSizeMinus);
              const pOpt = item.p_option || parsed.pOption;
              if (pOpt) {
                setFcBoxPackingOption(pOpt);
                setFcBoxHasPacking(pOpt !== '-');
              }
              const lOpt = item.l_option || parsed.lOption;
              if (lOpt) setFcBoxLinerOption(lOpt);
              const refVal = getCleanRefName(item, parsed);
              if (refVal) setFcBoxCustomerName(refVal);
              if (hasVal(parsed.reelMultiplier)) setFcBoxReelMultiplier(parsed.reelMultiplier);
              if (hasVal(parsed.cutMultiplier)) setFcBoxCutMultiplier(parsed.cutMultiplier);
              if (parsed.productionFile) setFcBoxProductionFile(parsed.productionFile);
            }

            // Auto-open active accordion and smooth scroll to card
            setActiveAccordion(activeAcc);
            setTimeout(() => {
              const el = document.getElementById(activeAcc);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 250);
          }
        }
      } catch (err) {
        console.error('Error fetching edit production order:', err);
      }
    }
    loadProductionOrderToEdit();
  }, [editId]);

  // Fetch sizes when selected company changes
  useEffect(() => {
    if (!companyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${companyId}/sizes?calc_type=box`);
        if (res.ok) {
          const data = await res.json();
          setSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setSizeId(loadedSizeId);
            if (editingType === 'box') setLoadedSizeId(null);
          } else {
            setSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching sizes:', err);
      }
    }
    getSizes();
  }, [companyId]);

  // Sync advanced GSM settings with main GSM when main GSM changes
  useEffect(() => { setGsmFlute(gsmPaper); setGsmPacking(gsmPaper); }, [gsmPaper]);

  // Note: Box packing paper & liner options are now independently selectable (N/G toggle in form)

  // Fetch Pad sizes when padCompanyId changes
  useEffect(() => {
    if (!padCompanyId) return;
    async function getPadSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${padCompanyId}/sizes?calc_type=pad`);
        if (res.ok) {
          const data = await res.json();
          setPadSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setPadSizeId(loadedSizeId);
            if (editingType === 'pad') setLoadedSizeId(null);
          } else {
            setPadSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching pad sizes:', err);
      }
    }
    getPadSizes();
  }, [padCompanyId]);

  // Sync pad GSM flute/packing with pad GSM paper
  useEffect(() => { setPadGsmFlute(padGsmPaper); setPadGsmPacking(padGsmPaper); }, [padGsmPaper]);

  // Fetch Partition sizes when partitionCompanyId changes
  useEffect(() => {
    if (!partitionCompanyId) return;
    async function getPartitionSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${partitionCompanyId}/sizes?calc_type=partition`);
        if (res.ok) {
          const data = await res.json();
          setPartitionSizes(data);
          
          const groups = {};
          const singles = [];
          data.forEach(s => {
            if (s.pair_group != null) {
              if (!groups[s.pair_group]) groups[s.pair_group] = [];
              groups[s.pair_group].push(s);
            } else {
              singles.push({ type: 'single', size: s, id: s.id });
            }
          });
          const grouped = [];
          Object.keys(groups).forEach(pg => {
            const pair = groups[pg];
            if (pair.length === 2) {
              grouped.push({ type: 'paired', id: `pair_${pg}`, first: pair[0], second: pair[1], label: `${pair[0].label} (Slot ${pair[0].slot_count}) + ${pair[1].label} (Slot ${pair[1].slot_count})` });
            } else {
              pair.forEach(s => singles.push({ type: 'single', size: s, id: s.id }));
            }
          });
          const allOptions = [...grouped, ...singles];
          setPartitionGroupedSizes(allOptions);
          
          if (loadedSizeId) {
            const foundPaired = allOptions.find(opt => opt.type === 'paired' && (String(opt.first?.id) === String(loadedSizeId) || String(opt.second?.id) === String(loadedSizeId)));
            if (foundPaired) {
              setPartitionSizeId(foundPaired.id);
            } else {
              setPartitionSizeId(loadedSizeId);
            }
            setLoadedSizeId(null);
          } else {
            setPartitionSizeId(prev => {
              if (!prev && allOptions.length > 0) return allOptions[0].id;
              const match = allOptions.find(s => 
                String(s.id) === String(prev) || 
                (s.type === 'paired' && (String(s.first?.id) === String(prev) || String(s.second?.id) === String(prev)))
              );
              return match ? match.id : (allOptions.length > 0 ? allOptions[0].id : '');
            });
          }
        }
      } catch (err) {
        console.error('Error fetching partition sizes:', err);
      }
    }
    getPartitionSizes();
  }, [partitionCompanyId]);

  // Sync partition GSM flute/packing with partition GSM paper
  useEffect(() => { setPartitionGsmFlute(partitionGsmPaper); setPartitionGsmPacking(partitionGsmPaper); }, [partitionGsmPaper]);


  // Fetch Tray sizes when trayCompanyId changes
  useEffect(() => {
    if (!trayCompanyId) return;
    async function getTraySizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${trayCompanyId}/sizes?calc_type=tray`);
        if (res.ok) {
          const data = await res.json();
          setTraySizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setTraySizeId(loadedSizeId);
            if (editingType === 'tray') setLoadedSizeId(null);
          } else {
            setTraySizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching tray sizes:', err);
      }
    }
    getTraySizes();
  }, [trayCompanyId]);

  // Sync tray GSM flute/packing with tray GSM paper
  useEffect(() => { setTrayGsmFlute(trayGsmPaper); setTrayGsmPacking(trayGsmPaper); }, [trayGsmPaper]);

  // Sync sleave GSM flute/packing with sleave GSM paper
  useEffect(() => { setSleaveGsmFlute(sleaveGsmPaper); setSleaveGsmPacking(sleaveGsmPaper); }, [sleaveGsmPaper]);

  // Sync collerBox GSM flute/packing with collerBox GSM paper
  useEffect(() => { setCollerBoxGsmFlute(collerBoxGsmPaper); setCollerBoxGsmPacking(collerBoxGsmPaper); }, [collerBoxGsmPaper]);

  // Sync topSideTrayBox GSM flute/packing with topSideTrayBox GSM paper
  useEffect(() => { setUBoxGsmFlute(uBoxGsmPaper); setUBoxGsmPacking(uBoxGsmPaper); }, [uBoxGsmPaper]);

  // Fetch Sleave sizes when sleaveCompanyId changes
  useEffect(() => {
    if (!sleaveCompanyId) return;
    async function getSleaveSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${sleaveCompanyId}/sizes?calc_type=sleave`);
        if (res.ok) {
          const data = await res.json();
          setSleaveSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setSleaveSizeId(loadedSizeId);
            if (editingType === 'sleave') setLoadedSizeId(null);
          } else {
            setSleaveSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching sleave sizes:', err);
      }
    }
    getSleaveSizes();
  }, [sleaveCompanyId]);

  // Fetch Coller Box sizes when collerBoxCompanyId changes
  useEffect(() => {
    if (!collerBoxCompanyId) return;
    async function getCollerBoxSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${collerBoxCompanyId}/sizes?calc_type=coller_box`);
        if (res.ok) {
          const data = await res.json();
          setCollerBoxSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setCollerBoxSizeId(loadedSizeId);
            if (editingType === 'coller' || editingType === 'coller_box') setLoadedSizeId(null);
          } else {
            setCollerBoxSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching coller box sizes:', err);
      }
    }
    getCollerBoxSizes();
  }, [collerBoxCompanyId]);

  // Fetch Top Side Tray Box sizes when uBoxCompanyId changes
  useEffect(() => {
    if (!uBoxCompanyId) return;
    async function getUBoxSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${uBoxCompanyId}/sizes?calc_type=top_side_tray`);
        if (res.ok) {
          const data = await res.json();
          setUBoxSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setUBoxSizeId(loadedSizeId);
            if (editingType === 'topSideTray' || editingType === 'top_side_tray_box') setLoadedSizeId(null);
          } else {
            setUBoxSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching top side tray box sizes:', err);
      }
    }
    getUBoxSizes();
  }, [uBoxCompanyId]);

  // Fetch Universal Type sizes when uTypeCompanyId changes
  useEffect(() => {
    if (!uTypeCompanyId) return;
    async function getUTypeSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${uTypeCompanyId}/sizes?calc_type=universal`);
        if (res.ok) {
          const data = await res.json();
          setUTypeSizes(data);
          if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) {
            setUTypeSizeId(loadedSizeId);
            if (editingType === 'universal') setLoadedSizeId(null);
          } else {
            setUTypeSizeId(prev => (prev && data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
          }
        }
      } catch (err) {
        console.error('Error fetching universal type sizes:', err);
      }
    }
    getUTypeSizes();
  }, [uTypeCompanyId]);

  // Sync uType GSM flute/packing with uType GSM paper
  useEffect(() => { setUTypeGsmFlute(uTypeGsmPaper); setUTypeGsmPacking(uTypeGsmPaper); }, [uTypeGsmPaper]);
    // Pad live calculation
  useEffect(() => {
    if (!padSizeId || !padQtyPads || !padPlyType) { setPadResults(null); return; }
    const selectedSize = padSizes.find(s => s.id === padSizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(padReelSizePlus, 0) - parseNumeric(padReelSizeMinus, 0);
      const netCut = parseNumeric(padCutSizePlus, 0) - parseNumeric(padCutSizeMinus, 0);
      const computed = calculatePadPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        qtyPads: Number(padQtyPads), plyType: Number(padPlyType),
        fluteExtraPercent: Number(padFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(padQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(padGsmPaper), gsmFlute: Number(padGsmFlute), gsmPacking: padHasPacking ? Number(padGsmPacking) : 0
      });
      setPadResults({
        ...computed,
        padPackingPaperCount: padHasPacking ? Number(padQtyPads) * 1 : 0,
        padLinerCount: Number(padQtyPads) * ((Number(padPlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Pad calculation error:', e); setPadResults(null); }
  }, [padSizeId, padSizes, padQtyPads, padPlyType, padFluteExtraPercent, padQtyData, padReelSizePlus, padReelSizeMinus, padCutSizePlus, padCutSizeMinus, padGsmPaper, padGsmFlute, padGsmPacking, padHasPacking]);

  // Partition live calculation
  useEffect(() => {
    if (!partitionSizeId || !partitionQtyPads || !partitionPlyType) { setPartitionResults(null); return; }
    const selectedOption = partitionGroupedSizes.find(s => s.id === partitionSizeId);
    if (!selectedOption) { setPartitionResults(null); return; }
    try {
      const netReel = parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0);
      const netCut = parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0);
      if (selectedOption.type === 'paired') {
        const computed = calculatePairedPartitionPricing({
          first: { L: convertToInches(selectedOption.first.length_inches, selectedOption.first.unit), W: convertToInches(selectedOption.first.width_inches, selectedOption.first.unit), slotCount: selectedOption.first.slot_count || 1 },
          second: { L: convertToInches(selectedOption.second.length_inches, selectedOption.second.unit), W: convertToInches(selectedOption.second.width_inches, selectedOption.second.unit), slotCount: selectedOption.second.slot_count || 1 },
          set: Number(partitionSet), qtyPads: Number(partitionQtyPads), plyType: Number(partitionPlyType),
          fluteExtraPercent: Number(partitionFluteExtraPercent), pricePerKg: 0, gstPercent: 0,
          reelSizeAdjust: netReel,
          cutSizeAdjust: netCut,
          gsmPaper: Number(partitionGsmPaper), gsmFlute: Number(partitionGsmFlute), gsmPacking: partitionHasPacking ? Number(partitionGsmPacking) : 0
        });
        setPartitionResults({ ...computed, isPaired: true, padPackingPaperCount: partitionHasPacking ? Number(partitionQtyPads) * 1 : 0, padLinerCount: Number(partitionQtyPads) * ((Number(partitionPlyType) - 1) / 2) });
      } else {
        const selectedSize = selectedOption.size;
        const computed = calculatePartitionPricing({
          L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit),
          qtyPads: Number(partitionQtyPads), plyType: Number(partitionPlyType),
          fluteExtraPercent: Number(partitionFluteExtraPercent), pricePerKg: 0,
          qtyData: Number(partitionQtyData), gstPercent: 0,
          reelSizeAdjust: netReel,
          cutSizeAdjust: netCut,
          gsmPaper: Number(partitionGsmPaper), gsmFlute: Number(partitionGsmFlute), gsmPacking: partitionHasPacking ? Number(partitionGsmPacking) : 0
        });
        setPartitionResults({ ...computed, isPaired: false, padPackingPaperCount: partitionHasPacking ? Number(partitionQtyPads) * Number(partitionSet) * 1 : 0, padLinerCount: Number(partitionQtyPads) * Number(partitionSet) * ((Number(partitionPlyType) - 1) / 2), selectedSize });
      }
    } catch (e) { console.error('Partition calculation error:', e); setPartitionResults(null); }
  }, [partitionSizeId, partitionGroupedSizes, partitionQtyPads, partitionPlyType, partitionFluteExtraPercent, partitionQtyData, partitionReelSizePlus, partitionReelSizeMinus, partitionCutSizePlus, partitionCutSizeMinus, partitionGsmPaper, partitionGsmFlute, partitionGsmPacking, partitionHasPacking, partitionSet]);

  // Tray live calculation
  useEffect(() => {
    if (!traySizeId || !trayQtyTrays || !trayPlyType) { setTrayResults(null); return; }
    const selectedSize = traySizes.find(s => s.id === traySizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(trayReelSizePlus, 0) - parseNumeric(trayReelSizeMinus, 0);
      const netCut = parseNumeric(trayCutSizePlus, 0) - parseNumeric(trayCutSizeMinus, 0);
      const computed = calculateTrayPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyTrays: Number(trayQtyTrays), plyType: Number(trayPlyType),
        fluteExtraPercent: Number(trayFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(trayQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(trayGsmPaper), gsmFlute: Number(trayGsmFlute), gsmPacking: trayHasPacking ? Number(trayGsmPacking) : 0
      });
      setTrayResults({
        ...computed,
        trayPackingPaperCount: trayHasPacking ? Number(trayQtyTrays) * 1 : 0,
        trayLinerCount: Number(trayQtyTrays) * ((Number(trayPlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Tray calculation error:', e); setTrayResults(null); }
  }, [traySizeId, traySizes, trayQtyTrays, trayPlyType, trayFluteExtraPercent, trayQtyData, trayReelSizePlus, trayReelSizeMinus, trayCutSizePlus, trayCutSizeMinus, trayGsmPaper, trayGsmFlute, trayGsmPacking, trayHasPacking]);

  // Sleave live calculation
  useEffect(() => {
    if (!sleaveSizeId || !sleaveQty || !sleavePlyType) { setSleaveResults(null); return; }
    const selectedSize = sleaveSizes.find(s => s.id === sleaveSizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(sleaveReelSizePlus, 0) - parseNumeric(sleaveReelSizeMinus, 0);
      const netCut = parseNumeric(sleaveCutSizePlus, 0) - parseNumeric(sleaveCutSizeMinus, 0);
      const computed = calculateSleavePricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: Number(sleaveFlabL), flabW: Number(sleaveFlabW),
        qtyBoxes: Number(sleaveQty), plyType: Number(sleavePlyType),
        fluteExtraPercent: Number(sleaveFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(sleaveQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(sleaveGsmPaper), gsmFlute: Number(sleaveGsmFlute), gsmPacking: sleaveHasPacking ? Number(sleaveGsmPacking) : 0
      });
      setSleaveResults({
        ...computed,
        sleaveLengthPackingPaperCount: sleaveHasPacking ? Number(sleaveQty) * 2 * 1 : 0,
        sleaveLengthLinerCount: Number(sleaveQty) * 2 * ((Number(sleavePlyType) - 1) / 2),
        sleaveWidthPackingPaperCount: sleaveHasPacking ? Number(sleaveQty) * 2 * 1 : 0,
        sleaveWidthLinerCount: Number(sleaveQty) * 2 * ((Number(sleavePlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Sleave calculation error:', e); setSleaveResults(null); }
  }, [sleaveSizeId, sleaveSizes, sleaveQty, sleavePlyType, sleaveFluteExtraPercent, sleaveQtyData, sleaveReelSizePlus, sleaveReelSizeMinus, sleaveCutSizePlus, sleaveCutSizeMinus, sleaveFlabL, sleaveFlabW, sleaveGsmPaper, sleaveGsmFlute, sleaveGsmPacking, sleaveHasPacking]);

  // Coller Box live calculation
  useEffect(() => {
    if (!collerBoxSizeId || !collerBoxQty || !collerBoxPlyType) { setCollerBoxResults(null); return; }
    const selectedSize = collerBoxSizes.find(s => s.id === collerBoxSizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(collerBoxReelSizePlus, 0) - parseNumeric(collerBoxReelSizeMinus, 0);
      const netCut = parseNumeric(collerBoxCutSizePlus, 0) - parseNumeric(collerBoxCutSizeMinus, 0);
      const computed = calculateCollerBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: Number(collerBoxFlabL), flabW: Number(collerBoxFlabW),
        qtyBoxes: Number(collerBoxQty), plyType: Number(collerBoxPlyType),
        fluteExtraPercent: Number(collerBoxFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(collerBoxQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(collerBoxGsmPaper), gsmFlute: Number(collerBoxGsmFlute), gsmPacking: collerBoxHasPacking ? Number(collerBoxGsmPacking) : 0
      });
      setCollerBoxResults({
        ...computed,
        collerBoxLengthPackingPaperCount: collerBoxHasPacking ? Number(collerBoxQty) * 2 * 1 : 0,
        collerBoxLengthLinerCount: Number(collerBoxQty) * 2 * ((Number(collerBoxPlyType) - 1) / 2),
        collerBoxWidthPackingPaperCount: collerBoxHasPacking ? Number(collerBoxQty) * 2 * 1 : 0,
        collerBoxWidthLinerCount: Number(collerBoxQty) * 2 * ((Number(collerBoxPlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Coller Box calculation error:', e); setCollerBoxResults(null); }
  }, [collerBoxSizeId, collerBoxSizes, collerBoxQty, collerBoxPlyType, collerBoxFluteExtraPercent, collerBoxQtyData, collerBoxReelSizePlus, collerBoxReelSizeMinus, collerBoxCutSizePlus, collerBoxCutSizeMinus, collerBoxFlabL, collerBoxFlabW, collerBoxGsmPaper, collerBoxGsmFlute, collerBoxGsmPacking, collerBoxHasPacking]);

  // Top Side Tray Box live calculation
  useEffect(() => {
    if (!uBoxSizeId || !uBoxQty || !uBoxPlyType) { setUBoxResults(null); return; }
    const selectedSize = uBoxSizes.find(s => s.id === uBoxSizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(uBoxReelSizePlus, 0) - parseNumeric(uBoxReelSizeMinus, 0);
      const netCut = parseNumeric(uBoxCutSizePlus, 0) - parseNumeric(uBoxCutSizeMinus, 0);
      const computed = calculateTopSideTrayBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: Number(uBoxFlabL), flabW: Number(uBoxFlabW),
        qtyBoxes: Number(uBoxQty), plyType: Number(uBoxPlyType),
        fluteExtraPercent: Number(uBoxFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(uBoxQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(uBoxGsmPaper), gsmFlute: Number(uBoxGsmFlute), gsmPacking: uBoxHasPacking ? Number(uBoxGsmPacking) : 0
      });
      setUBoxResults({
        ...computed,
        uBoxLengthPackingPaperCount: uBoxHasPacking ? Number(uBoxQty) * 2 * 1 : 0,
        uBoxLengthLinerCount: Number(uBoxQty) * 2 * ((Number(uBoxPlyType) - 1) / 2),
        uBoxWidthPackingPaperCount: uBoxHasPacking ? Number(uBoxQty) * 2 * 1 : 0,
        uBoxWidthLinerCount: Number(uBoxQty) * 2 * ((Number(uBoxPlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Top Side Tray Box calculation error:', e); setUBoxResults(null); }
  }, [uBoxSizeId, uBoxSizes, uBoxQty, uBoxPlyType, uBoxFluteExtraPercent, uBoxQtyData, uBoxReelSizePlus, uBoxReelSizeMinus, uBoxCutSizePlus, uBoxCutSizeMinus, uBoxFlabL, uBoxFlabW, uBoxGsmPaper, uBoxGsmFlute, uBoxGsmPacking, uBoxHasPacking]);

  // Universal Type live calculation
  useEffect(() => {
    if (!uTypeSizeId || !uTypeQty || !uTypePlyType) { setUTypeResults(null); return; }
    const selectedSize = uTypeSizes.find(s => s.id === uTypeSizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(uTypeReelSizePlus, 0) - parseNumeric(uTypeReelSizeMinus, 0);
      const netCut = parseNumeric(uTypeCutSizePlus, 0) - parseNumeric(uTypeCutSizeMinus, 0);
      const computed = calculateUniversalTypePricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: Number(uTypeQty), plyType: Number(uTypePlyType),
        fluteExtraPercent: Number(uTypeFluteExtraPercent), pricePerKg: 0,
        qtyData: Number(uTypeQtyData), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: Number(uTypeGsmPaper), gsmFlute: Number(uTypeGsmFlute), gsmPacking: uTypeHasPacking ? Number(uTypeGsmPacking) : 0
      });
      setUTypeResults({
        ...computed,
        topPackingPaperCount: uTypeHasPacking ? Number(uTypeQty) * 1 : 0,
        topLinerCount: Number(uTypeQty) * ((Number(uTypePlyType) - 1) / 2),
        bottomPackingPaperCount: uTypeHasPacking ? Number(uTypeQty) * 1 : 0,
        bottomLinerCount: Number(uTypeQty) * ((Number(uTypePlyType) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Universal Type calculation error:', e); setUTypeResults(null); }
  }, [uTypeSizeId, uTypeSizes, uTypeQty, uTypePlyType, uTypeFluteExtraPercent, uTypeQtyData, uTypeReelSizePlus, uTypeReelSizeMinus, uTypeCutSizePlus, uTypeCutSizeMinus, uTypeGsmPaper, uTypeGsmFlute, uTypeGsmPacking, uTypeHasPacking]);

  // Fetch Full Closing Box sizes when fcBoxCompanyId changes
  useEffect(() => {
    if (!fcBoxCompanyId) return;
    async function getFcBoxSizes() {
      try {
        let res = await authenticatedFetch(`/api/companies/${fcBoxCompanyId}/sizes?calc_type=full_closing`);
        let data = [];
        if (res.ok) {
          data = await res.json();
        }
        if (!Array.isArray(data) || data.length === 0) {
          res = await authenticatedFetch(`/api/companies/${fcBoxCompanyId}/sizes?calc_type=box`);
          if (res.ok) {
            data = await res.json();
          }
        }
        setFcBoxSizes(data || []);
        if (loadedSizeId && (data || []).some(s => String(s.id) === String(loadedSizeId))) {
          setFcBoxSizeId(loadedSizeId);
          if (editingType === 'fullClosing') setLoadedSizeId(null);
        } else {
          setFcBoxSizeId(prev => (prev && (data || []).some(s => String(s.id) === String(prev)) ? prev : (data && data.length > 0 ? data[0].id : '')));
        }
      } catch (err) {
        console.error('Error fetching full closing box sizes:', err);
      }
    }
    getFcBoxSizes();
  }, [fcBoxCompanyId]);

  // Sync advanced GSM settings with main GSM when main GSM changes
  useEffect(() => {
    setFcBoxGsmFlute(fcBoxGsmPaper);
    setFcBoxGsmPacking(fcBoxGsmPaper);
  }, [fcBoxGsmPaper]);

  // Run full closing box calculation effect when inputs change
  useEffect(() => {
    if (!fcBoxSizeId || !fcBoxQtyBoxes || parseNumeric(fcBoxQtyBoxes, 0) <= 0 || !fcBoxPlyType) { setFcBoxResults(null); return; }
    const selectedSize = fcBoxSizes.find(s => String(s.id) === String(fcBoxSizeId) || s.id === fcBoxSizeId);
    if (!selectedSize) { setFcBoxResults(null); return; }
    try {
      const netReel = parseNumeric(fcBoxReelSizePlus, 0) - parseNumeric(fcBoxReelSizeMinus, 0);
      const netCut = parseNumeric(fcBoxCutSizePlus, 0) - parseNumeric(fcBoxCutSizeMinus, 0);
      const computed = calculateFullClosingBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: parseNumeric(fcBoxQtyBoxes, 0), plyType: parseNumeric(fcBoxPlyType, 5),
        fluteExtraPercent: parseNumeric(fcBoxFluteExtraPercent, 45), pricePerKg: 0,
        qtyData: parseNumeric(fcBoxQtyData, 2), gstPercent: 0,
        reelSizeAdjust: netReel,
        cutSizeAdjust: netCut,
        gsmPaper: parseNumeric(fcBoxGsmPaper, 150), gsmFlute: parseNumeric(fcBoxGsmFlute, 150), gsmPacking: fcBoxHasPacking ? parseNumeric(fcBoxGsmPacking, 150) : 0
      });
      setFcBoxResults({
        ...computed,
        packingPaperCount: fcBoxHasPacking ? parseNumeric(fcBoxQtyBoxes, 0) * 1 : 0,
        linerCount: parseNumeric(fcBoxQtyBoxes, 0) * ((parseNumeric(fcBoxPlyType, 5) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Full Closing Box calculation error:', e); setFcBoxResults(null); }
  }, [fcBoxSizeId, fcBoxSizes, fcBoxQtyBoxes, fcBoxPlyType, fcBoxFluteExtraPercent, fcBoxQtyData, fcBoxReelSizePlus, fcBoxReelSizeMinus, fcBoxCutSizePlus, fcBoxCutSizeMinus, fcBoxGsmPaper, fcBoxGsmFlute, fcBoxGsmPacking, fcBoxHasPacking]);

  const handleFcBoxSave = async (e, isSaveAsNew = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setFcBoxError('');
    try {
      if (!fcBoxResults) { setFcBoxError('Please fill in all details to generate a valid full closing box calculation.'); return; }
      const finalFileName = fcBoxShowNewFileInput ? fcBoxNewFileName.trim() : fcBoxProductionFile;
      if (!finalFileName) {
        setFcBoxError('Please select a file or create a new file.');
        showToast && showToast('Please select a file or create a new file', 'error');
        return;
      }
      if (checkDuplicateProductionFile(fcBoxShowNewFileInput, fcBoxNewFileName, setFcBoxError)) return;
      setFcBoxSaving(true);
      const netReelFc = parseNumeric(fcBoxReelSizePlus, 0) - parseNumeric(fcBoxReelSizeMinus, 0);
      const netCutFc = parseNumeric(fcBoxCutSizePlus, 0) - parseNumeric(fcBoxCutSizeMinus, 0);
      const namePayload = JSON.stringify({ pOption: fcBoxHasPacking ? fcBoxPackingOption : '-', lOption: fcBoxLinerOption, ref: fcBoxCustomerName || 'Full Closing Box Production', reelMultiplier: fcBoxReelMultiplier, cutMultiplier: fcBoxCutMultiplier, sizeMultiplier: fcBoxReelMultiplier * fcBoxCutMultiplier, productionFile: finalFileName, isFullClosingBox: true, dateOfFinish: fcBoxDateOfFinish || '' });
      const payload = {
        company_id: fcBoxCompanyId, size_id: fcBoxSizeId, customer_name: namePayload,
        quantity_of_boxes: Number(fcBoxQtyBoxes), ply_type: Number(fcBoxPlyType), flute_extra_percent: Number(fcBoxFluteExtraPercent),
        price_per_kg: 0, gsm: Number(fcBoxGsmPaper), gsm_paper: Number(fcBoxGsmPaper), gsm_flute: Number(fcBoxGsmFlute), gsm_packing: fcBoxHasPacking ? Number(fcBoxGsmPacking) : 0,
        bf: Number(fcBoxBf), quantity_of_data: Number(fcBoxQtyData), gst_percent: 0,
        reel_size_adjust: netReelFc, cut_size_adjust: netCutFc,
        reel_size: fcBoxResults.reelSize * fcBoxReelMultiplier, cut_size: fcBoxResults.cutSize * fcBoxCutMultiplier,
        paper: fcBoxResults.paper, flute: fcBoxResults.flute, weight_per_unit: fcBoxResults.weightPerUnit, box_weight: fcBoxResults.boxWeight,
        single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
      };
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'full_closing' || editingType === 'fullClosing' || editingType === 'full_closing_box');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setFcBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setFcBoxShowNewFileInput(false);
        setFcBoxNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Full closing box production order updated successfully!' : (isSaveAsNew ? 'New full closing box copy saved successfully!' : 'Full closing box production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setFcBoxError(errData.message || 'Error saving full closing box production calculation.'); }
    } catch (err) {
      console.error('Error saving full closing box production calculation:', err);
      setFcBoxError('Server connection error. Please try again.');
    }
    finally { setFcBoxSaving(false); }
  };

  // Run box calculation effect when inputs change
  useEffect(() => {
    if (!sizeId || !qtyBoxes || parseNumeric(qtyBoxes, 0) <= 0 || !plyType) { setResults(null); return; }
    const selectedSize = sizes.find(s => s.id === sizeId);
    if (!selectedSize) return;
    try {
      const netReel = parseNumeric(reelSizePlus, 0) - parseNumeric(reelSizeMinus, 0);
      const netCut = parseNumeric(cutSizePlus, 0) - parseNumeric(cutSizeMinus, 0);
      const computed = calculateBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit), W: convertToInches(selectedSize.width_inches, selectedSize.unit), H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: parseNumeric(qtyBoxes, 0), plyType: parseNumeric(plyType, 5),
        fluteExtraPercent: parseNumeric(fluteExtraPercent, 45), pricePerKg: 0,
        qtyData: parseNumeric(qtyData, 2), gstPercent: 0,
        reelSizeAdjust: netReel, cutSizeAdjust: netCut,
        gsmPaper: parseNumeric(gsmPaper, 150), gsmFlute: parseNumeric(gsmFlute, 150), gsmPacking: hasPacking ? parseNumeric(gsmPacking, 150) : 0
      });
      setResults({
        ...computed,
        packingPaperCount: hasPacking ? parseNumeric(qtyBoxes, 0) * 1 : 0,
        linerCount: parseNumeric(qtyBoxes, 0) * ((parseNumeric(plyType, 5) - 1) / 2),
        selectedSize
      });
    } catch (e) { console.error('Calculation error:', e); setResults(null); }
  }, [sizeId, sizes, qtyBoxes, plyType, fluteExtraPercent, qtyData, reelSizePlus, reelSizeMinus, cutSizePlus, cutSizeMinus, gsmPaper, gsmFlute, gsmPacking, hasPacking]);

  const handleSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!results) { setError('Please fill in all details to generate a valid calculation.'); return; }
    const finalFileName = showNewFileInput ? newFileName.trim() : productionFile;
    if (!finalFileName) {
      setError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(showNewFileInput, newFileName, setError)) return;
    setSaving(true); setError('');
    const netReelBox = parseNumeric(reelSizePlus, 0) - parseNumeric(reelSizeMinus, 0);
    const netCutBox = parseNumeric(cutSizePlus, 0) - parseNumeric(cutSizeMinus, 0);
    const namePayload = JSON.stringify({ pOption: hasPacking ? packingOption : '-', lOption: linerOption, ref: customerName || 'Standard Box Production', reelMultiplier, cutMultiplier, sizeMultiplier: reelMultiplier * cutMultiplier, productionFile: finalFileName, dateOfFinish: dateOfFinish || '' });
    const payload = {
      company_id: companyId, size_id: sizeId, customer_name: namePayload,
      quantity_of_boxes: Number(qtyBoxes), ply_type: Number(plyType), flute_extra_percent: Number(fluteExtraPercent),
      price_per_kg: 0, gsm: Number(gsmPaper), gsm_paper: Number(gsmPaper), gsm_flute: Number(gsmFlute), gsm_packing: hasPacking ? Number(gsmPacking) : 0,
      bf: Number(bf), quantity_of_data: Number(qtyData), gst_percent: 0,
      reel_size_adjust: netReelBox, cut_size_adjust: netCutBox,
      reel_size: results.reelSize * reelMultiplier, cut_size: results.cutSize * cutMultiplier,
      paper: results.paper, flute: results.flute, weight_per_unit: results.weightPerUnit, box_weight: results.boxWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'box';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setShowNewFileInput(false);
        setNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast(isEditingThisCard ? 'Production order updated successfully!' : (isSaveAsNew ? 'New production order copy saved successfully!' : 'Production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1200);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Error saving production calculation details.');
        showToast(errData.message || 'Error saving production calculation details.', 'error');
      }
    } catch (err) {
      setError('Server connection error. Please try again.');
      showToast('Server connection error. Please try again.', 'error');
    } finally { setSaving(false); }
  };

  const handlePadSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!padResults) { setPadError('Please fill in all details to generate a valid pad calculation.'); return; }
    const finalFileName = padShowNewFileInput ? padNewFileName.trim() : padProductionFile;
    if (!finalFileName) {
      setPadError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(padShowNewFileInput, padNewFileName, setPadError)) return;
    setPadSaving(true); setPadError('');
    const netReelPad = parseNumeric(padReelSizePlus, 0) - parseNumeric(padReelSizeMinus, 0);
    const netCutPad = parseNumeric(padCutSizePlus, 0) - parseNumeric(padCutSizeMinus, 0);
    const namePayload = JSON.stringify({ pOption: padHasPacking ? padPackingOption : '-', lOption: padLinerOption, ref: padCustomerName || 'Pad Production', reelMultiplier: padReelMultiplier, cutMultiplier: padCutMultiplier, sizeMultiplier: padReelMultiplier * padCutMultiplier, productionFile: finalFileName, isPad: true, dateOfFinish: padDateOfFinish || '', packingPaperCount: padHasPacking ? Number(padQtyPads) : 0 });
    const payload = {
      company_id: padCompanyId, size_id: padSizeId, customer_name: namePayload,
      quantity_of_boxes: Number(padQtyPads), ply_type: Number(padPlyType), flute_extra_percent: Number(padFluteExtraPercent),
      price_per_kg: 0, gsm: Number(padGsmPaper), gsm_paper: Number(padGsmPaper), gsm_flute: Number(padGsmFlute), gsm_packing: padHasPacking ? Number(padGsmPacking) : 0,
      bf: Number(padBf), quantity_of_data: Number(padQtyData), gst_percent: 0,
      reel_size_adjust: netReelPad, cut_size_adjust: netCutPad,
      reel_size: padResults.reelSize * padReelMultiplier, cut_size: padResults.cutSize * padCutMultiplier,
      paper: padResults.paper, flute: padResults.flute, weight_per_unit: padResults.weightPerUnit, box_weight: padResults.padWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'pad';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setPadSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setPadShowNewFileInput(false);
        setPadNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Pad production order updated successfully!' : (isSaveAsNew ? 'New pad copy saved successfully!' : 'Pad production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setPadError(errData.message || 'Error saving pad production calculation.'); }
    } catch (err) { setPadError('Server connection error. Please try again.'); }
    finally { setPadSaving(false); }
  };

  const handlePartitionSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!partitionResults) { setPartitionError('Please fill in all details to generate a valid partition calculation.'); return; }
    const finalFileName = partitionShowNewFileInput ? partitionNewFileName.trim() : partitionProductionFile;
    if (!finalFileName) {
      setPartitionError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(partitionShowNewFileInput, partitionNewFileName, setPartitionError)) return;
    setPartitionSaving(true); setPartitionError('');

    const selectedOption = partitionGroupedSizes.find(s => s.id === partitionSizeId);
    const sizeIdForDb = selectedOption?.type === 'paired' ? selectedOption.first.id : (selectedOption?.size?.id || partitionSizeId);

    const totalMult = partitionReelMultiplier * partitionCutMultiplier;
    const linerPlies = (Number(partitionPlyType) - 1) / 2;

    const metaObj = {
      pOption: partitionHasPacking ? partitionPackingOption : '-',
      lOption: partitionLinerOption,
      ref: partitionCustomerName || 'Partition Production',
      reelMultiplier: partitionReelMultiplier,
      cutMultiplier: partitionCutMultiplier,
      sizeMultiplier: totalMult,
      productionFile: finalFileName,
      isPartition: true,
      set: partitionSet,
      isPaired: partitionResults.isPaired,
      dateOfFinish: partitionDateOfFinish || ''
    };

    if (partitionResults.isPaired) {
      metaObj.p1ReelCut = `${(partitionResults.first.reelSize * partitionReelMultiplier).toFixed(2)} × ${(partitionResults.first.cutSize * partitionCutMultiplier).toFixed(2)}`;
      metaObj.p2ReelCut = `${(partitionResults.second.reelSize * partitionReelMultiplier).toFixed(2)} × ${(partitionResults.second.cutSize * partitionCutMultiplier).toFixed(2)}`;
      
      metaObj.p1Packing = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot)) / totalMult) : 0;
      metaObj.p1Liner = Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot) * linerPlies) / totalMult);
      metaObj.p1DefaultPacking = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.first.usedSlot)) / totalMult) : 0;
      metaObj.p1DefaultLiner = Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.first.usedSlot) * linerPlies) / totalMult);

      metaObj.p2Packing = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot)) / totalMult) : 0;
      metaObj.p2Liner = Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot) * linerPlies) / totalMult);
      metaObj.p2DefaultPacking = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.second.usedSlot)) / totalMult) : 0;
      metaObj.p2DefaultLiner = Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.second.usedSlot) * linerPlies) / totalMult);

      if (selectedOption?.first) {
        const fLIn = convertToInches(selectedOption.first.length_inches, selectedOption.first.unit);
        const fWIn = convertToInches(selectedOption.first.width_inches, selectedOption.first.unit);
        metaObj.p1SizeMM = `${Math.round(fLIn * 25.4)} × ${Math.round(fWIn * 25.4)}`;
        metaObj.p1SizeInch = `${fLIn.toFixed(2)} × ${fWIn.toFixed(2)}`;
      }
      if (selectedOption?.second) {
        const sLIn = convertToInches(selectedOption.second.length_inches, selectedOption.second.unit);
        const sWIn = convertToInches(selectedOption.second.width_inches, selectedOption.second.unit);
        metaObj.p2SizeMM = `${Math.round(sLIn * 25.4)} × ${Math.round(sWIn * 25.4)}`;
        metaObj.p2SizeInch = `${sLIn.toFixed(2)} × ${sWIn.toFixed(2)}`;
      }
    }

    const namePayload = JSON.stringify(metaObj);

    const netReelPart = parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0);
    const netCutPart = parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0);

    let payload;
    if (partitionResults.isPaired) {
      payload = {
        company_id: partitionCompanyId,
        size_id: sizeIdForDb,
        customer_name: namePayload,
        quantity_of_boxes: Number(partitionQtyPads),
        ply_type: Number(partitionPlyType),
        flute_extra_percent: Number(partitionFluteExtraPercent),
        price_per_kg: 0,
        gsm: Number(partitionGsmPaper),
        gsm_paper: Number(partitionGsmPaper),
        gsm_flute: Number(partitionGsmFlute),
        gsm_packing: partitionHasPacking ? Number(partitionGsmPacking) : 0,
        bf: Number(partitionBf),
        quantity_of_data: Number(partitionSet),
        gst_percent: 0,
        reel_size_adjust: netReelPart,
        cut_size_adjust: netCutPart,
        reel_size: partitionResults.first.reelSize * partitionReelMultiplier,
        cut_size: partitionResults.first.cutSize * partitionCutMultiplier,
        paper: partitionResults.paper,
        flute: partitionResults.flute,
        weight_per_unit: partitionResults.first.weightPerUnit + partitionResults.second.weightPerUnit,
        box_weight: partitionResults.first.boxWeight + partitionResults.second.boxWeight,
        single_box_price: 0,
        total_cost: 0,
        gst_amount: 0,
        grand_total: 0
      };
    } else {
      payload = {
        company_id: partitionCompanyId,
        size_id: sizeIdForDb,
        customer_name: namePayload,
        quantity_of_boxes: Number(partitionQtyPads),
        ply_type: Number(partitionPlyType),
        flute_extra_percent: Number(partitionFluteExtraPercent),
        price_per_kg: 0,
        gsm: Number(partitionGsmPaper),
        gsm_paper: Number(partitionGsmPaper),
        gsm_flute: Number(partitionGsmFlute),
        gsm_packing: partitionHasPacking ? Number(partitionGsmPacking) : 0,
        bf: Number(partitionBf),
        quantity_of_data: Number(partitionQtyData),
        gst_percent: 0,
        reel_size_adjust: netReelPart,
        cut_size_adjust: netCutPart,
        reel_size: partitionResults.reelSize * partitionReelMultiplier,
        cut_size: partitionResults.cutSize * partitionCutMultiplier,
        paper: partitionResults.paper,
        flute: partitionResults.flute,
        weight_per_unit: partitionResults.weightPerUnit,
        box_weight: partitionResults.padWeight,
        single_box_price: 0,
        total_cost: 0,
        gst_amount: 0,
        grand_total: 0
      };
    }

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'partition';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setPartitionSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setPartitionShowNewFileInput(false);
        setPartitionNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Partition production order updated successfully!' : (isSaveAsNew ? 'New partition copy saved successfully!' : 'Partition production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      } else {
        const errData = await res.json();
        setPartitionError(errData.message || errData.error || 'Error saving partition production order.');
      }
    } catch (err) {
      setPartitionError('Server connection error. Please try again.');
    } finally {
      setPartitionSaving(false);
    }
  };
  const handleTraySave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!trayResults) { setTrayError('Please fill in all details to generate a valid tray calculation.'); return; }
    const finalFileName = trayShowNewFileInput ? trayNewFileName.trim() : trayProductionFile;
    if (!finalFileName) {
      setTrayError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(trayShowNewFileInput, trayNewFileName, setTrayError)) return;
    setTraySaving(true); setTrayError('');
    const netReelTray = parseNumeric(trayReelSizePlus, 0) - parseNumeric(trayReelSizeMinus, 0);
    const netCutTray = parseNumeric(trayCutSizePlus, 0) - parseNumeric(trayCutSizeMinus, 0);
    const namePayload = JSON.stringify({ pOption: trayHasPacking ? trayPackingOption : '-', lOption: trayLinerOption, ref: trayCustomerName || 'Tray Production', reelMultiplier: trayReelMultiplier, cutMultiplier: trayCutMultiplier, sizeMultiplier: trayReelMultiplier * trayCutMultiplier, productionFile: finalFileName, isTray: true, dateOfFinish: trayDateOfFinish || '' });
    const payload = {
      company_id: trayCompanyId, size_id: traySizeId, customer_name: namePayload,
      quantity_of_boxes: Number(trayQtyTrays), ply_type: Number(trayPlyType), flute_extra_percent: Number(trayFluteExtraPercent),
      price_per_kg: 0, gsm: Number(trayGsmPaper), gsm_paper: Number(trayGsmPaper), gsm_flute: Number(trayGsmFlute), gsm_packing: trayHasPacking ? Number(trayGsmPacking) : 0,
      bf: Number(trayBf), quantity_of_data: Number(trayQtyData), gst_percent: 0,
      reel_size_adjust: netReelTray, cut_size_adjust: netCutTray,
      reel_size: trayResults.reelSize * trayReelMultiplier, cut_size: trayResults.cutSize * trayCutMultiplier,
      paper: trayResults.paper, flute: trayResults.flute, weight_per_unit: trayResults.weightPerUnit, box_weight: trayResults.trayWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'tray';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setTraySavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setTrayShowNewFileInput(false);
        setTrayNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Tray production order updated successfully!' : (isSaveAsNew ? 'New tray copy saved successfully!' : 'Tray production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setTrayError(errData.message || 'Error saving tray production calculation.'); }
    } catch (err) { setTrayError('Server connection error. Please try again.'); }
    finally { setTraySaving(false); }
  };

  const handleSleaveSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!sleaveResults) { setSleaveError('Please fill in all details to generate a valid sleave calculation.'); return; }
    const finalFileName = sleaveShowNewFileInput ? sleaveNewFileName.trim() : sleaveProductionFile;
    if (!finalFileName) {
      setSleaveError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(sleaveShowNewFileInput, sleaveNewFileName, setSleaveError)) return;
    setSleaveSaving(true); setSleaveError('');
    const netReelSlv = parseNumeric(sleaveReelSizePlus, 0) - parseNumeric(sleaveReelSizeMinus, 0);
    const netCutSlv = parseNumeric(sleaveCutSizePlus, 0) - parseNumeric(sleaveCutSizeMinus, 0);
    const lReelCutSlv = `${(sleaveResults.calcHeight * sleaveReelMultiplier).toFixed(2)} × ${(sleaveResults.calcLength * sleaveCutMultiplier).toFixed(2)}`;
    const wReelCutSlv = `${(sleaveResults.calcHeight * sleaveReelMultiplier).toFixed(2)} × ${(sleaveResults.calcWidth * sleaveCutMultiplier).toFixed(2)}`;
    const namePayload = JSON.stringify({ pOption: sleaveHasPacking ? sleavePackingOption : '-', lOption: sleaveLinerOption, ref: sleaveCustomerName || 'Sleave Production', reelMultiplier: sleaveReelMultiplier, cutMultiplier: sleaveCutMultiplier, sizeMultiplier: sleaveReelMultiplier * sleaveCutMultiplier, productionFile: finalFileName, isSleave: true, flabL: sleaveFlabL, flabW: sleaveFlabW, lengthReelCut: lReelCutSlv, widthReelCut: wReelCutSlv, dateOfFinish: sleaveDateOfFinish || '' });
    const payload = {
      company_id: sleaveCompanyId, size_id: sleaveSizeId, customer_name: namePayload,
      quantity_of_boxes: Number(sleaveQty), ply_type: Number(sleavePlyType), flute_extra_percent: Number(sleaveFluteExtraPercent),
      price_per_kg: 0, gsm: Number(sleaveGsmPaper), gsm_paper: Number(sleaveGsmPaper), gsm_flute: Number(sleaveGsmFlute), gsm_packing: sleaveHasPacking ? Number(sleaveGsmPacking) : 0,
      bf: Number(sleaveBf), quantity_of_data: Number(sleaveQtyData), gst_percent: 0,
      reel_size_adjust: netReelSlv, cut_size_adjust: netCutSlv,
      reel_size: sleaveResults.calcHeight * sleaveReelMultiplier, cut_size: sleaveResults.calcLength * sleaveCutMultiplier,
      paper: sleaveResults.paper, flute: sleaveResults.flute, weight_per_unit: sleaveResults.weightPerUnit, box_weight: sleaveResults.sleaveWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'sleave' || editingType === 'tray_box');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setSleaveSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setSleaveShowNewFileInput(false);
        setSleaveNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Sleave production order updated successfully!' : (isSaveAsNew ? 'New sleave copy saved successfully!' : 'Sleave production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setSleaveError(errData.message || 'Error saving sleave production calculation.'); }
    } catch (err) { setSleaveError('Server connection error. Please try again.'); }
    finally { setSleaveSaving(false); }
  };

  const handleCollerBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!collerBoxResults) { setCollerBoxError('Please fill in all details to generate a valid coller box calculation.'); return; }
    const finalFileName = collerBoxShowNewFileInput ? collerBoxNewFileName.trim() : collerBoxProductionFile;
    if (!finalFileName) {
      setCollerBoxError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(collerBoxShowNewFileInput, collerBoxNewFileName, setCollerBoxError)) return;
    setCollerBoxSaving(true); setCollerBoxError('');
    const netReelCol = parseNumeric(collerBoxReelSizePlus, 0) - parseNumeric(collerBoxReelSizeMinus, 0);
    const netCutCol = parseNumeric(collerBoxCutSizePlus, 0) - parseNumeric(collerBoxCutSizeMinus, 0);
    const lReelCutCol = `${(collerBoxResults.calcHeight * collerBoxReelMultiplier).toFixed(2)} × ${(collerBoxResults.calcLength * collerBoxCutMultiplier).toFixed(2)}`;
    const wReelCutCol = `${(collerBoxResults.calcHeight * collerBoxReelMultiplier).toFixed(2)} × ${(collerBoxResults.calcWidth * collerBoxCutMultiplier).toFixed(2)}`;
    const namePayload = JSON.stringify({ pOption: collerBoxHasPacking ? collerBoxPackingOption : '-', lOption: collerBoxLinerOption, ref: collerBoxCustomerName || 'Coller Box Production', reelMultiplier: collerBoxReelMultiplier, cutMultiplier: collerBoxCutMultiplier, sizeMultiplier: collerBoxReelMultiplier * collerBoxCutMultiplier, productionFile: finalFileName, isCollerBox: true, flabL: collerBoxFlabL, flabW: collerBoxFlabW, lengthReelCut: lReelCutCol, widthReelCut: wReelCutCol, dateOfFinish: collerBoxDateOfFinish || '' });
    const payload = {
      company_id: collerBoxCompanyId, size_id: collerBoxSizeId, customer_name: namePayload,
      quantity_of_boxes: Number(collerBoxQty), ply_type: Number(collerBoxPlyType), flute_extra_percent: Number(collerBoxFluteExtraPercent),
      price_per_kg: 0, gsm: Number(collerBoxGsmPaper), gsm_paper: Number(collerBoxGsmPaper), gsm_flute: Number(collerBoxGsmFlute), gsm_packing: collerBoxHasPacking ? Number(collerBoxGsmPacking) : 0,
      bf: Number(collerBoxBf), quantity_of_data: Number(collerBoxQtyData), gst_percent: 0,
      reel_size_adjust: netReelCol, cut_size_adjust: netCutCol,
      reel_size: collerBoxResults.calcHeight * collerBoxReelMultiplier, cut_size: collerBoxResults.calcLength * collerBoxCutMultiplier,
      paper: collerBoxResults.paper, flute: collerBoxResults.flute, weight_per_unit: collerBoxResults.weightPerUnit, box_weight: collerBoxResults.collerBoxWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'coller_box' || editingType === 'coller');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setCollerBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setCollerBoxShowNewFileInput(false);
        setCollerBoxNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Coller box production order updated successfully!' : (isSaveAsNew ? 'New coller box copy saved successfully!' : 'Coller box production order saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setCollerBoxError(errData.message || 'Error saving coller box production calculation.'); }
    } catch (err) { setCollerBoxError('Server connection error. Please try again.'); }
    finally { setCollerBoxSaving(false); }
  };

  const handleTopSideTrayBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!uBoxResults) { setUBoxError('Please fill in all details to generate a valid top side tray box calculation.'); return; }
    const finalFileName = uBoxShowNewFileInput ? uBoxNewFileName.trim() : uBoxProductionFile;
    if (!finalFileName) {
      setUBoxError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(uBoxShowNewFileInput, uBoxNewFileName, setUBoxError)) return;
    setUBoxSaving(true); setUBoxError('');
    const netReelUBox = parseNumeric(uBoxReelSizePlus, 0) - parseNumeric(uBoxReelSizeMinus, 0);
    const netCutUBox = parseNumeric(uBoxCutSizePlus, 0) - parseNumeric(uBoxCutSizeMinus, 0);
    const lReelCutUBox = `${(uBoxResults.calcHeight * uBoxReelMultiplier).toFixed(2)} × ${(uBoxResults.calcLength * uBoxCutMultiplier).toFixed(2)}`;
    const wReelCutUBox = `${(uBoxResults.calcHeight * uBoxReelMultiplier).toFixed(2)} × ${(uBoxResults.calcWidth * uBoxCutMultiplier).toFixed(2)}`;
    const namePayload = JSON.stringify({ pOption: uBoxHasPacking ? uBoxPackingOption : '-', lOption: uBoxLinerOption, ref: uBoxCustomerName || 'Top Side Tray Box Production', reelMultiplier: uBoxReelMultiplier, cutMultiplier: uBoxCutMultiplier, sizeMultiplier: uBoxReelMultiplier * uBoxCutMultiplier, productionFile: finalFileName, isTopSideTrayBox: true, flabL: uBoxFlabL, flabW: uBoxFlabW, lengthReelCut: lReelCutUBox, widthReelCut: wReelCutUBox, dateOfFinish: uBoxDateOfFinish || '' });
    const payload = {
      company_id: uBoxCompanyId, size_id: uBoxSizeId, customer_name: namePayload,
      quantity_of_boxes: Number(uBoxQty), ply_type: Number(uBoxPlyType), flute_extra_percent: Number(uBoxFluteExtraPercent),
      price_per_kg: 0, gsm: Number(uBoxGsmPaper), gsm_paper: Number(uBoxGsmPaper), gsm_flute: Number(uBoxGsmFlute), gsm_packing: uBoxHasPacking ? Number(uBoxGsmPacking) : 0,
      bf: Number(uBoxBf), quantity_of_data: Number(uBoxQtyData), gst_percent: 0,
      reel_size_adjust: netReelUBox, cut_size_adjust: netCutUBox,
      reel_size: uBoxResults.calcHeight * uBoxReelMultiplier, cut_size: uBoxResults.calcLength * uBoxCutMultiplier,
      paper: uBoxResults.paper, flute: uBoxResults.flute, weight_per_unit: uBoxResults.weightPerUnit, box_weight: uBoxResults.topSideTrayBoxWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'top_side_tray_box' || editingType === 'topSideTray' || editingType === 'top_side_tray');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setUBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setUBoxShowNewFileInput(false);
        setUBoxNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Top side tray box updated successfully!' : (isSaveAsNew ? 'New top side tray box copy saved successfully!' : 'Top side tray box saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setUBoxError(errData.message || 'Error saving top side tray box production calculation.'); }
    } catch (err) { setUBoxError('Server connection error. Please try again.'); }
    finally { setUBoxSaving(false); }
  };

  const handleUniversalTypeSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!uTypeResults) { setUTypeError('Please fill in all details to generate a valid universal type calculation.'); return; }
    const finalFileName = uTypeShowNewFileInput ? uTypeNewFileName.trim() : uTypeProductionFile;
    if (!finalFileName) {
      setUTypeError('Please select a file or create a new file.');
      showToast && showToast('Please select a file or create a new file', 'error');
      return;
    }
    if (checkDuplicateProductionFile(uTypeShowNewFileInput, uTypeNewFileName, setUTypeError)) return;
    setUTypeSaving(true); setUTypeError('');
    const netReelUType = parseNumeric(uTypeReelSizePlus, 0) - parseNumeric(uTypeReelSizeMinus, 0);
    const netCutUType = parseNumeric(uTypeCutSizePlus, 0) - parseNumeric(uTypeCutSizeMinus, 0);
    const tReelCutUType = `${((uTypeResults.reelSize + 0.5) * uTypeReelMultiplier).toFixed(2)} × ${((uTypeResults.cutSize + 0.5) * uTypeCutMultiplier).toFixed(2)}`;
    const bReelCutUType = `${(uTypeResults.reelSize * uTypeReelMultiplier).toFixed(2)} × ${(uTypeResults.cutSize * uTypeCutMultiplier).toFixed(2)}`;
    const namePayload = JSON.stringify({ pOption: uTypeHasPacking ? uTypePackingOption : '-', lOption: uTypeLinerOption, ref: uTypeCustomerName || 'Universal Type Production', reelMultiplier: uTypeReelMultiplier, cutMultiplier: uTypeCutMultiplier, sizeMultiplier: uTypeReelMultiplier * uTypeCutMultiplier, productionFile: finalFileName, isUniversalType: true, topReelCut: tReelCutUType, bottomReelCut: bReelCutUType, dateOfFinish: uTypeDateOfFinish || '' });
    const payload = {
      company_id: uTypeCompanyId, size_id: uTypeSizeId, customer_name: namePayload,
      quantity_of_boxes: Number(uTypeQty), ply_type: Number(uTypePlyType), flute_extra_percent: Number(uTypeFluteExtraPercent),
      price_per_kg: 0, gsm: Number(uTypeGsmPaper), gsm_paper: Number(uTypeGsmPaper), gsm_flute: Number(uTypeGsmFlute), gsm_packing: uTypeHasPacking ? Number(uTypeGsmPacking) : 0,
      bf: Number(uTypeBf), quantity_of_data: Number(uTypeQtyData), gst_percent: 0,
      reel_size_adjust: netReelUType, cut_size_adjust: netCutUType,
      reel_size: uTypeResults.reelSize * uTypeReelMultiplier, cut_size: uTypeResults.cutSize * uTypeCutMultiplier,
      paper: uTypeResults.paper, flute: uTypeResults.flute, weight_per_unit: uTypeResults.weightPerUnit, box_weight: uTypeResults.universalTypeWeight,
      single_box_price: 0, total_cost: 0, gst_amount: 0, grand_total: 0
    };
    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'universal' || editingType === 'universal_type');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, { method, body: JSON.stringify(payload) });
      if (res.ok) {
        setUTypeSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        setUTypeShowNewFileInput(false);
        setUTypeNewFileName('');
        fetchProductionFiles(finalFileName);
        showToast && showToast(isEditingThisCard ? 'Universal type updated successfully!' : (isSaveAsNew ? 'New universal type copy saved successfully!' : 'Universal type saved successfully!'), 'success');
        setTimeout(() => { navigate('/production-history'); }, 1500);
      }
      else { const errData = await res.json(); setUTypeError(errData.message || 'Error saving universal type production calculation.'); }
    } catch (err) { setUTypeError('Server connection error. Please try again.'); }
    finally { setUTypeSaving(false); }
  };

  return (
    <div className="page-container animate-fade">

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            Production Planner
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure and run materials requirements calculations for cardboard box, full closing box, pad, tray, tray box, and top side tray box orders.
          </p>
        </div>
        <button onClick={() => navigate('/production-history')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s ease' }} className="hover:border-[var(--color-accent)]">
          <History size={18} />
          <span>View History</span>
        </button>
      </div>

      {savedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} /><span>Production Design Saved! Opening Production History...</span>
        </div>
      )}
      {error && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{error}</div>
      )}

      {/* ══════════ BOX SECTION ══════════ */}
      <AccordionCard id="box" label="📦 Standard Box Production" color="var(--color-accent)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleSave} className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>Box Specification Inputs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <SearchableSelect
                  options={filterCompaniesForType(companies, 'box').map(c => ({ value: c.id, label: c.name }))}
                  value={companyId}
                  onChange={val => setCompanyId(val)}
                  placeholder="Select Company..."
                  searchPlaceholder="Search company..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Size Option (L × W × H)</label>
                <SearchableSelect
                  options={sizes.map(s => ({ value: s.id, label: s.label }))}
                  value={sizeId}
                  onChange={val => setSizeId(val)}
                  placeholder="Select Size..."
                  searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                  disabled={sizes.length === 0}
                />
              </div>
              <div className="form-group"><label className="form-label">Quantity of Boxes</label><input type="text" inputMode="numeric" value={qtyBoxes} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setQtyBoxes(val); }} className="form-control" placeholder="e.g. 100" /></div>
              <div className="form-group"><label className="form-label">Ply Type Option</label><select value={plyType} onChange={e => setPlyType(e.target.value)} className="form-control"><option value="3">3 Ply (1 Liner + 1 Packing)</option><option value="5">5 Ply (2 Liner + 1 Packing)</option><option value="7">7 Ply (3 Liner + 1 Packing)</option><option value="9">9 Ply (4 Liner + 1 Packing)</option><option value="11">11 Ply (5 Liner + 1 Packing)</option><option value="13">13 Ply (6 Liner + 1 Packing)</option></select></div>
              <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '4px' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={hasPacking} onChange={e => setHasPacking(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Use Packing Paper</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Uncheck to disable packing paper calculations and sheet counts</span>
              </div>
              <div className="form-group">
                <label className="form-label">Packing Paper Option</label>
                {hasPacking ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['N', 'G'].map(opt => (
                      <button key={opt} type="button" onClick={() => setPackingOption(opt)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: packingOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: packingOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                        Option {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                    No Packing Paper selected (Indicated as 0)
                  </div>
                )}
              </div>
              <div className="form-group"><label className="form-label">Liner Paper Option</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{['G/N', 'G/G', 'N/G', 'N/N'].map(opt => <button key={opt} type="button" onClick={() => setLinerOption(opt)} style={{ flex: '1 1 calc(50% - 4px)', minWidth: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: linerOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: linerOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{opt}</button>)}</div></div>
              <div className="form-group"><label className="form-label">GSM (Paper Thickness)</label><select value={gsmPaper} onChange={e => setGsmPaper(e.target.value)} className="form-control"><option value="100">100 GSM</option><option value="120">120 GSM</option><option value="140">140 GSM</option><option value="150">150 GSM</option><option value="180">180 GSM</option><option value="200">200 GSM</option><option value="220">220 GSM</option></select></div>
              <div className="form-group"><label className="form-label">BF (Burst Factor)</label><select value={bf} onChange={e => setBf(e.target.value)} className="form-control"><option value="12">12 BF</option><option value="14">14 BF</option><option value="16">16 BF</option><option value="18">18 BF</option><option value="20">20 BF</option><option value="22">22 BF</option></select></div>
              <div className="form-group"><label className="form-label">Reel Size (+)</label><input type="text" inputMode="decimal" value={reelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Reel Size (-)</label><input type="text" inputMode="decimal" value={reelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (+)</label><input type="text" inputMode="decimal" value={cutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (-)</label><input type="text" inputMode="decimal" value={cutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!showNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={productionFile} onChange={e => setProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={newFileName} onChange={e => setNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setShowNewFileInput(false); setNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Production Run" value={customerName} onChange={e => setCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={dateOfFinish || ''} onChange={e => setDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculations Parameters</span>{showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {showAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="text" inputMode="decimal" value={fluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="text" inputMode="decimal" value={qtyData} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setQtyData(val); }} className="form-control" placeholder="e.g. 2" /></div></div>)}
            </div>
          {editingId && editingType === 'box' ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleSave(e, false)}
                disabled={saving || !results}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Save size={18} />
                <span>{saving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSave(e, true)}
                disabled={saving || !results}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))',
                  color: 'white',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: saving || !results ? 'not-allowed' : 'pointer',
                  opacity: saving || !results ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <FolderPlus size={18} />
                <span>{saving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={saving || !results} className="btn-primary" style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}><Save size={18} /><span>{saving ? 'Saving...' : 'Save Box & Log to History'}</span></button>
          )}
          </form>

          {/* Box Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Box Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid var(--color-accent)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {results ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Sizing</h3>
                    {renderConvertedSizeDisplay(results.selectedSize, true)}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Size in Inch (Reel × Cut)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                      {(() => {
                        const sizeOptions = [
                          { label: 'Normal (1× Reel, 1× Cut)', reel: 1, cut: 1 },
                          { label: 'Double Reel (2× Reel, 1× Cut)', reel: 2, cut: 1 },
                          { label: 'Triple Reel (3× Reel, 1× Cut)', reel: 3, cut: 1 },
                          { label: 'Double Cut (1× Reel, 2× Cut)', reel: 1, cut: 2 },
                          { label: 'Double Reel & Double Cut (2× Reel, 2× Cut)', reel: 2, cut: 2 },
                          { label: 'Triple Reel & Double Cut (3× Reel, 2× Cut)', reel: 3, cut: 2 },
                        ];
                        const activeOption = sizeOptions.find(opt => opt.reel === reelMultiplier && opt.cut === cutMultiplier) || sizeOptions[0];
                        return (
                          <>
                            <button type="button" onClick={() => setShowSizeDropdown(!showSizeDropdown)} style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', marginBottom: '4px', transition: 'all 0.2s' }}>
                              <span style={{ fontSize: '0.85rem' }}>{activeOption.label.split(' (')[0]}: {(results.reelSize * reelMultiplier).toFixed(2)} × {(results.cutSize * cutMultiplier).toFixed(2)} in</span>
                              {showSizeDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showSizeDropdown && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '8px', backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }} className="animate-fade">
                                {sizeOptions.map(opt => {
                                  const displayReel = (results.reelSize * opt.reel).toFixed(2);
                                  const displayCut = (results.cutSize * opt.cut).toFixed(2);
                                  const isSelected = reelMultiplier === opt.reel && cutMultiplier === opt.cut;
                                  return (
                                    <button key={`${opt.reel}-${opt.cut}`} type="button" onClick={() => { setReelMultiplier(opt.reel); setCutMultiplier(opt.cut); setShowSizeDropdown(false); }} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent', background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)', color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)', transition: 'all 0.2s ease', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{opt.label}</span>
                                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{displayReel} × {displayCut} in</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = reelMultiplier * cutMultiplier; return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper sheets P({hasPacking ? packingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(results.packingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {results.packingPaperCount}</div>}</div>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({linerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(results.linerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {results.linerCount}</div>}</div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{gsmPaper} / {bf}</div></div>
                    <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{plyType} Ply</div></div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options on the left form to calculate production layout values.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ PAD SECTION ══════════ */}
      <AccordionCard id="pad" label="🟦 Pad Production" color="hsl(240, 75%, 65%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {padSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Pad Production Saved! Opening Production History...</span></div>}
        {padError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{padError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handlePadSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(240, 75%, 65%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Pad Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Flat corrugated pad — Length × Width only (no height)</p>
            <ProductionFormFields companies={companies} prefix="Pads" showH={false} calcType="pad"
              state={{ companyId: padCompanyId, sizeId: padSizeId, sizes: padSizes, qty: padQtyPads, plyType: padPlyType, packingOption: padPackingOption, linerOption: padLinerOption, gsmPaper: padGsmPaper, bf: padBf, reelSizePlus: padReelSizePlus, reelSizeMinus: padReelSizeMinus, cutSizePlus: padCutSizePlus, cutSizeMinus: padCutSizeMinus, hasPacking: padHasPacking }}
              setState={{ setCompanyId: setPadCompanyId, setSizeId: setPadSizeId, setQty: setPadQtyPads, setPlyType: setPadPlyType, setPackingOption: setPadPackingOption, setLinerOption: setPadLinerOption, setGsmPaper: setPadGsmPaper, setBf: setPadBf, setReelSizePlus: setPadReelSizePlus, setReelSizeMinus: setPadReelSizeMinus, setCutSizePlus: setPadCutSizePlus, setCutSizeMinus: setPadCutSizeMinus, setHasPacking: setPadHasPacking }}
            />
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!padShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={padProductionFile} onChange={e => setPadProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setPadShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={padNewFileName} onChange={e => setPadNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setPadShowNewFileInput(false); setPadNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Pad Run" value={padCustomerName} onChange={e => setPadCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={padDateOfFinish || ''} onChange={e => setPadDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setPadShowAdvanced(!padShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{padShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {padShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={padFluteExtraPercent} onWheel={e => e.target.blur()} onChange={e => setPadFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={padQtyData} onWheel={e => e.target.blur()} onChange={e => setPadQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && editingType === 'pad' ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handlePadSave(e, false)}
                disabled={padSaving || !padResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(240, 75%, 55%), hsl(260, 75%, 65%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: padSaving || !padResults ? 'not-allowed' : 'pointer', opacity: padSaving || !padResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(100, 100, 240, 0.3)' }}
              >
                <Save size={18} />
                <span>{padSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePadSave(e, true)}
                disabled={padSaving || !padResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: padSaving || !padResults ? 'not-allowed' : 'pointer', opacity: padSaving || !padResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{padSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={padSaving || !padResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(240, 75%, 55%), hsl(260, 75%, 65%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: padSaving || !padResults ? 'not-allowed' : 'pointer', opacity: padSaving || !padResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(100, 100, 240, 0.3)' }}><Save size={18} /><span>{padSaving ? 'Saving...' : 'Save Pad & Log to History'}</span></button>
          )}
          </form>

          {/* Pad Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Pad Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(240, 75%, 65%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {padResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Sizing</h3>
                    {renderConvertedSizeDisplay(padResults.selectedSize, false)}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Size in Inch (Reel × Cut)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={padReelMultiplier} onWheel={e => e.target.blur()} onChange={e => setPadReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={padCutMultiplier} onWheel={e => e.target.blur()} onChange={e => setPadCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result:</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(padResults.reelSize * padReelMultiplier).toFixed(2)} × {(padResults.cutSize * padCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = padReelMultiplier * padCutMultiplier; return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({padHasPacking ? padPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(padResults.padPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {padResults.padPackingPaperCount}</div>}</div>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({padLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(padResults.padLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {padResults.padLinerCount}</div>}</div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{padGsmPaper} / {padBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{padPlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options on the left form to calculate pad layout values.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ PARTITION SECTION ══════════ */}
      <AccordionCard id="partition" label="📦 Partition Production" color="hsl(215, 75%, 60%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {partitionSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Partition Production Saved! Opening Production History...</span></div>}
        {partitionError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{partitionError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handlePartitionSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(215, 75%, 60%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Partition Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Flat corrugated partition — Length × Width only (no height)</p>
            <ProductionFormFields companies={companies} prefix="Partitions" showH={false} calcType="partition"
              state={{ companyId: partitionCompanyId, sizeId: partitionSizeId, sizes: partitionGroupedSizes, qty: partitionQtyPads, set: partitionSet, plyType: partitionPlyType, packingOption: partitionPackingOption, linerOption: partitionLinerOption, gsmPaper: partitionGsmPaper, bf: partitionBf, reelSizePlus: partitionReelSizePlus, reelSizeMinus: partitionReelSizeMinus, cutSizePlus: partitionCutSizePlus, cutSizeMinus: partitionCutSizeMinus, hasPacking: partitionHasPacking }}
              setState={{ setCompanyId: setPartitionCompanyId, setSizeId: setPartitionSizeId, setQty: setPartitionQtyPads, setSet: setPartitionSet, setPlyType: setPartitionPlyType, setPackingOption: setPartitionPackingOption, setLinerOption: setPartitionLinerOption, setGsmPaper: setPartitionGsmPaper, setBf: setPartitionBf, setReelSizePlus: setPartitionReelSizePlus, setReelSizeMinus: setPartitionReelSizeMinus, setCutSizePlus: setPartitionCutSizePlus, setCutSizeMinus: setPartitionCutSizeMinus, setHasPacking: setPartitionHasPacking }}
            />
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!partitionShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={partitionProductionFile} onChange={e => setPartitionProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setPartitionShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={partitionNewFileName} onChange={e => setPartitionNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setPartitionShowNewFileInput(false); setPartitionNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Partition Run" value={partitionCustomerName} onChange={e => setPartitionCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={partitionDateOfFinish || ''} onChange={e => setPartitionDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setPartitionShowAdvanced(!partitionShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{partitionShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {partitionShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={partitionFluteExtraPercent} onChange={e => setPartitionFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={partitionQtyData} onChange={e => setPartitionQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && editingType === 'partition' ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handlePartitionSave(e, false)}
                disabled={partitionSaving || !partitionResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(215, 75%, 50%), hsl(230, 75%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: partitionSaving || !partitionResults ? 'not-allowed' : 'pointer', opacity: partitionSaving || !partitionResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(70, 120, 240, 0.3)' }}
              >
                <Save size={18} />
                <span>{partitionSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handlePartitionSave(e, true)}
                disabled={partitionSaving || !partitionResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: partitionSaving || !partitionResults ? 'not-allowed' : 'pointer', opacity: partitionSaving || !partitionResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{partitionSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={partitionSaving || !partitionResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(215, 75%, 50%), hsl(230, 75%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: partitionSaving || !partitionResults ? 'not-allowed' : 'pointer', opacity: partitionSaving || !partitionResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(70, 120, 240, 0.3)' }}><Save size={18} /><span>{partitionSaving ? 'Saving...' : 'Save Partition & Log to History'}</span></button>
          )}
          </form>

          {/* Partition Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Partition Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(215, 75%, 60%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {partitionResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Sizing</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label>
                        <input type="number" value={partitionReelMultiplier} onChange={e => setPartitionReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label>
                        <input type="number" value={partitionCutMultiplier} onChange={e => setPartitionCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} />
                      </div>
                    </div>

                    {partitionResults.isPaired ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                          const totalMult = partitionReelMultiplier * partitionCutMultiplier;
                          const linerPlies = (Number(partitionPlyType) - 1) / 2;
                          
                          const p1DefPack = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.first.usedSlot)) / totalMult) : 0;
                          const p1DefLiner = Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.first.usedSlot) * linerPlies) / totalMult);
                          const p1TotPack = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot)) / totalMult) : 0;
                          const p1TotLiner = Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot) * linerPlies) / totalMult);

                          const p2DefPack = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.second.usedSlot)) / totalMult) : 0;
                          const p2DefLiner = Math.ceil((Number(partitionQtyPads) * 1 * Number(partitionResults.second.usedSlot) * linerPlies) / totalMult);
                          const p2TotPack = partitionHasPacking ? Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot)) / totalMult) : 0;
                          const p2TotLiner = Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot) * linerPlies) / totalMult);

                          return (
                            <>
                              {/* First Partition Card */}
                              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-accent)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  First Partition — Slot {partitionResults.first?.slotCount} (Uses Slot {partitionResults.first?.usedSlot})
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size in Inches (Reel × Cut):</div>
                                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                  {(partitionResults.first.reelSize * partitionReelMultiplier).toFixed(2)} × {(partitionResults.first.cutSize * partitionCutMultiplier).toFixed(2)} in
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', borderTop: '1px solid rgba(99, 102, 241, 0.1)', paddingTop: '6px' }}>
                                  <div>
                                    Packing: <strong>{p1TotPack}</strong>
                                    {Number(partitionSet) > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(Default: {p1DefPack})</span>}
                                  </div>
                                  <div>
                                    Liner: <strong>{p1TotLiner}</strong>
                                    {Number(partitionSet) > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(Default: {p1DefLiner})</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Second Partition Card */}
                              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(38, 92%, 50%)', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Second Partition — Slot {partitionResults.second?.slotCount} (Uses Slot {partitionResults.second?.usedSlot})
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Size in Inches (Reel × Cut):</div>
                                <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                  {(partitionResults.second.reelSize * partitionReelMultiplier).toFixed(2)} × {(partitionResults.second.cutSize * partitionCutMultiplier).toFixed(2)} in
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', borderTop: '1px solid rgba(245, 158, 11, 0.1)', paddingTop: '6px' }}>
                                  <div>
                                    Packing: <strong>{p2TotPack}</strong>
                                    {Number(partitionSet) > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(Default: {p2DefPack})</span>}
                                  </div>
                                  <div>
                                    Liner: <strong>{p2TotLiner}</strong>
                                    {Number(partitionSet) > 1 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>(Default: {p2DefLiner})</span>}
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        {renderConvertedSizeDisplay(partitionResults.selectedSize, false)}
                        <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result:</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(partitionResults.reelSize * partitionReelMultiplier).toFixed(2)} × {(partitionResults.cutSize * partitionCutMultiplier).toFixed(2)} in</span>
                        </div>
                      </>
                    )}
                  </div>

                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = partitionReelMultiplier * partitionCutMultiplier;
                      const packingCount = partitionResults.isPaired 
                        ? (partitionHasPacking ? (Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot)) / totalMultiplier) + Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot)) / totalMultiplier)) : 0)
                        : Math.ceil(partitionResults.padPackingPaperCount / totalMultiplier);
                      
                      const linerCount = partitionResults.isPaired
                        ? (Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.first.usedSlot) * ((Number(partitionPlyType) - 1) / 2)) / totalMultiplier) + Math.ceil((Number(partitionQtyPads) * Number(partitionSet) * Number(partitionResults.second.usedSlot) * ((Number(partitionPlyType) - 1) / 2)) / totalMultiplier))
                        : Math.ceil(partitionResults.padLinerCount / totalMultiplier);

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({partitionHasPacking ? partitionPackingOption : '-'})</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{packingCount.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({partitionLinerOption})</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{linerCount.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{partitionGsmPaper} / {partitionBf}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{partitionPlyType} Ply</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                  <Calculator size={48} />
                  <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options on the left form to calculate partition layout values.</span>
                </div>
              )}
            </div>
          </div>
        </div>


      </AccordionCard>

      {/* ══════════ TRAY SECTION ══════════ */}
      <AccordionCard id="tray" label="🟩 Tray Production" color="hsl(150, 65%, 45%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {traySavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Tray Production Saved! Opening Production History...</span></div>}
        {trayError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{trayError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleTraySave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(150, 65%, 45%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Tray Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Corrugated tray — uses L × W × H dimensions</p>
            <ProductionFormFields companies={companies} prefix="Trays" showH={true} calcType="tray"
              state={{ companyId: trayCompanyId, sizeId: traySizeId, sizes: traySizes, qty: trayQtyTrays, plyType: trayPlyType, packingOption: trayPackingOption, linerOption: trayLinerOption, gsmPaper: trayGsmPaper, bf: trayBf, reelSizePlus: trayReelSizePlus, reelSizeMinus: trayReelSizeMinus, cutSizePlus: trayCutSizePlus, cutSizeMinus: trayCutSizeMinus, hasPacking: trayHasPacking }}
              setState={{ setCompanyId: setTrayCompanyId, setSizeId: setTraySizeId, setQty: setTrayQtyTrays, setPlyType: setTrayPlyType, setPackingOption: setTrayPackingOption, setLinerOption: setTrayLinerOption, setGsmPaper: setTrayGsmPaper, setBf: setTrayBf, setReelSizePlus: setTrayReelSizePlus, setReelSizeMinus: setTrayReelSizeMinus, setCutSizePlus: setTrayCutSizePlus, setCutSizeMinus: setTrayCutSizeMinus, setHasPacking: setTrayHasPacking }}
            />
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!trayShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={trayProductionFile} onChange={e => setTrayProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setTrayShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(150, 65%, 45%)', background: 'rgba(50, 160, 100, 0.1)', color: 'hsl(150, 65%, 45%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={trayNewFileName} onChange={e => setTrayNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setTrayShowNewFileInput(false); setTrayNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Tray Run" value={trayCustomerName} onChange={e => setTrayCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={trayDateOfFinish || ''} onChange={e => setTrayDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setTrayShowAdvanced(!trayShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{trayShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {trayShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={trayFluteExtraPercent} onChange={e => setTrayFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={trayQtyData} onChange={e => setTrayQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && editingType === 'tray' ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleTraySave(e, false)}
                disabled={traySaving || !trayResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: traySaving || !trayResults ? 'not-allowed' : 'pointer', opacity: traySaving || !trayResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <Save size={18} />
                <span>{traySaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleTraySave(e, true)}
                disabled={traySaving || !trayResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(180, 65%, 40%), hsl(190, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: traySaving || !trayResults ? 'not-allowed' : 'pointer', opacity: traySaving || !trayResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(20, 160, 160, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{traySaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={traySaving || !trayResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: traySaving || !trayResults ? 'not-allowed' : 'pointer', opacity: traySaving || !trayResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}><Save size={18} /><span>{traySaving ? 'Saving...' : 'Save Tray & Log to History'}</span></button>
          )}
          </form>

          {/* Tray Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Tray Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(150, 65%, 45%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {trayResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Sizing</h3>
                    {renderConvertedSizeDisplay(trayResults.selectedSize, true)}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Size in Inch (Reel × Cut)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={trayReelMultiplier} onChange={e => setTrayReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={trayCutMultiplier} onChange={e => setTrayCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result:</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(trayResults.reelSize * trayReelMultiplier).toFixed(2)} × {(trayResults.cutSize * trayCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = trayReelMultiplier * trayCutMultiplier; return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({trayHasPacking ? trayPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(trayResults.trayPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {trayResults.trayPackingPaperCount}</div>}</div>
                          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({trayLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(trayResults.trayLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {trayResults.trayLinerCount}</div>}</div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{trayGsmPaper} / {trayBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{trayPlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options on the left form to calculate tray layout values.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ SLEAVE SECTION ══════════ */}
      <AccordionCard id="sleave" label="🟧 Sleave / Tray Box Production" color="hsl(30, 80%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {sleaveSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Sleave Production Saved! Opening Production History...</span></div>}
        {sleaveError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{sleaveError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleSleaveSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(30, 80%, 55%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Sleave Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Sleave with flab for L &amp; W sides — no price calculation</p>

            {/* Flab Inputs */}
            <div style={{ background: 'rgba(230, 120, 20, 0.08)', border: '1px solid hsl(30, 80%, 55%)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'hsl(30, 80%, 55%)', marginBottom: '10px' }}>📐 Flab Dimensions (Optional — inches)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Length) — in</label>
                  <input type="number" value={sleaveFlabL} onChange={e => setSleaveFlabL(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>L + Flab + 1" waste</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Width) — in</label>
                  <input type="number" value={sleaveFlabW} onChange={e => setSleaveFlabW(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>W + Flab + 1" waste</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <SearchableSelect
                  options={filterCompaniesForType(companies, 'sleave').map(c => ({ value: c.id, label: c.name }))}
                  value={sleaveCompanyId}
                  onChange={val => setSleaveCompanyId(val)}
                  placeholder="Select Company..."
                  searchPlaceholder="Search company..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Size Option (L × W × H)</label>
                <SearchableSelect
                  options={sleaveSizes.map(s => ({ value: s.id, label: s.label }))}
                  value={sleaveSizeId}
                  onChange={val => setSleaveSizeId(val)}
                  placeholder="Select Size..."
                  searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                  disabled={sleaveSizes.length === 0}
                />
              </div>
              <div className="form-group"><label className="form-label">Quantity of Sleaves</label><input type="number" value={sleaveQty} onChange={e => setSleaveQty(Math.max(1, parseInt(e.target.value) || 0))} className="form-control" min="1" /></div>
              <div className="form-group"><label className="form-label">Ply Type Option</label><select value={sleavePlyType} onChange={e => setSleavePlyType(e.target.value)} className="form-control"><option value="3">3 Ply (1 Liner + 1 Packing)</option><option value="5">5 Ply (2 Liner + 1 Packing)</option><option value="7">7 Ply (3 Liner + 1 Packing)</option><option value="9">9 Ply (4 Liner + 1 Packing)</option><option value="11">11 Ply (5 Liner + 1 Packing)</option><option value="13">13 Ply (6 Liner + 1 Packing)</option></select></div>
              <div className="form-group"><label className="form-label">Liner Paper Option</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{['G/N', 'G/G', 'N/G', 'N/N'].map(opt => <button key={opt} type="button" onClick={() => setSleaveLinerOption(opt)} style={{ flex: '1 1 calc(50% - 4px)', minWidth: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: sleaveLinerOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: sleaveLinerOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{opt}</button>)}</div></div>
              <div className="form-group"><label className="form-label">GSM (Paper Thickness)</label><select value={sleaveGsmPaper} onChange={e => setSleaveGsmPaper(e.target.value)} className="form-control"><option value="100">100 GSM</option><option value="120">120 GSM</option><option value="140">140 GSM</option><option value="150">150 GSM</option><option value="180">180 GSM</option><option value="200">200 GSM</option><option value="220">220 GSM</option></select></div>
              <div className="form-group"><label className="form-label">BF (Burst Factor)</label><select value={sleaveBf} onChange={e => setSleaveBf(e.target.value)} className="form-control"><option value="12">12 BF</option><option value="14">14 BF</option><option value="16">16 BF</option><option value="18">18 BF</option><option value="20">20 BF</option><option value="22">22 BF</option></select></div>
              <div className="form-group"><label className="form-label">Reel Size (+)</label><input type="text" inputMode="decimal" value={sleaveReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Reel Size (-)</label><input type="text" inputMode="decimal" value={sleaveReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (+)</label><input type="text" inputMode="decimal" value={sleaveCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (-)</label><input type="text" inputMode="decimal" value={sleaveCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!sleaveShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={sleaveProductionFile} onChange={e => setSleaveProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setSleaveShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(30, 80%, 55%)', background: 'rgba(230, 120, 20, 0.1)', color: 'hsl(30, 80%, 55%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={sleaveNewFileName} onChange={e => setSleaveNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setSleaveShowNewFileInput(false); setSleaveNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Sleave Run" value={sleaveCustomerName} onChange={e => setSleaveCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={sleaveDateOfFinish || ''} onChange={e => setSleaveDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setSleaveShowAdvanced(!sleaveShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{sleaveShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {sleaveShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={sleaveFluteExtraPercent} onChange={e => setSleaveFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={sleaveQtyData} onChange={e => setSleaveQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && (editingType === 'sleave' || editingType === 'tray_box') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleSleaveSave(e, false)}
                disabled={sleaveSaving || !sleaveResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(30, 80%, 50%), hsl(40, 85%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: sleaveSaving || !sleaveResults ? 'not-allowed' : 'pointer', opacity: sleaveSaving || !sleaveResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 120, 20, 0.3)' }}
              >
                <Save size={18} />
                <span>{sleaveSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleSleaveSave(e, true)}
                disabled={sleaveSaving || !sleaveResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: sleaveSaving || !sleaveResults ? 'not-allowed' : 'pointer', opacity: sleaveSaving || !sleaveResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{sleaveSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={sleaveSaving || !sleaveResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(30, 80%, 50%), hsl(40, 85%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: sleaveSaving || !sleaveResults ? 'not-allowed' : 'pointer', opacity: sleaveSaving || !sleaveResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 120, 20, 0.3)' }}><Save size={18} /><span>{sleaveSaving ? 'Saving...' : 'Save Sleave & Log to History'}</span></button>
          )}
          </form>

          {/* Sleave Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Sleave Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(30, 80%, 55%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {sleaveResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(230,120,20,0.08)', border: '1px solid hsl(30,80%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Length</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcLength.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(230,120,20,0.08)', border: '1px solid hsl(30,80%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Width</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcWidth.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(230,120,20,0.08)', border: '1px solid hsl(30,80%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reel H</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcHeight.toFixed(2)}&quot;</div>
                      </div>
                    </div>

                    {/* Reel × Cut result */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Reel × Cut (adjusted)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={sleaveReelMultiplier} onChange={e => setSleaveReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={sleaveCutMultiplier} onChange={e => setSleaveCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Length):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(sleaveResults.calcHeight * sleaveReelMultiplier).toFixed(2)} × {(sleaveResults.calcLength * sleaveCutMultiplier).toFixed(2)} in</span></div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Width):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(sleaveResults.calcHeight * sleaveReelMultiplier).toFixed(2)} × {(sleaveResults.calcWidth * sleaveCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = sleaveReelMultiplier * sleaveCutMultiplier; return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Length Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({sleaveHasPacking ? sleavePackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(sleaveResults.sleaveLengthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {sleaveResults.sleaveLengthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({sleaveLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(sleaveResults.sleaveLengthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {sleaveResults.sleaveLengthLinerCount}</div>}</div>
                          </div>
                          <hr style={{ border: 'none', borderBottom: '1px dashed var(--border-color)', margin: '0' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Width Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({sleaveHasPacking ? sleavePackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(sleaveResults.sleaveWidthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {sleaveResults.sleaveWidthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({sleaveLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(sleaveResults.sleaveWidthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {sleaveResults.sleaveWidthLinerCount}</div>}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{sleaveGsmPaper} / {sleaveBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{sleavePlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options and enter flab values to calculate sleave layout.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ COLLER BOX SECTION ══════════ */}
      <AccordionCard id="coller" label="🟪 Coller Box Production" color="hsl(300, 70%, 50%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {collerBoxSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Coller Box Production Saved! Opening Production History...</span></div>}
        {collerBoxError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{collerBoxError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleCollerBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(300, 70%, 50%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Coller Box Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Coller Box with flab for L &amp; W sides — no price calculation</p>

            {/* Flab Inputs */}
            <div style={{ background: 'rgba(230, 20, 200, 0.08)', border: '1px solid hsl(300, 70%, 50%)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'hsl(300, 70%, 50%)', marginBottom: '10px' }}>📐 Flab Dimensions (Optional — inches)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Length) — in</label>
                  <input type="number" value={collerBoxFlabL} onChange={e => setCollerBoxFlabL(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>L + Flab + 1" waste</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Width) — in</label>
                  <input type="number" value={collerBoxFlabW} onChange={e => setCollerBoxFlabW(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>W + Flab + 1" waste</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <SearchableSelect
                  options={filterCompaniesForType(companies, 'coller_box').map(c => ({ value: c.id, label: c.name }))}
                  value={collerBoxCompanyId}
                  onChange={val => setCollerBoxCompanyId(val)}
                  placeholder="Select Company..."
                  searchPlaceholder="Search company..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Size Option (L × W × H)</label>
                <SearchableSelect
                  options={collerBoxSizes.map(s => ({ value: s.id, label: s.label }))}
                  value={collerBoxSizeId}
                  onChange={val => setCollerBoxSizeId(val)}
                  placeholder="Select Size..."
                  searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                  disabled={collerBoxSizes.length === 0}
                />
              </div>
              <div className="form-group"><label className="form-label">Quantity of Coller Boxes</label><input type="number" value={collerBoxQty} onChange={e => setCollerBoxQty(Math.max(1, parseInt(e.target.value) || 0))} className="form-control" min="1" /></div>
              <div className="form-group"><label className="form-label">Ply Type Option</label><select value={collerBoxPlyType} onChange={e => setCollerBoxPlyType(e.target.value)} className="form-control"><option value="3">3 Ply (1 Liner + 1 Packing)</option><option value="5">5 Ply (2 Liner + 1 Packing)</option><option value="7">7 Ply (3 Liner + 1 Packing)</option><option value="9">9 Ply (4 Liner + 1 Packing)</option><option value="11">11 Ply (5 Liner + 1 Packing)</option><option value="13">13 Ply (6 Liner + 1 Packing)</option></select></div>
              <div className="form-group"><label className="form-label">Liner Paper Option</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{['G/N', 'G/G', 'N/G', 'N/N'].map(opt => <button key={opt} type="button" onClick={() => setCollerBoxLinerOption(opt)} style={{ flex: '1 1 calc(50% - 4px)', minWidth: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: collerBoxLinerOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: collerBoxLinerOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{opt}</button>)}</div></div>
              <div className="form-group"><label className="form-label">GSM (Paper Thickness)</label><select value={collerBoxGsmPaper} onChange={e => setCollerBoxGsmPaper(e.target.value)} className="form-control"><option value="100">100 GSM</option><option value="120">120 GSM</option><option value="140">140 GSM</option><option value="150">150 GSM</option><option value="180">180 GSM</option><option value="200">200 GSM</option><option value="220">220 GSM</option></select></div>
              <div className="form-group"><label className="form-label">BF (Burst Factor)</label><select value={collerBoxBf} onChange={e => setCollerBoxBf(e.target.value)} className="form-control"><option value="12">12 BF</option><option value="14">14 BF</option><option value="16">16 BF</option><option value="18">18 BF</option><option value="20">20 BF</option><option value="22">22 BF</option></select></div>
              <div className="form-group"><label className="form-label">Reel Size (+)</label><input type="text" inputMode="decimal" value={collerBoxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Reel Size (-)</label><input type="text" inputMode="decimal" value={collerBoxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (+)</label><input type="text" inputMode="decimal" value={collerBoxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (-)</label><input type="text" inputMode="decimal" value={collerBoxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!collerBoxShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={collerBoxProductionFile} onChange={e => setCollerBoxProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setCollerBoxShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(300, 70%, 50%)', background: 'rgba(230, 20, 200, 0.1)', color: 'hsl(300, 70%, 50%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={collerBoxNewFileName} onChange={e => setCollerBoxNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setCollerBoxShowNewFileInput(false); setCollerBoxNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Coller Box Run" value={collerBoxCustomerName} onChange={e => setCollerBoxCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={collerBoxDateOfFinish || ''} onChange={e => setCollerBoxDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setCollerBoxShowAdvanced(!collerBoxShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{collerBoxShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {collerBoxShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={collerBoxFluteExtraPercent} onChange={e => setCollerBoxFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={collerBoxQtyData} onChange={e => setCollerBoxQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && (editingType === 'coller_box' || editingType === 'coller') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleCollerBoxSave(e, false)}
                disabled={collerBoxSaving || !collerBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(300, 70%, 40%), hsl(310, 70%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: collerBoxSaving || !collerBoxResults ? 'not-allowed' : 'pointer', opacity: collerBoxSaving || !collerBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 20, 200, 0.3)' }}
              >
                <Save size={18} />
                <span>{collerBoxSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleCollerBoxSave(e, true)}
                disabled={collerBoxSaving || !collerBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: collerBoxSaving || !collerBoxResults ? 'not-allowed' : 'pointer', opacity: collerBoxSaving || !collerBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{collerBoxSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={collerBoxSaving || !collerBoxResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(300, 70%, 40%), hsl(310, 70%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: collerBoxSaving || !collerBoxResults ? 'not-allowed' : 'pointer', opacity: collerBoxSaving || !collerBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 20, 200, 0.3)' }}><Save size={18} /><span>{collerBoxSaving ? 'Saving...' : 'Save Coller Box & Log to History'}</span></button>
          )}
          </form>

          {/* Coller Box Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Coller Box Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(300, 70%, 50%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {collerBoxResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(230,20,200,0.08)', border: '1px solid hsl(300,70%,50%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Length</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcLength.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(230,20,200,0.08)', border: '1px solid hsl(300,70%,50%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Width</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcWidth.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(230,20,200,0.08)', border: '1px solid hsl(300,70%,50%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reel H</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcHeight.toFixed(2)}&quot;</div>
                      </div>
                    </div>

                    {/* Reel × Cut result */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Reel × Cut (adjusted)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={collerBoxReelMultiplier} onChange={e => setCollerBoxReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={collerBoxCutMultiplier} onChange={e => setCollerBoxCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Length):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(collerBoxResults.calcHeight * collerBoxReelMultiplier).toFixed(2)} × {(collerBoxResults.calcLength * collerBoxCutMultiplier).toFixed(2)} in</span></div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Width):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(collerBoxResults.calcHeight * collerBoxReelMultiplier).toFixed(2)} × {(collerBoxResults.calcWidth * collerBoxCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = collerBoxReelMultiplier * collerBoxCutMultiplier; return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Length Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({collerBoxHasPacking ? collerBoxPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(collerBoxResults.collerBoxLengthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {collerBoxResults.collerBoxLengthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({collerBoxLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(collerBoxResults.collerBoxLengthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {collerBoxResults.collerBoxLengthLinerCount}</div>}</div>
                          </div>
                          <hr style={{ border: 'none', borderBottom: '1px dashed var(--border-color)', margin: '0' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Width Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({collerBoxHasPacking ? collerBoxPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(collerBoxResults.collerBoxWidthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {collerBoxResults.collerBoxWidthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({collerBoxLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(collerBoxResults.collerBoxWidthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {collerBoxResults.collerBoxWidthLinerCount}</div>}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{collerBoxGsmPaper} / {collerBoxBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{collerBoxPlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options and enter flab values to calculate coller box layout.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ TOP SIDE TRAY BOX SECTION ══════════ */}
      <AccordionCard id="topSideTray" label="🟪 Top Side Tray Box Production" color="hsl(280, 70%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {uBoxSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Top Side Tray Box Production Saved! Opening Production History...</span></div>}
        {uBoxError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{uBoxError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleTopSideTrayBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(280, 70%, 55%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Top Side Tray Box Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Top Side Tray Box with flab for L & W sides — Reel = H + (W÷2) + 1, no price calculation</p>

            {/* Flab Inputs */}
            <div style={{ background: 'rgba(160, 80, 220, 0.08)', border: '1px solid hsl(280, 70%, 55%)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'hsl(280, 70%, 55%)', marginBottom: '10px' }}>📐 Flab Dimensions (Optional — inches)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Length) — in</label>
                  <input type="number" value={uBoxFlabL} onChange={e => setUBoxFlabL(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>L + Flab + 1" waste</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Flab (Width) — in</label>
                  <input type="number" value={uBoxFlabW} onChange={e => setUBoxFlabW(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.25" min="0" placeholder="0" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '3px' }}>W + Flab + 1" waste</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <SearchableSelect
                  options={filterCompaniesForType(companies, 'top_side_tray').map(c => ({ value: c.id, label: c.name }))}
                  value={uBoxCompanyId}
                  onChange={val => setUBoxCompanyId(val)}
                  placeholder="Select Company..."
                  searchPlaceholder="Search company..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Size Option (L × W × H)</label>
                <SearchableSelect
                  options={uBoxSizes.map(s => ({ value: s.id, label: s.label }))}
                  value={uBoxSizeId}
                  onChange={val => setUBoxSizeId(val)}
                  placeholder="Select Size..."
                  searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                  disabled={uBoxSizes.length === 0}
                />
              </div>
              <div className="form-group"><label className="form-label">Quantity of Top Side Tray Boxes</label><input type="number" value={uBoxQty} onChange={e => setUBoxQty(Math.max(1, parseInt(e.target.value) || 0))} className="form-control" min="1" /></div>
              <div className="form-group"><label className="form-label">Ply Type Option</label><select value={uBoxPlyType} onChange={e => setUBoxPlyType(e.target.value)} className="form-control"><option value="3">3 Ply (1 Liner + 1 Packing)</option><option value="5">5 Ply (2 Liner + 1 Packing)</option><option value="7">7 Ply (3 Liner + 1 Packing)</option><option value="9">9 Ply (4 Liner + 1 Packing)</option><option value="11">11 Ply (5 Liner + 1 Packing)</option><option value="13">13 Ply (6 Liner + 1 Packing)</option></select></div>
              <div className="form-group"><label className="form-label">Liner Paper Option</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{['G/N', 'G/G', 'N/G', 'N/N'].map(opt => <button key={opt} type="button" onClick={() => setUBoxLinerOption(opt)} style={{ flex: '1 1 calc(50% - 4px)', minWidth: '80px', padding: '10px', borderRadius: 'var(--radius-sm)', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: uBoxLinerOption === opt ? 'var(--gradient-accent)' : 'var(--bg-secondary)', color: uBoxLinerOption === opt ? 'white' : 'var(--text-secondary)', transition: 'all 0.2s' }}>{opt}</button>)}</div></div>
              <div className="form-group"><label className="form-label">GSM (Paper Thickness)</label><select value={uBoxGsmPaper} onChange={e => setUBoxGsmPaper(e.target.value)} className="form-control"><option value="100">100 GSM</option><option value="120">120 GSM</option><option value="140">140 GSM</option><option value="150">150 GSM</option><option value="180">180 GSM</option><option value="200">200 GSM</option><option value="220">220 GSM</option></select></div>
              <div className="form-group"><label className="form-label">BF (Burst Factor)</label><select value={uBoxBf} onChange={e => setUBoxBf(e.target.value)} className="form-control"><option value="12">12 BF</option><option value="14">14 BF</option><option value="16">16 BF</option><option value="18">18 BF</option><option value="20">20 BF</option><option value="22">22 BF</option></select></div>
              <div className="form-group"><label className="form-label">Reel Size (+)</label><input type="text" inputMode="decimal" value={uBoxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Reel Size (-)</label><input type="text" inputMode="decimal" value={uBoxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (+)</label><input type="text" inputMode="decimal" value={uBoxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
              <div className="form-group"><label className="form-label">Cut Size (-)</label><input type="text" inputMode="decimal" value={uBoxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!uBoxShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={uBoxProductionFile} onChange={e => setUBoxProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setUBoxShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(280, 70%, 55%)', background: 'rgba(160, 80, 220, 0.1)', color: 'hsl(280, 70%, 55%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={uBoxNewFileName} onChange={e => setUBoxNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setUBoxShowNewFileInput(false); setUBoxNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Top Side Tray Box Run" value={uBoxCustomerName} onChange={e => setUBoxCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={uBoxDateOfFinish || ''} onChange={e => setUBoxDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setUBoxShowAdvanced(!uBoxShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{uBoxShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {uBoxShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={uBoxFluteExtraPercent} onChange={e => setUBoxFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={uBoxQtyData} onChange={e => setUBoxQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && (editingType === 'top_side_tray_box' || editingType === 'topSideTray' || editingType === 'top_side_tray') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleTopSideTrayBoxSave(e, false)}
                disabled={uBoxSaving || !uBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(300, 65%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: uBoxSaving || !uBoxResults ? 'not-allowed' : 'pointer', opacity: uBoxSaving || !uBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(160, 80, 220, 0.3)' }}
              >
                <Save size={18} />
                <span>{uBoxSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleTopSideTrayBoxSave(e, true)}
                disabled={uBoxSaving || !uBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: uBoxSaving || !uBoxResults ? 'not-allowed' : 'pointer', opacity: uBoxSaving || !uBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{uBoxSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={uBoxSaving || !uBoxResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(300, 65%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: uBoxSaving || !uBoxResults ? 'not-allowed' : 'pointer', opacity: uBoxSaving || !uBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(160, 80, 220, 0.3)' }}><Save size={18} /><span>{uBoxSaving ? 'Saving...' : 'Save Top Side Tray Box & Log to History'}</span></button>
          )}
          </form>

          {/* Top Side Tray Box Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Top Side Tray Box Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(280, 70%, 55%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {uBoxResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(160,80,220,0.08)', border: '1px solid hsl(280,70%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Length</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcLength.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(160,80,220,0.08)', border: '1px solid hsl(280,70%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Calc. Width</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcWidth.toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(160,80,220,0.08)', border: '1px solid hsl(280,70%,55%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Reel (H+W÷2+1)</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcHeight.toFixed(2)}&quot;</div>
                      </div>
                    </div>

                    {/* Reel × Cut result */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Reel × Cut (adjusted)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={uBoxReelMultiplier} onChange={e => setUBoxReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={uBoxCutMultiplier} onChange={e => setUBoxCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Length):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(uBoxResults.calcHeight * uBoxReelMultiplier).toFixed(2)} × {(uBoxResults.calcLength * uBoxCutMultiplier).toFixed(2)} in</span></div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Width):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(uBoxResults.calcHeight * uBoxReelMultiplier).toFixed(2)} × {(uBoxResults.calcWidth * uBoxCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = uBoxReelMultiplier * uBoxCutMultiplier; return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Length Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({uBoxHasPacking ? uBoxPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uBoxResults.uBoxLengthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uBoxResults.uBoxLengthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({uBoxLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uBoxResults.uBoxLengthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uBoxResults.uBoxLengthLinerCount}</div>}</div>
                          </div>
                          <hr style={{ border: 'none', borderBottom: '1px dashed var(--border-color)', margin: '0' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Width Sides (2 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({uBoxHasPacking ? uBoxPackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uBoxResults.uBoxWidthPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uBoxResults.uBoxWidthPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({uBoxLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uBoxResults.uBoxWidthLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uBoxResults.uBoxWidthLinerCount}</div>}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{uBoxGsmPaper} / {uBoxBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{uBoxPlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options and enter flab values to calculate top side tray box layout.</span></div>
              )}
            </div>
          </div>
        </div>

      </AccordionCard>

      {/* ══════════ UNIVERSAL TYPE SECTION ══════════ */}
      <AccordionCard id="universal" label="🟦 Universal Type Production" color="hsl(200, 70%, 50%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {uTypeSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Universal Type Production Saved! Opening Production History...</span></div>}
        {uTypeError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{uTypeError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleUniversalTypeSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(200, 70%, 50%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Universal Type Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Universal Type box — Reel = L + 2H + 1, Cut = W + 2H + 1, Top part has +0.5" extra, no price calculation</p>
            <ProductionFormFields
              companies={companies}
              prefix="Universal Type"
              calcType="universal"
              state={{
                companyId: uTypeCompanyId,
                sizeId: uTypeSizeId,
                sizes: uTypeSizes,
                qty: uTypeQty,
                plyType: uTypePlyType,
                packingOption: uTypePackingOption,
                linerOption: uTypeLinerOption,
                gsmPaper: uTypeGsmPaper,
                bf: uTypeBf,
                reelSizePlus: uTypeReelSizePlus,
                reelSizeMinus: uTypeReelSizeMinus,
                cutSizePlus: uTypeCutSizePlus,
                cutSizeMinus: uTypeCutSizeMinus,
                hasPacking: uTypeHasPacking
              }}
              setState={{
                setCompanyId: setUTypeCompanyId,
                setSizeId: setUTypeSizeId,
                setQty: setUTypeQty,
                setPlyType: setUTypePlyType,
                setPackingOption: setUTypePackingOption,
                setLinerOption: setUTypeLinerOption,
                setGsmPaper: setUTypeGsmPaper,
                setBf: setUTypeBf,
                setReelSizePlus: setUTypeReelSizePlus,
                setReelSizeMinus: setUTypeReelSizeMinus,
                setCutSizePlus: setUTypeCutSizePlus,
                setCutSizeMinus: setUTypeCutSizeMinus,
                setHasPacking: setUTypeHasPacking
              }}
              showH={true}
            />
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!uTypeShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={uTypeProductionFile} onChange={e => setUTypeProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setUTypeShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(200, 70%, 50%)', background: 'rgba(40, 140, 200, 0.1)', color: 'hsl(200, 70%, 50%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={uTypeNewFileName} onChange={e => setUTypeNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setUTypeShowNewFileInput(false); setUTypeNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Universal Type Run" value={uTypeCustomerName} onChange={e => setUTypeCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={uTypeDateOfFinish || ''} onChange={e => setUTypeDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setUTypeShowAdvanced(!uTypeShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{uTypeShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {uTypeShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={uTypeFluteExtraPercent} onChange={e => setUTypeFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={uTypeQtyData} onChange={e => setUTypeQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && (editingType === 'universal' || editingType === 'universal_type') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleUniversalTypeSave(e, false)}
                disabled={uTypeSaving || !uTypeResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(200, 70%, 45%), hsl(210, 70%, 55%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: uTypeSaving || !uTypeResults ? 'not-allowed' : 'pointer', opacity: uTypeSaving || !uTypeResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(40, 140, 200, 0.3)' }}
              >
                <Save size={18} />
                <span>{uTypeSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleUniversalTypeSave(e, true)}
                disabled={uTypeSaving || !uTypeResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: uTypeSaving || !uTypeResults ? 'not-allowed' : 'pointer', opacity: uTypeSaving || !uTypeResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{uTypeSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={uTypeSaving || !uTypeResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(200, 70%, 45%), hsl(210, 70%, 55%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: uTypeSaving || !uTypeResults ? 'not-allowed' : 'pointer', opacity: uTypeSaving || !uTypeResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(40, 140, 200, 0.3)' }}><Save size={18} /><span>{uTypeSaving ? 'Saving...' : 'Save Universal Type & Log to History'}</span></button>
          )}
          </form>

          {/* Universal Type Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Universal Type Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(200, 70%, 50%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {uTypeResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(40,140,200,0.08)', border: '1px solid hsl(200,70%,50%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top (with +0.5&quot; extra)</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Reel: {(uTypeResults.reelSize + 0.5).toFixed(2)}&quot;</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Cut: {(uTypeResults.cutSize + 0.5).toFixed(2)}&quot;</div>
                      </div>
                      <div style={{ background: 'rgba(40,140,200,0.08)', border: '1px solid hsl(200,70%,50%)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bottom (raw size)</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Reel: {uTypeResults.reelSize.toFixed(2)}&quot;</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Cut: {uTypeResults.cutSize.toFixed(2)}&quot;</div>
                      </div>
                    </div>

                    {/* Reel × Cut multipliers */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Reel × Cut (adjusted)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reel Multiply</label><input type="number" value={uTypeReelMultiplier} onChange={e => setUTypeReelMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                      <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cut Multiply</label><input type="number" value={uTypeCutMultiplier} onChange={e => setUTypeCutMultiplier(Math.max(1, parseFloat(e.target.value) || 1))} className="form-control" min="1" step="1" style={{ padding: '8px 10px', fontSize: '0.9rem', fontWeight: '700' }} /></div>
                    </div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Top):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{((uTypeResults.reelSize + 0.5) * uTypeReelMultiplier).toFixed(2)} × {((uTypeResults.cutSize + 0.5) * uTypeCutMultiplier).toFixed(2)} in</span></div>
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Result (Bottom):</span><span style={{ fontSize: '1.1rem', fontWeight: '700' }}>{(uTypeResults.reelSize * uTypeReelMultiplier).toFixed(2)} × {(uTypeResults.cutSize * uTypeCutMultiplier).toFixed(2)} in</span></div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = uTypeReelMultiplier * uTypeCutMultiplier; return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Top part (1 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({uTypeHasPacking ? uTypePackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uTypeResults.topPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uTypeResults.topPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({uTypeLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uTypeResults.topLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uTypeResults.topLinerCount}</div>}</div>
                          </div>
                          <hr style={{ border: 'none', borderBottom: '1px dashed var(--border-color)', margin: '0' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '-8px' }}>Bottom part (1 per box)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({uTypeHasPacking ? uTypePackingOption : '-'})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uTypeResults.bottomPackingPaperCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uTypeResults.bottomPackingPaperCount}</div>}</div>
                            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({uTypeLinerOption})</div><div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(uTypeResults.bottomLinerCount / totalMultiplier).toLocaleString()}</div>{totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {uTypeResults.bottomLinerCount}</div>}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{uTypeGsmPaper} / {uTypeBf}</div></div><div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div><div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{uTypePlyType} Ply</div></div></div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options to calculate universal type layout.</span></div>
              )}
            </div>
          </div>
        </div>
      </AccordionCard>

      {/* ══════════ FULL CLOSING BOX SECTION ══════════ */}
      <AccordionCard id="fullClosing" label="🟥 Full Closing Box Production" color="hsl(330, 75%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

        {fcBoxSavedSuccess && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}><CheckCircle2 size={24} /><span>Full Closing Box Production Saved! Opening Production History...</span></div>}
        {fcBoxError && <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>{fcBoxError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">
          <form onSubmit={handleFcBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(330, 75%, 55%)' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Full Closing Box Specification Inputs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Same as standard Box, except using 6-inch waste in reel size calculation.</p>
            <ProductionFormFields
              companies={companies}
              prefix="Boxes"
              calcType="full_closing"
              state={{
                companyId: fcBoxCompanyId,
                sizeId: fcBoxSizeId,
                sizes: fcBoxSizes,
                qty: fcBoxQtyBoxes,
                plyType: fcBoxPlyType,
                packingOption: fcBoxPackingOption,
                linerOption: fcBoxLinerOption,
                gsmPaper: fcBoxGsmPaper,
                bf: fcBoxBf,
                reelSizePlus: fcBoxReelSizePlus,
                reelSizeMinus: fcBoxReelSizeMinus,
                cutSizePlus: fcBoxCutSizePlus,
                cutSizeMinus: fcBoxCutSizeMinus,
                hasPacking: fcBoxHasPacking
              }}
              setState={{
                setCompanyId: setFcBoxCompanyId,
                setSizeId: setFcBoxSizeId,
                setQty: setFcBoxQtyBoxes,
                setPlyType: setFcBoxPlyType,
                setPackingOption: setFcBoxPackingOption,
                setLinerOption: setFcBoxLinerOption,
                setGsmPaper: setFcBoxGsmPaper,
                setBf: setFcBoxBf,
                setReelSizePlus: setFcBoxReelSizePlus,
                setReelSizeMinus: setFcBoxReelSizeMinus,
                setCutSizePlus: setFcBoxCutSizePlus,
                setCutSizeMinus: setFcBoxCutSizeMinus,
                setHasPacking: setFcBoxHasPacking
              }}
              showH={true}
            />
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderOpen size={14} /> Production File</label>
              {!fcBoxShowNewFileInput ? (<div style={{ display: 'flex', gap: '8px' }}><select value={fcBoxProductionFile} onChange={e => setFcBoxProductionFile(e.target.value)} className="form-control" style={{ flex: 1 }}><option value="">-- Select a File --</option>{existingFiles.map(f => <option key={f} value={f}>{f}</option>)}</select><button type="button" onClick={() => setFcBoxShowNewFileInput(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(330, 75%, 55%)', background: 'rgba(236, 72, 153, 0.1)', color: 'hsl(330, 75%, 55%)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}><FolderPlus size={14} /> New</button></div>) : (<div style={{ display: 'flex', gap: '8px' }}><input type="text" placeholder="Enter new file name..." value={fcBoxNewFileName} onChange={e => setFcBoxNewFileName(e.target.value)} className="form-control" style={{ flex: 1 }} autoFocus /><button type="button" onClick={() => { setFcBoxShowNewFileInput(false); setFcBoxNewFileName(''); }} style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Cancel</button></div>)}
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Reference Name (Optional)</label><input type="text" placeholder="e.g. SRI VARI PACKS Full Closing Run" value={fcBoxCustomerName} onChange={e => setFcBoxCustomerName(e.target.value)} className="form-control" /></div>
            <div className="form-group" style={{ marginTop: '16px' }}><label className="form-label">Date of Finish (Optional)</label><input type="date" value={formatToIsoDate(fcBoxDateOfFinish)} onChange={e => setFcBoxDateOfFinish(e.target.value)} className="form-control" /></div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setFcBoxShowAdvanced(!fcBoxShowAdvanced)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', padding: '4px 0', width: '100%', justifyContent: 'space-between' }}><span>Advanced Calculation Parameters</span>{fcBoxShowAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              {fcBoxShowAdvanced && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }} className="form-grid animate-fade"><div className="form-group"><label className="form-label">Flute Extra (%)</label><input type="number" value={fcBoxFluteExtraPercent} onChange={e => setFcBoxFluteExtraPercent(Math.max(0, parseFloat(e.target.value) || 0))} className="form-control" step="0.1" /></div><div className="form-group"><label className="form-label">Quantity Data (Multiplier)</label><input type="number" value={fcBoxQtyData} onChange={e => setFcBoxQtyData(Math.max(0.001, parseFloat(e.target.value) || 0))} className="form-control" step="0.001" /></div></div>)}
            </div>
          {editingId && (editingType === 'full_closing' || editingType === 'fullClosing' || editingType === 'full_closing_box') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleFcBoxSave(e, false)}
                disabled={fcBoxSaving || !fcBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(330, 75%, 50%), hsl(340, 75%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: (fcBoxSaving || !fcBoxResults) ? 'not-allowed' : 'pointer', opacity: (fcBoxSaving || !fcBoxResults) ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)' }}
              >
                <Save size={18} />
                <span>{fcBoxSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleFcBoxSave(e, true)}
                disabled={fcBoxSaving || !fcBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: (fcBoxSaving || !fcBoxResults) ? 'not-allowed' : 'pointer', opacity: (fcBoxSaving || !fcBoxResults) ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{fcBoxSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={fcBoxSaving || !fcBoxResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(330, 75%, 50%), hsl(340, 75%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: (fcBoxSaving || !fcBoxResults) ? 'not-allowed' : 'pointer', opacity: (fcBoxSaving || !fcBoxResults) ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)' }}><Save size={18} /><span>{fcBoxSaving ? 'Saving...' : 'Save Full Closing Box & Log to History'}</span></button>
          )}
          </form>

          {/* Full Closing Box Right: Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Full Closing Box Requirements Summary</h2>
            <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(330, 75%, 55%)', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {fcBoxResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Sizing</h3>
                    {renderConvertedSizeDisplay(fcBoxResults.selectedSize, true)}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Size in Inch (Reel × Cut)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                      {(() => {
                        const sizeOptions = [
                          { label: 'Normal (1× Reel, 1× Cut)', reel: 1, cut: 1 },
                          { label: 'Double Reel (2× Reel, 1× Cut)', reel: 2, cut: 1 },
                          { label: 'Triple Reel (3× Reel, 1× Cut)', reel: 3, cut: 1 },
                          { label: 'Double Cut (1× Reel, 2× Cut)', reel: 1, cut: 2 },
                          { label: 'Double Reel & Double Cut (2× Reel, 2× Cut)', reel: 2, cut: 2 },
                          { label: 'Triple Reel & Double Cut (3× Reel, 2× Cut)', reel: 3, cut: 2 },
                        ];
                        const activeOption = sizeOptions.find(opt => opt.reel === fcBoxReelMultiplier && opt.cut === fcBoxCutMultiplier) || sizeOptions[0];
                        return (
                          <>
                            <button type="button" onClick={() => setFcBoxShowSizeDropdown(!fcBoxShowSizeDropdown)} style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '700', marginBottom: '4px', transition: 'all 0.2s' }}>
                              <span style={{ fontSize: '0.85rem' }}>{activeOption.label.split(' (')[0]}: {(fcBoxResults.reelSize * fcBoxReelMultiplier).toFixed(2)} × {(fcBoxResults.cutSize * fcBoxCutMultiplier).toFixed(2)} in</span>
                              {fcBoxShowSizeDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {fcBoxShowSizeDropdown && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '8px', backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }} className="animate-fade">
                                {sizeOptions.map(opt => {
                                  const displayReel = (fcBoxResults.reelSize * opt.reel).toFixed(2);
                                  const displayCut = (fcBoxResults.cutSize * opt.cut).toFixed(2);
                                  const isSelected = fcBoxReelMultiplier === opt.reel && fcBoxCutMultiplier === opt.cut;
                                  return (
                                    <button key={`${opt.reel}-${opt.cut}`} type="button" onClick={() => { setFcBoxReelMultiplier(opt.reel); setFcBoxCutMultiplier(opt.cut); setFcBoxShowSizeDropdown(false); }} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent', background: isSelected ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-secondary)', color: isSelected ? 'hsl(330, 75%, 55%)' : 'var(--text-primary)', transition: 'all 0.2s ease', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{opt.label}</span>
                                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{displayReel} × {displayCut} in</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div>
                    <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📦 Materials Computation</h3>
                    {(() => {
                      const totalMultiplier = fcBoxReelMultiplier * fcBoxCutMultiplier;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Packing Paper P({fcBoxHasPacking ? fcBoxPackingOption : '-'})</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(fcBoxResults.packingPaperCount / totalMultiplier).toLocaleString()}</div>
                            {totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {fcBoxResults.packingPaperCount}</div>}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liner sheets L({fcBoxLinerOption})</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{Math.ceil(fcBoxResults.linerCount / totalMultiplier).toLocaleString()}</div>
                            {totalMultiplier > 1 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>÷{totalMultiplier} from {fcBoxResults.linerCount}</div>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSM / BF</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fcBoxGsmPaper} / {fcBoxBf}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Ply layers</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fcBoxPlyType} Ply</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}><Calculator size={48} /><span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Select options to calculate full closing box layout.</span></div>
              )}
            </div>
          </div>
        </div>
      </AccordionCard>

      {/* Confirmation Modal for Edit Mode Section Switch */}
      {showCancelEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            border: '1px solid var(--border-color, #e2e8f0)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--text-primary, #1e293b)',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              Active Editing Session
            </h3>
            <p style={{
              color: 'var(--text-secondary, #64748b)',
              textAlign: 'center',
              marginBottom: '24px',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              You are currently editing a calculation. Moving to another section will discard your active edit state. What would you like to do?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleConfirmCancelEdit}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease'
                }}
              >
                Cancel Editing
              </button>
              <button
                type="button"
                onClick={handleKeepEditing}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '600',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

