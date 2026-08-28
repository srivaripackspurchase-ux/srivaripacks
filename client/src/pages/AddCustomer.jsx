import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { calculateBoxPricing, calculatePadPricing, calculatePartitionPricing, calculatePairedPartitionPricing, calculateTrayPricing, calculateSleavePricing, calculateCollerBoxPricing, calculateTopSideTrayBoxPricing, calculateUniversalTypePricing, calculateFullClosingBoxPricing, convertToInches, PLY_CONFIG, PAD_CALC_PREFIX, PARTITION_CALC_PREFIX, TRAY_CALC_PREFIX, SLEAVE_CALC_PREFIX, COLLER_BOX_CALC_PREFIX, TOP_SIDE_TRAY_BOX_CALC_PREFIX, UNIVERSAL_TYPE_CALC_PREFIX, FULL_CLOSING_BOX_CALC_PREFIX } from '../utils/calculations';
import { Save, RefreshCw, Calculator, HelpCircle, CheckCircle2, FolderOpen, FolderPlus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import SearchableSelect from '../components/common/SearchableSelect';

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

const CopyFileSelector = ({ label, selectedFile, setSelectedFile, showNewInput, setShowNewInput, newFileName, setNewFileName, existingFiles }) => {
  const allFiles = [...existingFiles];
  if (selectedFile && !allFiles.includes(selectedFile)) {
    allFiles.push(selectedFile);
    allFiles.sort();
  }

  return (
    <div className="form-group" style={{ marginTop: '0px', minWidth: '0', width: '100%' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FolderOpen size={14} /> {label}
      </label>
      {!showNewInput ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: '0', width: '100%' }}>
          <select
            value={selectedFile}
            onChange={e => setSelectedFile(e.target.value)}
            className="form-control"
            style={{ flex: 1, minWidth: '0', width: '100%' }}
          >
            <option value="">-- Select a File --</option>
            {allFiles.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        <button
          type="button"
          onClick={() => setShowNewInput(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-accent)',
            background: 'rgba(99, 102, 241, 0.1)',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap'
          }}
        >
          <FolderPlus size={14} /> New
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', minWidth: '0', width: '100%' }}>
        <input
          type="text"
          placeholder="Enter new file name..."
          value={newFileName}
          onChange={e => setNewFileName(e.target.value)}
          className="form-control"
          style={{ flex: 1, minWidth: '0', width: '100%' }}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setShowNewInput(false);
            setNewFileName('');
          }}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            whiteSpace: 'nowrap'
          }}
        >
          Cancel
        </button>
      </div>
    )}
  </div>
  );
};

const GsmOptions = () => (
  <>
    <option value="100">100 GSM</option>
    <option value="120">120 GSM</option>
    <option value="140">140 GSM</option>
    <option value="150">150 GSM</option>
    <option value="180">180 GSM</option>
    <option value="200">200 GSM</option>
    <option value="220">220 GSM</option>
  </>
);

const BfOptions = () => (
  <>
    <option value="12">12 BF</option>
    <option value="14">14 BF</option>
    <option value="16">16 BF</option>
    <option value="18">18 BF</option>
    <option value="20">20 BF</option>
    <option value="22">22 BF</option>
  </>
);

const SizeAdjustOptions = () => (
  <>
    <option value="0">None (+0.00)</option>
    <option value="0.25">0.25 in</option>
    <option value="0.5">0.50 in</option>
    <option value="0.75">0.75 in</option>
  </>
);

const AccordionCard = ({ id, label, color = 'var(--color-accent)', activeId, onToggle, children }) => {
  const isOpen = activeId === id;
  return (
    <div id={id} className="glass-panel" style={{ marginBottom: '20px', overflow: 'hidden', borderLeft: `4px solid ${color}`, borderRadius: 'var(--radius-lg)' }}>
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
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

export default function AddCustomer() {
  const { authenticatedFetch } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const editId = searchParams.get('editId');
  const [editingId, setEditingId] = useState(editId);
  const [editingType, setEditingType] = useState(null);
  const [loadedSizeId, setLoadedSizeId] = useState(null);

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

  // ─── Shared list state ─────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [existingCustomerCopyFiles, setExistingCustomerCopyFiles] = useState([]);
  const [existingCompanyCopyFiles, setExistingCompanyCopyFiles] = useState([]);

  // ─── Box Calculation state & Editing Session Protection ──────────────────────
  const [activeAccordion, setActiveAccordion] = useState(null);
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
        setPendingNavigationPath(href || '/customers');
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
  const [boxCompanyId, setBoxCompanyId] = useState('');
  const [boxSizes, setBoxSizes] = useState([]);
  const [boxSizeId, setBoxSizeId] = useState('');
  const [boxQtyBoxes, setBoxQtyBoxes] = useState(150);
  const [boxPlyType, setBoxPlyType] = useState('5');
  const [boxFluteExtraPercent, setBoxFluteExtraPercent] = useState(45);
  const [boxPricePerKg, setBoxPricePerKg] = useState(60);
  const [boxGsmPaper, setBoxGsmPaper] = useState('150');
  const [boxGsmFlute, setBoxGsmFlute] = useState('150');
  const [boxGsmPacking, setBoxGsmPacking] = useState('150');
  const [boxBf, setBoxBf] = useState('16');
  const [boxQtyData, setBoxQtyData] = useState(2);
  const [boxGstPercent, setBoxGstPercent] = useState(18);
  const [boxCustomerCopyFile, setBoxCustomerCopyFile] = useState('');
  const [boxNewCustomerCopyFile, setBoxNewCustomerCopyFile] = useState('');
  const [boxShowNewCustomerCopyInput, setBoxShowNewCustomerCopyInput] = useState(false);
  const [boxCompanyCopyFile, setBoxCompanyCopyFile] = useState('');
  const [boxNewCompanyCopyFile, setBoxNewCompanyCopyFile] = useState('');
  const [boxShowNewCompanyCopyInput, setBoxShowNewCompanyCopyInput] = useState(false);
  const [boxReelSizePlus, setBoxReelSizePlus] = useState('');
  const [boxReelSizeMinus, setBoxReelSizeMinus] = useState('');
  const [boxCutSizePlus, setBoxCutSizePlus] = useState('');
  const [boxCutSizeMinus, setBoxCutSizeMinus] = useState('');
  const [boxResults, setBoxResults] = useState(null);
  const [boxSaving, setBoxSaving] = useState(false);
  const [boxSavedSuccess, setBoxSavedSuccess] = useState(false);
  const [boxError, setBoxError] = useState('');
  const [boxIsDuplex, setBoxIsDuplex] = useState(false);
  const [boxDuplexPrice, setBoxDuplexPrice] = useState(60);
  const [boxIsLaminated, setBoxIsLaminated] = useState(false);
  const [boxLaminationRupees, setBoxLaminationRupees] = useState(0);
  const [boxIsPrintingCharge, setBoxIsPrintingCharge] = useState(false);
  const [boxPrintingLabourCharge, setBoxPrintingLabourCharge] = useState(0);
  const [boxPrintingPlatePrice, setBoxPrintingPlatePrice] = useState(0);
  const [boxPrintingNoOfPlates, setBoxPrintingNoOfPlates] = useState(0);
  const [boxIsInkCost, setBoxIsInkCost] = useState(false);
  const [boxInkPricePerBox, setBoxInkPricePerBox] = useState(0);
  const [boxIsScreenPrinting, setBoxIsScreenPrinting] = useState(false);
  const [boxScreenPrintingPricePerBox, setBoxScreenPrintingPricePerBox] = useState(0);
  const [boxIsCallicoCost, setBoxIsCallicoCost] = useState(false);
  const [boxCallicoPricePerBox, setBoxCallicoPricePerBox] = useState(0);

  // ─── Pad Calculation state ─────────────────────────────────────────────────
  const [padCompanyId, setPadCompanyId] = useState('');
  const [padSizes, setPadSizes] = useState([]);
  const [padSizeId, setPadSizeId] = useState('');
  const [padQtyPads, setPadQtyPads] = useState(150);
  const [padPlyType, setPadPlyType] = useState('5');
  const [padFluteExtraPercent, setPadFluteExtraPercent] = useState(45);
  const [padPricePerKg, setPadPricePerKg] = useState(60);
  const [padGsmPaper, setPadGsmPaper] = useState('150');
  const [padGsmFlute, setPadGsmFlute] = useState('150');
  const [padGsmPacking, setPadGsmPacking] = useState('150');
  const [padBf, setPadBf] = useState('16');
  const [padQtyData, setPadQtyData] = useState(2);
  const [padGstPercent, setPadGstPercent] = useState(18);
  const [padCustomerCopyFile, setPadCustomerCopyFile] = useState('');
  const [padNewCustomerCopyFile, setPadNewCustomerCopyFile] = useState('');
  const [padShowNewCustomerCopyInput, setPadShowNewCustomerCopyInput] = useState(false);
  const [padCompanyCopyFile, setPadCompanyCopyFile] = useState('');
  const [padNewCompanyCopyFile, setPadNewCompanyCopyFile] = useState('');
  const [padShowNewCompanyCopyInput, setPadShowNewCompanyCopyInput] = useState(false);
  const [padReelSizePlus, setPadReelSizePlus] = useState('');
  const [padReelSizeMinus, setPadReelSizeMinus] = useState('');
  const [padCutSizePlus, setPadCutSizePlus] = useState('');
  const [padCutSizeMinus, setPadCutSizeMinus] = useState('');
  const [padResults, setPadResults] = useState(null);
  const [padSaving, setPadSaving] = useState(false);
  const [padSavedSuccess, setPadSavedSuccess] = useState(false);
  const [padError, setPadError] = useState('');

  // ─── Partition Calculation state ────────────────────────────────────────────
  const [partitionCompanyId, setPartitionCompanyId] = useState('');
  const [partitionSizes, setPartitionSizes] = useState([]);
  const [partitionGroupedSizes, setPartitionGroupedSizes] = useState([]); // grouped by pair_group
  const [partitionSizeId, setPartitionSizeId] = useState(''); // for grouped: pair_group id; for single: size id
  const [partitionQtyPads, setPartitionQtyPads] = useState(150);
  const [partitionPlyType, setPartitionPlyType] = useState('5');
  const [partitionFluteExtraPercent, setPartitionFluteExtraPercent] = useState(45);
  const [partitionPricePerKg, setPartitionPricePerKg] = useState(60);
  const [partitionGsmPaper, setPartitionGsmPaper] = useState('150');
  const [partitionGsmFlute, setPartitionGsmFlute] = useState('150');
  const [partitionGsmPacking, setPartitionGsmPacking] = useState('150');
  const [partitionBf, setPartitionBf] = useState('16');
  const [partitionQtyData, setPartitionQtyData] = useState(2);
  const [partitionGstPercent, setPartitionGstPercent] = useState(18);
  const [partitionSet, setPartitionSet] = useState(1);
  const [partitionCustomerCopyFile, setPartitionCustomerCopyFile] = useState('');
  const [partitionNewCustomerCopyFile, setPartitionNewCustomerCopyFile] = useState('');
  const [partitionShowNewCustomerCopyInput, setPartitionShowNewCustomerCopyInput] = useState(false);
  const [partitionCompanyCopyFile, setPartitionCompanyCopyFile] = useState('');
  const [partitionNewCompanyCopyFile, setPartitionNewCompanyCopyFile] = useState('');
  const [partitionShowNewCompanyCopyInput, setPartitionShowNewCompanyCopyInput] = useState(false);
  const [partitionReelSizePlus, setPartitionReelSizePlus] = useState('');
  const [partitionReelSizeMinus, setPartitionReelSizeMinus] = useState('');
  const [partitionCutSizePlus, setPartitionCutSizePlus] = useState('');
  const [partitionCutSizeMinus, setPartitionCutSizeMinus] = useState('');
  const [partitionResults, setPartitionResults] = useState(null);
  const [partitionSaving, setPartitionSaving] = useState(false);
  const [partitionSavedSuccess, setPartitionSavedSuccess] = useState(false);
  const [partitionError, setPartitionError] = useState('');

  // ─── Tray Calculation state ────────────────────────────────────────────────
  const [trayCompanyId, setTrayCompanyId] = useState('');
  const [traySizes, setTraySizes] = useState([]);
  const [traySizeId, setTraySizeId] = useState('');
  const [trayQtyTrays, setTrayQtyTrays] = useState(150);
  const [trayPlyType, setTrayPlyType] = useState('5');
  const [trayFluteExtraPercent, setTrayFluteExtraPercent] = useState(45);
  const [trayPricePerKg, setTrayPricePerKg] = useState(60);
  const [trayGsmPaper, setTrayGsmPaper] = useState('150');
  const [trayGsmFlute, setTrayGsmFlute] = useState('150');
  const [trayGsmPacking, setTrayGsmPacking] = useState('150');
  const [trayBf, setTrayBf] = useState('16');
  const [trayQtyData, setTrayQtyData] = useState(2);
  const [trayGstPercent, setTrayGstPercent] = useState(18);
  const [trayCustomerCopyFile, setTrayCustomerCopyFile] = useState('');
  const [trayNewCustomerCopyFile, setTrayNewCustomerCopyFile] = useState('');
  const [trayShowNewCustomerCopyInput, setTrayShowNewCustomerCopyInput] = useState(false);
  const [trayCompanyCopyFile, setTrayCompanyCopyFile] = useState('');
  const [trayNewCompanyCopyFile, setTrayNewCompanyCopyFile] = useState('');
  const [trayShowNewCompanyCopyInput, setTrayShowNewCompanyCopyInput] = useState(false);
  const [trayReelSizePlus, setTrayReelSizePlus] = useState('');
  const [trayReelSizeMinus, setTrayReelSizeMinus] = useState('');
  const [trayCutSizePlus, setTrayCutSizePlus] = useState('');
  const [trayCutSizeMinus, setTrayCutSizeMinus] = useState('');
  const [trayResults, setTrayResults] = useState(null);
  const [traySaving, setTraySaving] = useState(false);
  const [traySavedSuccess, setTraySavedSuccess] = useState(false);
  const [trayError, setTrayError] = useState('');

  // ─── Sleave Calculation state ────────────────────────────────────────────
  const [sleaveCompanyId, setSleaveCompanyId] = useState('');
  const [sleaveSizes, setSleaveSizes] = useState([]);
  const [sleaveSizeId, setSleaveSizeId] = useState('');
  const [sleaveQty, setSleaveQty] = useState(150);
  const [sleavePlyType, setSleavePlyType] = useState('5');
  const [sleaveFluteExtraPercent, setSleaveFluteExtraPercent] = useState(45);
  const [sleavePricePerKg, setSleavePricePerKg] = useState(60);
  const [sleaveGsmPaper, setSleaveGsmPaper] = useState('150');
  const [sleaveGsmFlute, setSleaveGsmFlute] = useState('150');
  const [sleaveGsmPacking, setSleaveGsmPacking] = useState('150');
  const [sleaveBf, setSleaveBf] = useState('16');
  const [sleaveQtyData, setSleaveQtyData] = useState(2);
  const [sleaveGstPercent, setSleaveGstPercent] = useState(18);
  const [sleaveCustomerCopyFile, setSleaveCustomerCopyFile] = useState('');
  const [sleaveNewCustomerCopyFile, setSleaveNewCustomerCopyFile] = useState('');
  const [sleaveShowNewCustomerCopyInput, setSleaveShowNewCustomerCopyInput] = useState(false);
  const [sleaveCompanyCopyFile, setSleaveCompanyCopyFile] = useState('');
  const [sleaveNewCompanyCopyFile, setSleaveNewCompanyCopyFile] = useState('');
  const [sleaveShowNewCompanyCopyInput, setSleaveShowNewCompanyCopyInput] = useState(false);
  const [sleaveReelSizePlus, setSleaveReelSizePlus] = useState('');
  const [sleaveReelSizeMinus, setSleaveReelSizeMinus] = useState('');
  const [sleaveCutSizePlus, setSleaveCutSizePlus] = useState('');
  const [sleaveCutSizeMinus, setSleaveCutSizeMinus] = useState('');
  const [sleaveFlabL, setSleaveFlabL] = useState(0);
  const [sleaveFlabW, setSleaveFlabW] = useState(0);
  const [sleaveIsScreenPrinting, setSleaveIsScreenPrinting] = useState(false);
  const [sleaveScreenPrintingPricePerBox, setSleaveScreenPrintingPricePerBox] = useState(0);
  const [sleaveIsCallicoCost, setSleaveIsCallicoCost] = useState(false);
  const [sleaveCallicoPricePerBox, setSleaveCallicoPricePerBox] = useState(0);
  const [sleaveResults, setSleaveResults] = useState(null);
  const [sleaveSaving, setSleaveSaving] = useState(false);
  const [sleaveSavedSuccess, setSleaveSavedSuccess] = useState(false);
  const [sleaveError, setSleaveError] = useState('');

  // ─── Coller Box Calculation state ────────────────────────────────────────────
  const [collerBoxCompanyId, setCollerBoxCompanyId] = useState('');
  const [collerBoxSizes, setCollerBoxSizes] = useState([]);
  const [collerBoxSizeId, setCollerBoxSizeId] = useState('');
  const [collerBoxQty, setCollerBoxQty] = useState(150);
  const [collerBoxPlyType, setCollerBoxPlyType] = useState('5');
  const [collerBoxFluteExtraPercent, setCollerBoxFluteExtraPercent] = useState(45);
  const [collerBoxPricePerKg, setCollerBoxPricePerKg] = useState(60);
  const [collerBoxGsmPaper, setCollerBoxGsmPaper] = useState('150');
  const [collerBoxGsmFlute, setCollerBoxGsmFlute] = useState('150');
  const [collerBoxGsmPacking, setCollerBoxGsmPacking] = useState('150');
  const [collerBoxBf, setCollerBoxBf] = useState('16');
  const [collerBoxQtyData, setCollerBoxQtyData] = useState(2);
  const [collerBoxGstPercent, setCollerBoxGstPercent] = useState(18);
  const [collerBoxCustomerCopyFile, setCollerBoxCustomerCopyFile] = useState('');
  const [collerBoxNewCustomerCopyFile, setCollerBoxNewCustomerCopyFile] = useState('');
  const [collerBoxShowNewCustomerCopyInput, setCollerBoxShowNewCustomerCopyInput] = useState(false);
  const [collerBoxCompanyCopyFile, setCollerBoxCompanyCopyFile] = useState('');
  const [collerBoxNewCompanyCopyFile, setCollerBoxNewCompanyCopyFile] = useState('');
  const [collerBoxShowNewCompanyCopyInput, setCollerBoxShowNewCompanyCopyInput] = useState(false);
  const [collerBoxReelSizePlus, setCollerBoxReelSizePlus] = useState('');
  const [collerBoxReelSizeMinus, setCollerBoxReelSizeMinus] = useState('');
  const [collerBoxCutSizePlus, setCollerBoxCutSizePlus] = useState('');
  const [collerBoxCutSizeMinus, setCollerBoxCutSizeMinus] = useState('');
  const [collerBoxFlabL, setCollerBoxFlabL] = useState(0);
  const [collerBoxFlabW, setCollerBoxFlabW] = useState(0);
  const [collerBoxResults, setCollerBoxResults] = useState(null);
  const [collerBoxSaving, setCollerBoxSaving] = useState(false);
  const [collerBoxSavedSuccess, setCollerBoxSavedSuccess] = useState(false);
  const [collerBoxError, setCollerBoxError] = useState('');

  // ─── Top Side Tray Box Calculation state ────────────────────────────────────────
  const [uBoxCompanyId, setUBoxCompanyId] = useState('');
  const [uBoxSizes, setUBoxSizes] = useState([]);
  const [uBoxSizeId, setUBoxSizeId] = useState('');
  const [uBoxQty, setUBoxQty] = useState(150);
  const [uBoxPlyType, setUBoxPlyType] = useState('5');
  const [uBoxFluteExtraPercent, setUBoxFluteExtraPercent] = useState(45);
  const [uBoxPricePerKg, setUBoxPricePerKg] = useState(60);
  const [uBoxGsmPaper, setUBoxGsmPaper] = useState('150');
  const [uBoxGsmFlute, setUBoxGsmFlute] = useState('150');
  const [uBoxGsmPacking, setUBoxGsmPacking] = useState('150');
  const [uBoxBf, setUBoxBf] = useState('16');
  const [uBoxQtyData, setUBoxQtyData] = useState(2);
  const [uBoxGstPercent, setUBoxGstPercent] = useState(18);
  const [uBoxCustomerCopyFile, setUBoxCustomerCopyFile] = useState('');
  const [uBoxNewCustomerCopyFile, setUBoxNewCustomerCopyFile] = useState('');
  const [uBoxShowNewCustomerCopyInput, setUBoxShowNewCustomerCopyInput] = useState(false);
  const [uBoxCompanyCopyFile, setUBoxCompanyCopyFile] = useState('');
  const [uBoxNewCompanyCopyFile, setUBoxNewCompanyCopyFile] = useState('');
  const [uBoxShowNewCompanyCopyInput, setUBoxShowNewCompanyCopyInput] = useState(false);
  const [uBoxReelSizePlus, setUBoxReelSizePlus] = useState('');
  const [uBoxReelSizeMinus, setUBoxReelSizeMinus] = useState('');
  const [uBoxCutSizePlus, setUBoxCutSizePlus] = useState('');
  const [uBoxCutSizeMinus, setUBoxCutSizeMinus] = useState('');
  const [uBoxFlabL, setUBoxFlabL] = useState(0);
  const [uBoxFlabW, setUBoxFlabW] = useState(0);
  const [uBoxIsScreenPrinting, setUBoxIsScreenPrinting] = useState(false);
  const [uBoxScreenPrintingPricePerBox, setUBoxScreenPrintingPricePerBox] = useState(0);
  const [uBoxIsCallicoCost, setUBoxIsCallicoCost] = useState(false);
  const [uBoxCallicoPricePerBox, setUBoxCallicoPricePerBox] = useState(0);
  const [uBoxResults, setUBoxResults] = useState(null);
  const [uBoxSaving, setUBoxSaving] = useState(false);
  const [uBoxSavedSuccess, setUBoxSavedSuccess] = useState(false);
  const [uBoxError, setUBoxError] = useState('');

  // ─── Universal Type Calculation state ────────────────────────────────────────
  const [uTypeCompanyId, setUTypeCompanyId] = useState('');
  const [uTypeSizes, setUTypeSizes] = useState([]);
  const [uTypeSizeId, setUTypeSizeId] = useState('');
  const [uTypeQty, setUTypeQty] = useState(150);
  const [uTypePlyType, setUTypePlyType] = useState('5');
  const [uTypeFluteExtraPercent, setUTypeFluteExtraPercent] = useState(45);
  const [uTypePricePerKg, setUTypePricePerKg] = useState(60);
  const [uTypeGsmPaper, setUTypeGsmPaper] = useState('150');
  const [uTypeGsmFlute, setUTypeGsmFlute] = useState('150');
  const [uTypeGsmPacking, setUTypeGsmPacking] = useState('150');
  const [uTypeBf, setUTypeBf] = useState('16');
  const [uTypeQtyData, setUTypeQtyData] = useState(2);
  const [uTypeGstPercent, setUTypeGstPercent] = useState(18);
  const [uTypeCustomerCopyFile, setUTypeCustomerCopyFile] = useState('');
  const [uTypeNewCustomerCopyFile, setUTypeNewCustomerCopyFile] = useState('');
  const [uTypeShowNewCustomerCopyInput, setUTypeShowNewCustomerCopyInput] = useState(false);
  const [uTypeCompanyCopyFile, setUTypeCompanyCopyFile] = useState('');
  const [uTypeNewCompanyCopyFile, setUTypeNewCompanyCopyFile] = useState('');
  const [uTypeShowNewCompanyCopyInput, setUTypeShowNewCompanyCopyInput] = useState(false);
  const [uTypeReelSizePlus, setUTypeReelSizePlus] = useState('');
  const [uTypeReelSizeMinus, setUTypeReelSizeMinus] = useState('');
  const [uTypeCutSizePlus, setUTypeCutSizePlus] = useState('');
  const [uTypeCutSizeMinus, setUTypeCutSizeMinus] = useState('');
  const [uTypeIsScreenPrinting, setUTypeIsScreenPrinting] = useState(false);
  const [uTypeScreenPrintingPricePerBox, setUTypeScreenPrintingPricePerBox] = useState(0);
  const [uTypeIsCallicoCost, setUTypeIsCallicoCost] = useState(false);
  const [uTypeCallicoPricePerBox, setUTypeCallicoPricePerBox] = useState(0);
  const [uTypeResults, setUTypeResults] = useState(null);
  const [uTypeSaving, setUTypeSaving] = useState(false);
  const [uTypeSavedSuccess, setUTypeSavedSuccess] = useState(false);
  const [uTypeError, setUTypeError] = useState('');

  // ─── Full Closing Box Calculation state ────────────────────────────────────
  const [fcBoxCompanyId, setFcBoxCompanyId] = useState('');
  const [fcBoxSizes, setFcBoxSizes] = useState([]);
  const [fcBoxSizeId, setFcBoxSizeId] = useState('');
  const [fcBoxQtyBoxes, setFcBoxQtyBoxes] = useState(150);
  const [fcBoxPlyType, setFcBoxPlyType] = useState('5');
  const [fcBoxFluteExtraPercent, setFcBoxFluteExtraPercent] = useState(45);
  const [fcBoxPricePerKg, setFcBoxPricePerKg] = useState(60);
  const [fcBoxGsmPaper, setFcBoxGsmPaper] = useState('150');
  const [fcBoxGsmFlute, setFcBoxGsmFlute] = useState('150');
  const [fcBoxGsmPacking, setFcBoxGsmPacking] = useState('150');
  const [fcBoxBf, setFcBoxBf] = useState('16');
  const [fcBoxQtyData, setFcBoxQtyData] = useState(2);
  const [fcBoxGstPercent, setFcBoxGstPercent] = useState(18);
  const [fcBoxCustomerCopyFile, setFcBoxCustomerCopyFile] = useState('');
  const [fcBoxNewCustomerCopyFile, setFcBoxNewCustomerCopyFile] = useState('');
  const [fcBoxShowNewCustomerCopyInput, setFcBoxShowNewCustomerCopyInput] = useState(false);
  const [fcBoxCompanyCopyFile, setFcBoxCompanyCopyFile] = useState('');
  const [fcBoxNewCompanyCopyFile, setFcBoxNewCompanyCopyFile] = useState('');
  const [fcBoxShowNewCompanyCopyInput, setFcBoxShowNewCompanyCopyInput] = useState(false);
  const [fcBoxReelSizePlus, setFcBoxReelSizePlus] = useState('');
  const [fcBoxReelSizeMinus, setFcBoxReelSizeMinus] = useState('');
  const [fcBoxCutSizePlus, setFcBoxCutSizePlus] = useState('');
  const [fcBoxCutSizeMinus, setFcBoxCutSizeMinus] = useState('');
  const [fcBoxResults, setFcBoxResults] = useState(null);
  const [fcBoxSaving, setFcBoxSaving] = useState(false);
  const [fcBoxSavedSuccess, setFcBoxSavedSuccess] = useState(false);
  const [fcBoxError, setFcBoxError] = useState('');
  const [fcBoxIsDuplex, setFcBoxIsDuplex] = useState(false);
  const [fcBoxDuplexPrice, setFcBoxDuplexPrice] = useState(60);
  const [fcBoxIsLaminated, setFcBoxIsLaminated] = useState(false);
  const [fcBoxLaminationRupees, setFcBoxLaminationRupees] = useState(0);
  const [fcBoxIsPrintingCharge, setFcBoxIsPrintingCharge] = useState(false);
  const [fcBoxPrintingLabourCharge, setFcBoxPrintingLabourCharge] = useState(0);
  const [fcBoxPrintingPlatePrice, setFcBoxPrintingPlatePrice] = useState(0);
  const [fcBoxPrintingNoOfPlates, setFcBoxPrintingNoOfPlates] = useState(0);
  const [fcBoxIsInkCost, setFcBoxIsInkCost] = useState(false);
  const [fcBoxInkPricePerBox, setFcBoxInkPricePerBox] = useState(0);
  const [fcBoxIsScreenPrinting, setFcBoxIsScreenPrinting] = useState(false);
  const [fcBoxScreenPrintingPricePerBox, setFcBoxScreenPrintingPricePerBox] = useState(0);
  const [fcBoxIsCallicoCost, setFcBoxIsCallicoCost] = useState(false);
  const [fcBoxCallicoPricePerBox, setFcBoxCallicoPricePerBox] = useState(0);



  // ─── Fetch companies ───────────────────────────────────────────────────────
  useEffect(() => {
    async function getCompanies() {
      try {
        const res = await authenticatedFetch('/api/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
          if (data.length > 0 && !editId) {
            const getFirstVal = (type) => {
              const filtered = data.filter(c => !c.available_types || !Array.isArray(c.available_types) || c.available_types.length === 0 || c.available_types.includes(type) || c.available_types.includes('all'));
              return filtered.length > 0 ? filtered[0].id : data[0].id;
            };
            setBoxCompanyId(getFirstVal('box'));
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

  // Helper to strip tags from customer_name and extract clean file name
  const cleanCustomerFileName = (custName) => {
    if (!custName) return '';
    return custName.replace(/\[[^\]]+\]/g, '').trim();
  };

  // Helper to parse charge tags from customer name string if boolean columns are missing
  const parseTagsFromCustomerName = (custName) => {
    if (!custName) return {};
    const res = {};
    const pairMatch = custName.match(/\[PairMeta:\s*(\{.*?\})\]/i);
    if (pairMatch) {
      try { res.pairMeta = JSON.parse(pairMatch[1]); } catch(e){}
    }
    const chargesMatch = custName.match(/\[ExtraChargesMeta:\s*(\{.*?\})\]/i);
    if (chargesMatch) {
      try { res.extraChargesMeta = JSON.parse(chargesMatch[1]); } catch(e){}
    }
    const flabMatch = custName.match(/\[FlabMeta:\s*(\{.*?\})\]/i);
    if (flabMatch) {
      try { res.flabMeta = JSON.parse(flabMatch[1]); } catch(e){}
    }
    const dup = custName.match(/\[Duplex:\s*₹?([\d.]+)\]/i);
    if (dup) { res.isDuplex = true; res.duplexPrice = parseFloat(dup[1]) || 0; }
    const lam = custName.match(/\[Laminated?:\s*₹?([\d.]+)\]/i);
    if (lam) { res.isLaminated = true; res.laminationPrice = parseFloat(lam[1]) || 0; }
    const prn = custName.match(/\[Printing:\s*₹?([\d.]+)\]/i);
    if (prn) { res.isPrinting = true; res.printingPrice = parseFloat(prn[1]) || 0; }
    const ink = custName.match(/\[Ink:\s*₹?([\d.]+)\]/i);
    if (ink) { res.isInk = true; res.inkPrice = parseFloat(ink[1]) || 0; }
    const scr = custName.match(/\[ScreenPrinting:\s*₹?([\d.]+)\]/i);
    if (scr) { res.isScreenPrinting = true; res.screenPrintingPrice = parseFloat(scr[1]) || 0; }
    const cal = custName.match(/\[Callico:\s*₹?([\d.]+)\]/i);
    if (cal) { res.isCallico = true; res.callicoPrice = parseFloat(cal[1]) || 0; }
    return res;
  };

  const refreshExistingFiles = async () => {
    try {
      const [custRes, compRes] = await Promise.all([
        authenticatedFetch('/api/customers/files?type=customer_copy'),
        authenticatedFetch('/api/customers/files?type=company_copy')
      ]);
      if (custRes.ok) {
        const custData = await custRes.json();
        setExistingCustomerCopyFiles(custData);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setExistingCompanyCopyFiles(compData);
      }
    } catch (err) {
      console.error('Error fetching existing files:', err);
    }
  };

  useEffect(() => {
    refreshExistingFiles();
  }, []);

  const checkDuplicateFile = (showNewInput, fileName, setError) => {
    if (!showNewInput || !fileName) return false;
    const clean = fileName.trim().toLowerCase();
    const isDup = existingCustomerCopyFiles.some(f => (f || '').trim().toLowerCase() === clean);
    if (isDup) {
      const msg = `File "${fileName.trim()}" already exists in Customers! Please select it from the dropdown or choose a different file name.`;
      if (setError) setError(msg);
      showToast && showToast(msg, 'error');
    }
    return isDup;
  };

  useEffect(() => {
    if (!editId) return;
    setEditingId(editId);
    async function loadCalculationToEdit() {
      try {
        const res = await authenticatedFetch(`/api/customers/${editId}`);
        if (res.ok) {
          const item = await res.json();
          if (item.company_id) {
            setLoadedSizeId(item.size_id);
            const custName = item.customer_name || '';
            const calcType = item.calc_type || (item.company_sizes && item.company_sizes.calc_type) || '';

            const isPad = calcType === 'pad' || /\[Pad\]/i.test(custName);
            const isPartition = calcType === 'partition' || /\[Partition\]/i.test(custName);
            const isTray = calcType === 'tray' || /\[Tray\]/i.test(custName);
            const isSleave = calcType === 'sleave' || /\[Sleave\]/i.test(custName);
            const isCollerBox = calcType === 'coller_box' || calcType === 'coller' || /\[CollerBox\]/i.test(custName);
            const isTopSideTray = calcType === 'top_side_tray_box' || calcType === 'top_side_tray' || /\[TopSideTrayBox\]/i.test(custName);
            const isUniversal = calcType === 'universal' || calcType === 'universal_type' || /\[UniversalType\]/i.test(custName);
            const isFullClosing = calcType === 'full_closing' || calcType === 'full_closing_box' || /\[FullClosingBox\]/i.test(custName);

            const cleanedCustFile = cleanCustomerFileName(custName);
            const compFile = item.company_reference || '';
            const parsedTags = parseTagsFromCustomerName(custName);

            const openAccordion = (accId) => {
              setActiveAccordion(accId);
              setTimeout(() => {
                const el = document.getElementById(accId);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 250);
            };

            const populateAdjust = (val, setPlus, setMinus) => {
              if (val === undefined || val === null || val === '') {
                setPlus(''); setMinus('');
                return;
              }
              const num = parseFloat(val);
              if (isNaN(num) || num === 0) {
                setPlus(''); setMinus('');
              } else if (num > 0) {
                setPlus(String(num)); setMinus('');
              } else {
                setPlus(''); setMinus(String(Math.abs(num)));
              }
            };

            if (isPad) {
              setEditingType('pad');
              setPadCompanyId(item.company_id);
              setPadSizeId(item.size_id);
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setPadQtyPads(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setPadPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setPadFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setPadPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setPadGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setPadGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setPadGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setPadBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setPadQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setPadGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setPadReelSizePlus, setPadReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setPadCutSizePlus, setPadCutSizeMinus);
              setPadCustomerCopyFile(cleanedCustFile);
              setPadCompanyCopyFile(compFile);
              openAccordion('pad');
            } else if (isPartition) {
              setEditingType('partition');
              setPartitionCompanyId(item.company_id);
              if (parsedTags.pairMeta && parsedTags.pairMeta.pairId) {
                setPartitionSizeId(parsedTags.pairMeta.pairId);
              } else {
                setPartitionSizeId(item.size_id);
              }
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setPartitionQtyPads(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setPartitionPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setPartitionFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setPartitionPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setPartitionGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setPartitionGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setPartitionGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setPartitionBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) {
                setPartitionQtyData(item.quantity_of_data);
                setPartitionSet(String(item.quantity_of_data));
              }
              if (item.gst_percent !== undefined && item.gst_percent !== null) setPartitionGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setPartitionReelSizePlus, setPartitionReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setPartitionCutSizePlus, setPartitionCutSizeMinus);
              setPartitionCustomerCopyFile(cleanedCustFile);
              setPartitionCompanyCopyFile(compFile);
              openAccordion('partition');
            } else if (isTray) {
              setEditingType('tray');
              setTrayCompanyId(item.company_id);
              setTraySizeId(item.size_id);
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setTrayQtyTrays(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setTrayPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setTrayFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setTrayPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setTrayGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setTrayGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setTrayGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setTrayBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setTrayQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setTrayGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setTrayReelSizePlus, setTrayReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setTrayCutSizePlus, setTrayCutSizeMinus);
              setTrayCustomerCopyFile(cleanedCustFile);
              setTrayCompanyCopyFile(compFile);
              openAccordion('tray');
            } else if (isSleave) {
              setEditingType('sleave');
              setSleaveCompanyId(item.company_id);
              setSleaveSizeId(item.size_id);
              if (parsedTags.flabMeta) {
                if (parsedTags.flabMeta.flabL !== undefined) setSleaveFlabL(parsedTags.flabMeta.flabL);
                if (parsedTags.flabMeta.flabW !== undefined) setSleaveFlabW(parsedTags.flabMeta.flabW);
              } else if (item.company_sizes || item.cut_size) {
                const sz = item.company_sizes;
                if (sz && sz.length_inches) {
                  const lenInches = convertToInches(sz.length_inches, sz.unit);
                  if (lenInches > 0 && item.cut_size) {
                    const inferredL = Math.max(0, Math.round(item.cut_size - lenInches - 1));
                    setSleaveFlabL(inferredL);
                  }
                  if (sz.width_inches && item.weight_per_unit && item.reel_size) {
                    const widInches = convertToInches(sz.width_inches, sz.unit);
                    const plies = PLY_CONFIG[item.ply_type || 5] || { paper: 3, flute: 2 };
                    const paperGSM = ((plies.paper - 1) * Number(item.gsm_paper || item.gsm || 150)) + Number(item.gsm_packing || 150);
                    const fluteGSM = ((Number(item.gsm_flute || 150) * ((item.flute_extra_percent || 45) / 100)) + Number(item.gsm_flute || 150)) * plies.flute;
                    const totalPF = paperGSM + fluteGSM;
                    const calcLength = item.cut_size;
                    const calcHeight = item.reel_size;
                    const totalArea = (item.weight_per_unit * 1550000) / totalPF;
                    const calcWidth = (totalArea - (calcLength * calcHeight * 2)) / (calcHeight * 2);
                    const inferredW = Math.max(0, Math.round(calcWidth - widInches - 1));
                    setSleaveFlabW(inferredW);
                  }
                }
              }
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setSleaveQty(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setSleavePlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setSleaveFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setSleavePricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setSleaveGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setSleaveGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setSleaveGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setSleaveBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setSleaveQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setSleaveGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setSleaveReelSizePlus, setSleaveReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setSleaveCutSizePlus, setSleaveCutSizeMinus);
              const isScrSleave = item.is_screen_printing !== undefined && item.is_screen_printing !== null ? !!item.is_screen_printing : !!parsedTags.isScreenPrinting;
              setSleaveIsScreenPrinting(isScrSleave);
              if (item.screen_printing_price !== undefined && item.screen_printing_price !== null) setSleaveScreenPrintingPricePerBox(item.screen_printing_price);
              else if (parsedTags.screenPrintingPrice !== undefined) setSleaveScreenPrintingPricePerBox(parsedTags.screenPrintingPrice);

              const isCalSleave = item.is_callico !== undefined && item.is_callico !== null ? !!item.is_callico : !!parsedTags.isCallico;
              setSleaveIsCallicoCost(isCalSleave);
              if (item.callico_price !== undefined && item.callico_price !== null) setSleaveCallicoPricePerBox(item.callico_price);
              else if (parsedTags.callicoPrice !== undefined) setSleaveCallicoPricePerBox(parsedTags.callicoPrice);

              setSleaveCustomerCopyFile(cleanedCustFile);
              setSleaveCompanyCopyFile(compFile);
              openAccordion('sleave');
            } else if (isCollerBox) {
              setEditingType('coller_box');
              setCollerBoxCompanyId(item.company_id);
              setCollerBoxSizeId(item.size_id);
              if (parsedTags.flabMeta) {
                if (parsedTags.flabMeta.flabL !== undefined) setCollerBoxFlabL(parsedTags.flabMeta.flabL);
                if (parsedTags.flabMeta.flabW !== undefined) setCollerBoxFlabW(parsedTags.flabMeta.flabW);
              } else if (item.company_sizes || item.cut_size) {
                const sz = item.company_sizes;
                if (sz && sz.length_inches) {
                  const lenInches = convertToInches(sz.length_inches, sz.unit);
                  if (lenInches > 0 && item.cut_size) {
                    const inferredL = Math.max(0, Math.round(item.cut_size - lenInches - 1));
                    setCollerBoxFlabL(inferredL);
                  }
                  if (sz.width_inches && item.weight_per_unit && item.reel_size) {
                    const widInches = convertToInches(sz.width_inches, sz.unit);
                    const plies = PLY_CONFIG[item.ply_type || 5] || { paper: 3, flute: 2 };
                    const paperGSM = ((plies.paper - 1) * Number(item.gsm_paper || item.gsm || 150)) + Number(item.gsm_packing || 150);
                    const fluteGSM = ((Number(item.gsm_flute || 150) * ((item.flute_extra_percent || 45) / 100)) + Number(item.gsm_flute || 150)) * plies.flute;
                    const totalPF = paperGSM + fluteGSM;
                    const calcLength = item.cut_size;
                    const calcHeight = item.reel_size;
                    const totalArea = (item.weight_per_unit * 1550000) / totalPF;
                    const calcWidth = (totalArea - (calcLength * calcHeight * 2)) / (calcHeight * 2);
                    const inferredW = Math.max(0, Math.round(calcWidth - widInches - 1));
                    setCollerBoxFlabW(inferredW);
                  }
                }
              }
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setCollerBoxQty(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setCollerBoxPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setCollerBoxFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setCollerBoxPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setCollerBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setCollerBoxGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setCollerBoxGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setCollerBoxBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setCollerBoxQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setCollerBoxGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setCollerBoxReelSizePlus, setCollerBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setCollerBoxCutSizePlus, setCollerBoxCutSizeMinus);
              setCollerBoxCustomerCopyFile(cleanedCustFile);
              setCollerBoxCompanyCopyFile(compFile);
              openAccordion('coller_box');
            } else if (isTopSideTray) {
              setEditingType('top_side_tray_box');
              setUBoxCompanyId(item.company_id);
              setUBoxSizeId(item.size_id);
              if (parsedTags.flabMeta) {
                if (parsedTags.flabMeta.flabL !== undefined) setUBoxFlabL(parsedTags.flabMeta.flabL);
                if (parsedTags.flabMeta.flabW !== undefined) setUBoxFlabW(parsedTags.flabMeta.flabW);
              } else if (item.company_sizes || item.cut_size) {
                const sz = item.company_sizes;
                if (sz && sz.length_inches) {
                  const lenInches = convertToInches(sz.length_inches, sz.unit);
                  if (lenInches > 0 && item.cut_size) {
                    const inferredL = Math.max(0, Math.round(item.cut_size - lenInches - 1));
                    setUBoxFlabL(inferredL);
                  }
                  if (sz.width_inches && item.weight_per_unit && item.reel_size) {
                    const widInches = convertToInches(sz.width_inches, sz.unit);
                    const plies = PLY_CONFIG[item.ply_type || 5] || { paper: 3, flute: 2 };
                    const paperGSM = ((plies.paper - 1) * Number(item.gsm_paper || item.gsm || 150)) + Number(item.gsm_packing || 150);
                    const fluteGSM = ((Number(item.gsm_flute || 150) * ((item.flute_extra_percent || 45) / 100)) + Number(item.gsm_flute || 150)) * plies.flute;
                    const totalPF = paperGSM + fluteGSM;
                    const calcLength = item.cut_size;
                    const calcHeight = item.reel_size;
                    const totalArea = (item.weight_per_unit * 1550000) / totalPF;
                    const calcWidth = (totalArea - (calcLength * calcHeight * 2)) / (calcHeight * 2);
                    const inferredW = Math.max(0, Math.round(calcWidth - widInches - 1));
                    setUBoxFlabW(inferredW);
                  }
                }
              }
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setUBoxQty(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setUBoxPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setUBoxFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setUBoxPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setUBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setUBoxGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setUBoxGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setUBoxBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setUBoxQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setUBoxGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setUBoxReelSizePlus, setUBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setUBoxCutSizePlus, setUBoxCutSizeMinus);

              const isScrUBox = item.is_screen_printing !== undefined && item.is_screen_printing !== null ? !!item.is_screen_printing : !!parsedTags.isScreenPrinting;
              setUBoxIsScreenPrinting(isScrUBox);
              if (item.screen_printing_price !== undefined && item.screen_printing_price !== null) setUBoxScreenPrintingPricePerBox(item.screen_printing_price);
              else if (parsedTags.screenPrintingPrice !== undefined) setUBoxScreenPrintingPricePerBox(parsedTags.screenPrintingPrice);

              const isCalUBox = item.is_callico !== undefined && item.is_callico !== null ? !!item.is_callico : !!parsedTags.isCallico;
              setUBoxIsCallicoCost(isCalUBox);
              if (item.callico_price !== undefined && item.callico_price !== null) setUBoxCallicoPricePerBox(item.callico_price);
              else if (parsedTags.callicoPrice !== undefined) setUBoxCallicoPricePerBox(parsedTags.callicoPrice);

              setUBoxCustomerCopyFile(cleanedCustFile);
              setUBoxCompanyCopyFile(compFile);
              openAccordion('top_side_tray_box');
            } else if (isUniversal) {
              setEditingType('universal');
              setUTypeCompanyId(item.company_id);
              setUTypeSizeId(item.size_id);
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setUTypeQty(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setUTypePlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setUTypeFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setUTypePricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setUTypeGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setUTypeGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setUTypeGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setUTypeBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setUTypeQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setUTypeGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setUTypeReelSizePlus, setUTypeReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setUTypeCutSizePlus, setUTypeCutSizeMinus);

              const isScrUType = item.is_screen_printing !== undefined && item.is_screen_printing !== null ? !!item.is_screen_printing : !!parsedTags.isScreenPrinting;
              setUTypeIsScreenPrinting(isScrUType);
              if (item.screen_printing_price !== undefined && item.screen_printing_price !== null) setUTypeScreenPrintingPricePerBox(item.screen_printing_price);
              else if (parsedTags.screenPrintingPrice !== undefined) setUTypeScreenPrintingPricePerBox(parsedTags.screenPrintingPrice);

              const isCalUType = item.is_callico !== undefined && item.is_callico !== null ? !!item.is_callico : !!parsedTags.isCallico;
              setUTypeIsCallicoCost(isCalUType);
              if (item.callico_price !== undefined && item.callico_price !== null) setUTypeCallicoPricePerBox(item.callico_price);
              else if (parsedTags.callicoPrice !== undefined) setUTypeCallicoPricePerBox(parsedTags.callicoPrice);

              setUTypeCustomerCopyFile(cleanedCustFile);
              setUTypeCompanyCopyFile(compFile);
              openAccordion('universal');
            } else if (isFullClosing) {
              setEditingType('full_closing');
              setFcBoxCompanyId(item.company_id);
              setFcBoxSizeId(item.size_id);
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setFcBoxQtyBoxes(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setFcBoxPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setFcBoxFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setFcBoxPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setFcBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setFcBoxGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setFcBoxGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setFcBoxBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setFcBoxQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setFcBoxGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setFcBoxReelSizePlus, setFcBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setFcBoxCutSizePlus, setFcBoxCutSizeMinus);

              // Full Closing Box Charges
              const isDupFc = item.is_duplex !== undefined && item.is_duplex !== null ? !!item.is_duplex : !!parsedTags.isDuplex;
              setFcBoxIsDuplex(isDupFc);
              if (parsedTags.extraChargesMeta?.duplexRate !== undefined) setFcBoxDuplexPrice(parsedTags.extraChargesMeta.duplexRate);
              else if (item.duplex_price !== undefined && item.duplex_price !== null) setFcBoxDuplexPrice(item.duplex_price);
              else if (parsedTags.duplexPrice !== undefined) setFcBoxDuplexPrice(parsedTags.duplexPrice);

              const isLamFc = item.is_laminated !== undefined && item.is_laminated !== null ? !!item.is_laminated : !!parsedTags.isLaminated;
              setFcBoxIsLaminated(isLamFc);
              if (parsedTags.extraChargesMeta?.laminationRate !== undefined) setFcBoxLaminationRupees(parsedTags.extraChargesMeta.laminationRate);
              else if (item.lamination_price !== undefined && item.lamination_price !== null) setFcBoxLaminationRupees(item.lamination_price);
              else if (parsedTags.laminationPrice !== undefined) setFcBoxLaminationRupees(parsedTags.laminationPrice);

              const isPrnFc = item.is_printing !== undefined && item.is_printing !== null ? !!item.is_printing : !!parsedTags.isPrinting;
              setFcBoxIsPrintingCharge(isPrnFc);
              if (parsedTags.extraChargesMeta?.printingLabour !== undefined) {
                setFcBoxPrintingLabourCharge(parsedTags.extraChargesMeta.printingLabour);
                setFcBoxPrintingPlatePrice(parsedTags.extraChargesMeta.printingPlatePrice || 0);
                setFcBoxPrintingNoOfPlates(parsedTags.extraChargesMeta.printingNoOfPlates || 0);
              } else if (item.printing_price !== undefined && item.printing_price !== null) setFcBoxPrintingLabourCharge(item.printing_price);
              else if (parsedTags.printingPrice !== undefined) setFcBoxPrintingLabourCharge(parsedTags.printingPrice);

              const isInkFc = item.is_ink !== undefined && item.is_ink !== null ? !!item.is_ink : !!parsedTags.isInk;
              setFcBoxIsInkCost(isInkFc);
              if (item.ink_price !== undefined && item.ink_price !== null) setFcBoxInkPricePerBox(item.ink_price);
              else if (parsedTags.inkPrice !== undefined) setFcBoxInkPricePerBox(parsedTags.inkPrice);

              const isScrFc = item.is_screen_printing !== undefined && item.is_screen_printing !== null ? !!item.is_screen_printing : !!parsedTags.isScreenPrinting;
              setFcBoxIsScreenPrinting(isScrFc);
              if (item.screen_printing_price !== undefined && item.screen_printing_price !== null) setFcBoxScreenPrintingPricePerBox(item.screen_printing_price);
              else if (parsedTags.screenPrintingPrice !== undefined) setFcBoxScreenPrintingPricePerBox(parsedTags.screenPrintingPrice);

              const isCalFc = item.is_callico !== undefined && item.is_callico !== null ? !!item.is_callico : !!parsedTags.isCallico;
              setFcBoxIsCallicoCost(isCalFc);
              if (item.callico_price !== undefined && item.callico_price !== null) setFcBoxCallicoPricePerBox(item.callico_price);
              else if (parsedTags.callicoPrice !== undefined) setFcBoxCallicoPricePerBox(parsedTags.callicoPrice);

              setFcBoxCustomerCopyFile(cleanedCustFile);
              setFcBoxCompanyCopyFile(compFile);
              openAccordion('full_closing');
            } else {
              setEditingType('box');
              setBoxCompanyId(item.company_id);
              setBoxSizeId(item.size_id);
              setBoxSizeId(item.size_id);
              if (item.quantity_of_boxes !== undefined && item.quantity_of_boxes !== null) setBoxQtyBoxes(item.quantity_of_boxes);
              if (item.ply_type !== undefined && item.ply_type !== null) setBoxPlyType(String(item.ply_type));
              if (item.flute_extra_percent !== undefined && item.flute_extra_percent !== null) setBoxFluteExtraPercent(item.flute_extra_percent);
              if (item.price_per_kg !== undefined && item.price_per_kg !== null) setBoxPricePerKg(item.price_per_kg);
              if (item.gsm_paper !== undefined || item.gsm !== undefined) setBoxGsmPaper(String(item.gsm_paper || item.gsm));
              if (item.gsm_flute !== undefined && item.gsm_flute !== null) setBoxGsmFlute(String(item.gsm_flute));
              if (item.gsm_packing !== undefined && item.gsm_packing !== null) setBoxGsmPacking(String(item.gsm_packing));
              if (item.bf !== undefined && item.bf !== null) setBoxBf(String(item.bf));
              if (item.quantity_of_data !== undefined && item.quantity_of_data !== null) setBoxQtyData(item.quantity_of_data);
              if (item.gst_percent !== undefined && item.gst_percent !== null) setBoxGstPercent(item.gst_percent);
              populateAdjust(item.reel_size_adjust, setBoxReelSizePlus, setBoxReelSizeMinus);
              populateAdjust(item.cut_size_adjust, setBoxCutSizePlus, setBoxCutSizeMinus);

              // Standard Box Charges
              const isDupBox = item.is_duplex !== undefined && item.is_duplex !== null ? !!item.is_duplex : !!parsedTags.isDuplex;
              setBoxIsDuplex(isDupBox);
              if (parsedTags.extraChargesMeta?.duplexRate !== undefined) setBoxDuplexPrice(parsedTags.extraChargesMeta.duplexRate);
              else if (item.duplex_price !== undefined && item.duplex_price !== null) setBoxDuplexPrice(item.duplex_price);
              else if (parsedTags.duplexPrice !== undefined) setBoxDuplexPrice(parsedTags.duplexPrice);

              const isLamBox = item.is_laminated !== undefined && item.is_laminated !== null ? !!item.is_laminated : !!parsedTags.isLaminated;
              setBoxIsLaminated(isLamBox);
              if (parsedTags.extraChargesMeta?.laminationRate !== undefined) setBoxLaminationRupees(parsedTags.extraChargesMeta.laminationRate);
              else if (item.lamination_price !== undefined && item.lamination_price !== null) setBoxLaminationRupees(item.lamination_price);
              else if (parsedTags.laminationPrice !== undefined) setBoxLaminationRupees(parsedTags.laminationPrice);

              const isPrnBox = item.is_printing !== undefined && item.is_printing !== null ? !!item.is_printing : !!parsedTags.isPrinting;
              setBoxIsPrintingCharge(isPrnBox);
              if (parsedTags.extraChargesMeta?.printingLabour !== undefined) {
                setBoxPrintingLabourCharge(parsedTags.extraChargesMeta.printingLabour);
                setBoxPrintingPlatePrice(parsedTags.extraChargesMeta.printingPlatePrice || 0);
                setBoxPrintingNoOfPlates(parsedTags.extraChargesMeta.printingNoOfPlates || 0);
              } else if (item.printing_price !== undefined && item.printing_price !== null) setBoxPrintingLabourCharge(item.printing_price);
              else if (parsedTags.printingPrice !== undefined) setBoxPrintingLabourCharge(parsedTags.printingPrice);

              const isInkBox = item.is_ink !== undefined && item.is_ink !== null ? !!item.is_ink : !!parsedTags.isInk;
              setBoxIsInkCost(isInkBox);
              if (item.ink_price !== undefined && item.ink_price !== null) setBoxInkPricePerBox(item.ink_price);
              else if (parsedTags.inkPrice !== undefined) setBoxInkPricePerBox(parsedTags.inkPrice);

              const isScrBox = item.is_screen_printing !== undefined && item.is_screen_printing !== null ? !!item.is_screen_printing : !!parsedTags.isScreenPrinting;
              setBoxIsScreenPrinting(isScrBox);
              if (item.screen_printing_price !== undefined && item.screen_printing_price !== null) setBoxScreenPrintingPricePerBox(item.screen_printing_price);
              else if (parsedTags.screenPrintingPrice !== undefined) setBoxScreenPrintingPricePerBox(parsedTags.screenPrintingPrice);

              const isCalBox = item.is_callico !== undefined && item.is_callico !== null ? !!item.is_callico : !!parsedTags.isCallico;
              setBoxIsCallicoCost(isCalBox);
              if (item.callico_price !== undefined && item.callico_price !== null) setBoxCallicoPricePerBox(item.callico_price);
              else if (parsedTags.callicoPrice !== undefined) setBoxCallicoPricePerBox(parsedTags.callicoPrice);

              setBoxCustomerCopyFile(cleanedCustFile);
              setBoxCompanyCopyFile(compFile);
              openAccordion('box');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching edit calculation:', err);
      }
    }
    loadCalculationToEdit();
  }, [editId]);

  // ─── Fetch Box sizes when boxCompanyId changes ─────────────────────────────
  useEffect(() => {
    if (!boxCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${boxCompanyId}/sizes?calc_type=box`);
        if (res.ok) {
          const data = await res.json();
          setBoxSizes(data);
          setBoxSizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching box sizes:', err);
      }
    }
    getSizes();
  }, [boxCompanyId]);

  // ─── Fetch Pad sizes when padCompanyId changes ─────────────────────────────
  useEffect(() => {
    if (!padCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${padCompanyId}/sizes?calc_type=pad`);
        if (res.ok) {
          const data = await res.json();
          setPadSizes(data);
          setPadSizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching pad sizes:', err);
      }
    }
    getSizes();
  }, [padCompanyId]);

  // ─── Fetch Partition sizes when partitionCompanyId changes ──────────────────
  useEffect(() => {
    if (!partitionCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${partitionCompanyId}/sizes?calc_type=partition`);
        if (res.ok) {
          const data = await res.json();
          setPartitionSizes(data);
          
          // Group sizes by pair_group
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
              grouped.push({
                type: 'paired',
                id: `pair_${pg}`,
                first: pair[0],
                second: pair[1],
                label: `${pair[0].label} (Slot ${pair[0].slot_count}) + ${pair[1].label} (Slot ${pair[1].slot_count})`
              });
            } else {
              pair.forEach(s => singles.push({ type: 'single', size: s, id: s.id }));
            }
          });
          
          const allOptions = [...grouped, ...singles];
          setPartitionGroupedSizes(allOptions);
          setPartitionSizeId(prev => {
            const targetId = loadedSizeId || prev;
            if (targetId) {
              const match = allOptions.find(s => 
                String(s.id) === String(targetId) || 
                (s.type === 'paired' && (String(s.first?.id) === String(targetId) || String(s.second?.id) === String(targetId)))
              );
              if (match) return match.id;
            }
            return allOptions.length > 0 ? allOptions[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching partition sizes:', err);
      }
    }
    getSizes();
  }, [partitionCompanyId]);

  // ─── Fetch Tray sizes when trayCompanyId changes ───────────────────────────
  useEffect(() => {
    if (!trayCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${trayCompanyId}/sizes?calc_type=tray`);
        if (res.ok) {
          const data = await res.json();
          setTraySizes(data);
          setTraySizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching tray sizes:', err);
      }
    }
    getSizes();
  }, [trayCompanyId]);

  // ─── Fetch Sleave sizes when sleaveCompanyId changes ───────────────────
  useEffect(() => {
    if (!sleaveCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${sleaveCompanyId}/sizes?calc_type=sleave`);
        if (res.ok) {
          const data = await res.json();
          setSleaveSizes(data);
          setSleaveSizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching sleave sizes:', err);
      }
    }
    getSizes();
  }, [sleaveCompanyId]);

  // ─── Fetch Coller Box sizes when collerBoxCompanyId changes ───────────────
  useEffect(() => {
    if (!collerBoxCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${collerBoxCompanyId}/sizes?calc_type=coller_box`);
        if (res.ok) {
          const data = await res.json();
          setCollerBoxSizes(data);
          setCollerBoxSizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching coller box sizes:', err);
      }
    }
    getSizes();
  }, [collerBoxCompanyId]);

  // ─── Fetch Top Side Tray Box sizes when uBoxCompanyId changes ─────────────────
  useEffect(() => {
    if (!uBoxCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${uBoxCompanyId}/sizes?calc_type=top_side_tray`);
        if (res.ok) {
          const data = await res.json();
          setUBoxSizes(data);
          setUBoxSizeId(prev => {
            if (loadedSizeId && data.some(s => String(s.id) === String(loadedSizeId))) return loadedSizeId;
            if (prev && data.some(s => String(s.id) === String(prev))) return prev;
            return data.length > 0 ? data[0].id : '';
          });
        }
      } catch (err) {
        console.error('Error fetching top side tray box sizes:', err);
      }
    }
    getSizes();
  }, [uBoxCompanyId]);

  // ─── Box live calculation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!boxSizeId || !boxQtyBoxes || parseNumeric(boxQtyBoxes, 0) <= 0 || !boxPlyType || !boxGsmPaper || !boxGsmFlute) {
      setBoxResults(null);
      return;
    }
    const selectedSize = boxSizes.find(s => String(s.id) === String(boxSizeId));
    if (!selectedSize) return;
    try {
      const computed = calculateBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: parseNumeric(boxQtyBoxes, 0),
        plyType: parseNumeric(boxPlyType, 5),
        fluteExtraPercent: parseNumeric(boxFluteExtraPercent, 45),
        pricePerKg: parseNumeric(boxPricePerKg, 60),
        qtyData: parseNumeric(boxQtyData, 2),
        gstPercent: parseNumeric(boxGstPercent, 18),
        reelSizeAdjust: parseNumeric(boxReelSizePlus, 0) - parseNumeric(boxReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(boxCutSizePlus, 0) - parseNumeric(boxCutSizeMinus, 0),
        gsmPaper: parseNumeric(boxGsmPaper, 150),
        gsmFlute: parseNumeric(boxGsmFlute, 150),
        gsmPacking: parseNumeric(boxGsmPacking, 150),
        isDuplex: boxIsDuplex,
        duplexPrice: parseNumeric(boxDuplexPrice, 60),
        isLaminated: boxIsLaminated,
        laminationRupees: parseNumeric(boxLaminationRupees, 0),
        isPrintingCharge: boxIsPrintingCharge,
        printingLabourCharge: parseNumeric(boxPrintingLabourCharge, 0),
        printingPlatePrice: parseNumeric(boxPrintingPlatePrice, 0),
        printingNoOfPlates: parseNumeric(boxPrintingNoOfPlates, 0),
        isInkCost: boxIsInkCost,
        inkPricePerBox: parseNumeric(boxInkPricePerBox, 0),
        isScreenPrinting: boxIsScreenPrinting,
        screenPrintingPricePerBox: parseNumeric(boxScreenPrintingPricePerBox, 0),
        isCallicoCost: boxIsCallicoCost,
        callicoPricePerBox: parseNumeric(boxCallicoPricePerBox, 0)
      });
      setBoxResults(computed);
    } catch (e) {
      console.error('Box calculation error:', e);
      setBoxResults(null);
    }
  }, [boxSizeId, boxSizes, boxQtyBoxes, boxPlyType, boxFluteExtraPercent, boxPricePerKg, boxQtyData, boxGstPercent, boxReelSizePlus, boxReelSizeMinus, boxCutSizePlus, boxCutSizeMinus, boxGsmPaper, boxGsmFlute, boxGsmPacking, boxIsDuplex, boxDuplexPrice, boxIsLaminated, boxLaminationRupees, boxIsPrintingCharge, boxPrintingLabourCharge, boxPrintingPlatePrice, boxPrintingNoOfPlates, boxIsInkCost, boxInkPricePerBox, boxIsScreenPrinting, boxScreenPrintingPricePerBox, boxIsCallicoCost, boxCallicoPricePerBox]);

  // ─── Pad live calculation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!padSizeId || !padQtyPads || !padPlyType || padGstPercent === undefined || !padGsmPaper || !padGsmFlute) {
      setPadResults(null);
      return;
    }
    const selectedSize = padSizes.find(s => String(s.id) === String(padSizeId));
    if (!selectedSize) { setPadResults(null); return; }
    try {
      const computed = calculatePadPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        // No height for pad
        qtyPads: parseNumeric(padQtyPads, 0),
        plyType: parseNumeric(padPlyType, 5),
        fluteExtraPercent: parseNumeric(padFluteExtraPercent, 45),
        pricePerKg: parseNumeric(padPricePerKg, 60),
        qtyData: parseNumeric(padQtyData, 2),
        gstPercent: parseNumeric(padGstPercent, 18),
        reelSizeAdjust: parseNumeric(padReelSizePlus, 0) - parseNumeric(padReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(padCutSizePlus, 0) - parseNumeric(padCutSizeMinus, 0),
        gsmPaper: parseNumeric(padGsmPaper, 150),
        gsmFlute: parseNumeric(padGsmFlute, 150),
        gsmPacking: parseNumeric(padGsmPacking, 150)
      });
      setPadResults(computed);
    } catch (e) {
      console.error('Pad calculation error:', e);
      setPadResults(null);
    }
  }, [padSizeId, padSizes, padQtyPads, padPlyType, padFluteExtraPercent, padPricePerKg, padQtyData, padGstPercent, padReelSizePlus, padReelSizeMinus, padCutSizePlus, padCutSizeMinus, padGsmPaper, padGsmFlute, padGsmPacking]);

  // ─── Partition live calculation ───────────────────────────────────────────
  useEffect(() => {
    if (!partitionSizeId || !partitionQtyPads || !partitionPlyType || partitionGstPercent === undefined || !partitionGsmPaper || !partitionGsmFlute) {
      setPartitionResults(null);
      return;
    }
    const selectedOption = partitionGroupedSizes.find(s => String(s.id) === String(partitionSizeId));
    if (!selectedOption) { setPartitionResults(null); return; }
    
    try {
      if (selectedOption.type === 'paired') {
        const computed = calculatePairedPartitionPricing({
          first: {
            L: convertToInches(selectedOption.first.length_inches, selectedOption.first.unit),
            W: convertToInches(selectedOption.first.width_inches, selectedOption.first.unit),
            slotCount: selectedOption.first.slot_count || 1
          },
          second: {
            L: convertToInches(selectedOption.second.length_inches, selectedOption.second.unit),
            W: convertToInches(selectedOption.second.width_inches, selectedOption.second.unit),
            slotCount: selectedOption.second.slot_count || 1
          },
          set: parseNumeric(partitionSet, 1),
          qtyPads: parseNumeric(partitionQtyPads, 0),
          plyType: parseNumeric(partitionPlyType, 5),
          fluteExtraPercent: parseNumeric(partitionFluteExtraPercent, 45),
          pricePerKg: parseNumeric(partitionPricePerKg, 60),
          gstPercent: parseNumeric(partitionGstPercent, 18),
          reelSizeAdjust: parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0),
          cutSizeAdjust: parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0),
          gsmPaper: parseNumeric(partitionGsmPaper, 150),
          gsmFlute: parseNumeric(partitionGsmFlute, 150),
          gsmPacking: parseNumeric(partitionGsmPacking, 150)
        });
        setPartitionResults({ ...computed, isPaired: true });
      } else {
        const s = selectedOption.size;
        const computed = calculatePartitionPricing({
          L: convertToInches(s.length_inches, s.unit),
          W: convertToInches(s.width_inches, s.unit),
          qtyPads: parseNumeric(partitionQtyPads, 0),
          plyType: parseNumeric(partitionPlyType, 5),
          fluteExtraPercent: parseNumeric(partitionFluteExtraPercent, 45),
          pricePerKg: parseNumeric(partitionPricePerKg, 60),
          qtyData: parseNumeric(partitionQtyData, 2),
          gstPercent: parseNumeric(partitionGstPercent, 18),
          reelSizeAdjust: parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0),
          cutSizeAdjust: parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0),
          gsmPaper: parseNumeric(partitionGsmPaper, 150),
          gsmFlute: parseNumeric(partitionGsmFlute, 150),
          gsmPacking: parseNumeric(partitionGsmPacking, 150)
        });
        setPartitionResults({ ...computed, isPaired: false });
      }
    } catch (e) {
      console.error('Partition calculation error:', e);
      setPartitionResults(null);
    }
  }, [partitionSizeId, partitionGroupedSizes, partitionQtyPads, partitionPlyType, partitionFluteExtraPercent, partitionPricePerKg, partitionQtyData, partitionGstPercent, partitionReelSizePlus, partitionReelSizeMinus, partitionCutSizePlus, partitionCutSizeMinus, partitionGsmPaper, partitionGsmFlute, partitionGsmPacking, partitionSet]);


  // ─── Tray live calculation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!traySizeId || !trayQtyTrays || !trayPlyType || trayGstPercent === undefined || !trayGsmPaper || !trayGsmFlute) {
      setTrayResults(null);
      return;
    }
    const selectedSize = traySizes.find(s => String(s.id) === String(traySizeId));
    if (!selectedSize) { setTrayResults(null); return; }
    try {
      const computed = calculateTrayPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyTrays: parseNumeric(trayQtyTrays, 0),
        plyType: parseNumeric(trayPlyType, 5),
        fluteExtraPercent: parseNumeric(trayFluteExtraPercent, 45),
        pricePerKg: parseNumeric(trayPricePerKg, 60),
        qtyData: parseNumeric(trayQtyData, 2),
        gstPercent: parseNumeric(trayGstPercent, 18),
        reelSizeAdjust: parseNumeric(trayReelSizePlus, 0) - parseNumeric(trayReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(trayCutSizePlus, 0) - parseNumeric(trayCutSizeMinus, 0),
        gsmPaper: parseNumeric(trayGsmPaper, 150),
        gsmFlute: parseNumeric(trayGsmFlute, 150),
        gsmPacking: parseNumeric(trayGsmPacking, 150)
      });
      setTrayResults(computed);
    } catch (e) {
      console.error('Tray calculation error:', e);
      setTrayResults(null);
    }
  }, [traySizeId, traySizes, trayQtyTrays, trayPlyType, trayFluteExtraPercent, trayPricePerKg, trayQtyData, trayGstPercent, trayReelSizePlus, trayReelSizeMinus, trayCutSizePlus, trayCutSizeMinus, trayGsmPaper, trayGsmFlute, trayGsmPacking]);

  // ─── Sleave live calculation ─────────────────────────────────────────────
  useEffect(() => {
    if (!sleaveSizeId || !sleaveQty || !sleavePlyType || sleaveGstPercent === undefined || !sleaveGsmPaper || !sleaveGsmFlute) {
      setSleaveResults(null);
      return;
    }
    const selectedSize = sleaveSizes.find(s => String(s.id) === String(sleaveSizeId));
    if (!selectedSize) { setSleaveResults(null); return; }
    try {
      const computed = calculateSleavePricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: parseNumeric(sleaveFlabL, 0),
        flabW: parseNumeric(sleaveFlabW, 0),
        qtyBoxes: parseNumeric(sleaveQty, 0),
        plyType: parseNumeric(sleavePlyType, 5),
        fluteExtraPercent: parseNumeric(sleaveFluteExtraPercent, 45),
        pricePerKg: parseNumeric(sleavePricePerKg, 60),
        qtyData: parseNumeric(sleaveQtyData, 2),
        gstPercent: parseNumeric(sleaveGstPercent, 18),
        reelSizeAdjust: parseNumeric(sleaveReelSizePlus, 0) - parseNumeric(sleaveReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(sleaveCutSizePlus, 0) - parseNumeric(sleaveCutSizeMinus, 0),
        gsmPaper: parseNumeric(sleaveGsmPaper, 150),
        gsmFlute: parseNumeric(sleaveGsmFlute, 150),
        gsmPacking: parseNumeric(sleaveGsmPacking, 150),
        isScreenPrinting: sleaveIsScreenPrinting,
        screenPrintingPricePerBox: parseNumeric(sleaveScreenPrintingPricePerBox, 0),
        isCallicoCost: sleaveIsCallicoCost,
        callicoPricePerBox: parseNumeric(sleaveCallicoPricePerBox, 0)
      });
      setSleaveResults(computed);
    } catch (e) {
      console.error('Sleave calculation error:', e);
      setSleaveResults(null);
    }
  }, [sleaveSizeId, sleaveSizes, sleaveQty, sleavePlyType, sleaveFluteExtraPercent, sleavePricePerKg, sleaveQtyData, sleaveGstPercent, sleaveReelSizePlus, sleaveReelSizeMinus, sleaveCutSizePlus, sleaveCutSizeMinus, sleaveFlabL, sleaveFlabW, sleaveGsmPaper, sleaveGsmFlute, sleaveGsmPacking, sleaveIsScreenPrinting, sleaveScreenPrintingPricePerBox, sleaveIsCallicoCost, sleaveCallicoPricePerBox]);

  // ─── Coller Box live calculation ─────────────────────────────────────────────
  useEffect(() => {
    if (!collerBoxSizeId || !collerBoxQty || !collerBoxPlyType || collerBoxGstPercent === undefined || !collerBoxGsmPaper || !collerBoxGsmFlute) {
      setCollerBoxResults(null);
      return;
    }
    const selectedSize = collerBoxSizes.find(s => String(s.id) === String(collerBoxSizeId));
    if (!selectedSize) { setCollerBoxResults(null); return; }
    try {
      const computed = calculateCollerBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: parseNumeric(collerBoxFlabL, 0),
        flabW: parseNumeric(collerBoxFlabW, 0),
        qtyBoxes: parseNumeric(collerBoxQty, 0),
        plyType: parseNumeric(collerBoxPlyType, 5),
        fluteExtraPercent: parseNumeric(collerBoxFluteExtraPercent, 45),
        pricePerKg: parseNumeric(collerBoxPricePerKg, 60),
        qtyData: parseNumeric(collerBoxQtyData, 2),
        gstPercent: parseNumeric(collerBoxGstPercent, 18),
        reelSizeAdjust: parseNumeric(collerBoxReelSizePlus, 0) - parseNumeric(collerBoxReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(collerBoxCutSizePlus, 0) - parseNumeric(collerBoxCutSizeMinus, 0),
        gsmPaper: parseNumeric(collerBoxGsmPaper, 150),
        gsmFlute: parseNumeric(collerBoxGsmFlute, 150),
        gsmPacking: parseNumeric(collerBoxGsmPacking, 150)
      });
      setCollerBoxResults(computed);
    } catch (e) {
      console.error('Coller Box calculation error:', e);
      setCollerBoxResults(null);
    }
  }, [collerBoxSizeId, collerBoxSizes, collerBoxQty, collerBoxPlyType, collerBoxFluteExtraPercent, collerBoxPricePerKg, collerBoxQtyData, collerBoxGstPercent, collerBoxReelSizePlus, collerBoxReelSizeMinus, collerBoxCutSizePlus, collerBoxCutSizeMinus, collerBoxFlabL, collerBoxFlabW, collerBoxGsmPaper, collerBoxGsmFlute, collerBoxGsmPacking]);


  // ─── Fetch Universal Type sizes when uTypeCompanyId changes ─────────────────
  useEffect(() => {
    if (!uTypeCompanyId) return;
    async function getSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${uTypeCompanyId}/sizes?calc_type=universal`);
        if (res.ok) {
          const data = await res.json();
          setUTypeSizes(data);
          setUTypeSizeId(prev => (data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
        }
      } catch (err) {
        console.error('Error fetching universal type sizes:', err);
      }
    }
    getSizes();
  }, [uTypeCompanyId]);

  // ─── Top Side Tray Box live calculation ────────────────────────────────────────
  useEffect(() => {
    if (!uBoxSizeId || !uBoxQty || !uBoxPlyType || uBoxGstPercent === undefined || !uBoxGsmPaper || !uBoxGsmFlute) {
      setUBoxResults(null);
      return;
    }
    const selectedSize = uBoxSizes.find(s => String(s.id) === String(uBoxSizeId));
    if (!selectedSize) { setUBoxResults(null); return; }
    try {
      const computed = calculateTopSideTrayBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        flabL: parseNumeric(uBoxFlabL, 0),
        flabW: parseNumeric(uBoxFlabW, 0),
        qtyBoxes: parseNumeric(uBoxQty, 0),
        plyType: parseNumeric(uBoxPlyType, 5),
        fluteExtraPercent: parseNumeric(uBoxFluteExtraPercent, 45),
        pricePerKg: parseNumeric(uBoxPricePerKg, 60),
        qtyData: parseNumeric(uBoxQtyData, 2),
        gstPercent: parseNumeric(uBoxGstPercent, 18),
        reelSizeAdjust: parseNumeric(uBoxReelSizePlus, 0) - parseNumeric(uBoxReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(uBoxCutSizePlus, 0) - parseNumeric(uBoxCutSizeMinus, 0),
        gsmPaper: parseNumeric(uBoxGsmPaper, 150),
        gsmFlute: parseNumeric(uBoxGsmFlute, 150),
        gsmPacking: parseNumeric(uBoxGsmPacking, 150),
        isScreenPrinting: uBoxIsScreenPrinting,
        screenPrintingPricePerBox: parseNumeric(uBoxScreenPrintingPricePerBox, 0),
        isCallicoCost: uBoxIsCallicoCost,
        callicoPricePerBox: parseNumeric(uBoxCallicoPricePerBox, 0)
      });
      setUBoxResults(computed);
    } catch (e) {
      console.error('Top Side Tray Box calculation error:', e);
      setUBoxResults(null);
    }
  }, [uBoxSizeId, uBoxSizes, uBoxQty, uBoxPlyType, uBoxFluteExtraPercent, uBoxPricePerKg, uBoxQtyData, uBoxGstPercent, uBoxReelSizePlus, uBoxReelSizeMinus, uBoxCutSizePlus, uBoxCutSizeMinus, uBoxFlabL, uBoxFlabW, uBoxGsmPaper, uBoxGsmFlute, uBoxGsmPacking, uBoxIsScreenPrinting, uBoxScreenPrintingPricePerBox, uBoxIsCallicoCost, uBoxCallicoPricePerBox]);


  // ─── Universal Type live calculation ────────────────────────────────────────
  useEffect(() => {
    if (!uTypeSizeId || !uTypeQty || !uTypePlyType || uTypeGstPercent === undefined || !uTypeGsmPaper || !uTypeGsmFlute) {
      setUTypeResults(null);
      return;
    }
    const selectedSize = uTypeSizes.find(s => String(s.id) === String(uTypeSizeId));
    if (!selectedSize) { setUTypeResults(null); return; }
    try {
      const computed = calculateUniversalTypePricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: parseNumeric(uTypeQty, 0),
        plyType: parseNumeric(uTypePlyType, 5),
        fluteExtraPercent: parseNumeric(uTypeFluteExtraPercent, 45),
        pricePerKg: parseNumeric(uTypePricePerKg, 60),
        qtyData: parseNumeric(uTypeQtyData, 2),
        gstPercent: parseNumeric(uTypeGstPercent, 18),
        reelSizeAdjust: parseNumeric(uTypeReelSizePlus, 0) - parseNumeric(uTypeReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(uTypeCutSizePlus, 0) - parseNumeric(uTypeCutSizeMinus, 0),
        gsmPaper: parseNumeric(uTypeGsmPaper, 150),
        gsmFlute: parseNumeric(uTypeGsmFlute, 150),
        gsmPacking: parseNumeric(uTypeGsmPacking, 150),
        isScreenPrinting: uTypeIsScreenPrinting,
        screenPrintingPricePerBox: parseNumeric(uTypeScreenPrintingPricePerBox, 0),
        isCallicoCost: uTypeIsCallicoCost,
        callicoPricePerBox: parseNumeric(uTypeCallicoPricePerBox, 0)
      });
      setUTypeResults(computed);
    } catch (e) {
      console.error('Universal Type calculation error:', e);
      setUTypeResults(null);
    }
  }, [uTypeSizeId, uTypeSizes, uTypeQty, uTypePlyType, uTypeFluteExtraPercent, uTypePricePerKg, uTypeQtyData, uTypeGstPercent, uTypeReelSizePlus, uTypeReelSizeMinus, uTypeCutSizePlus, uTypeCutSizeMinus, uTypeGsmPaper, uTypeGsmFlute, uTypeGsmPacking, uTypeIsScreenPrinting, uTypeScreenPrintingPricePerBox, uTypeIsCallicoCost, uTypeCallicoPricePerBox]);

  // ─── Fetch Full Closing Box sizes when fcBoxCompanyId changes ───────────────
  useEffect(() => {
    if (!fcBoxCompanyId) return;
    async function getFcBoxSizes() {
      try {
        const res = await authenticatedFetch(`/api/companies/${fcBoxCompanyId}/sizes?calc_type=full_closing`);
        if (res.ok) {
          const data = await res.json();
          setFcBoxSizes(data);
          setFcBoxSizeId(prev => (data.some(s => String(s.id) === String(prev)) ? prev : (data.length > 0 ? data[0].id : '')));
        }
      } catch (err) {
        console.error('Error fetching full closing box sizes:', err);
      }
    }
    getFcBoxSizes();
  }, [fcBoxCompanyId]);

  // Sync flute/packing GSMs with paper GSM for full closing box
  useEffect(() => {
    setFcBoxGsmFlute(fcBoxGsmPaper);
    setFcBoxGsmPacking(fcBoxGsmPaper);
  }, [fcBoxGsmPaper]);

  // ─── Full Closing Box live calculation ─────────────────────────────────────
  useEffect(() => {
    if (!fcBoxSizeId || !fcBoxQtyBoxes || !fcBoxPlyType || fcBoxGstPercent === undefined || !fcBoxGsmPaper || !fcBoxGsmFlute) {
      setFcBoxResults(null);
      return;
    }
    const selectedSize = fcBoxSizes.find(s => String(s.id) === String(fcBoxSizeId));
    if (!selectedSize) return;
    try {
      const computed = calculateFullClosingBoxPricing({
        L: convertToInches(selectedSize.length_inches, selectedSize.unit),
        W: convertToInches(selectedSize.width_inches, selectedSize.unit),
        H: convertToInches(selectedSize.height_inches, selectedSize.unit),
        qtyBoxes: parseNumeric(fcBoxQtyBoxes, 0),
        plyType: parseNumeric(fcBoxPlyType, 5),
        fluteExtraPercent: parseNumeric(fcBoxFluteExtraPercent, 45),
        pricePerKg: parseNumeric(fcBoxPricePerKg, 60),
        qtyData: parseNumeric(fcBoxQtyData, 2),
        gstPercent: parseNumeric(fcBoxGstPercent, 18),
        reelSizeAdjust: parseNumeric(fcBoxReelSizePlus, 0) - parseNumeric(fcBoxReelSizeMinus, 0),
        cutSizeAdjust: parseNumeric(fcBoxCutSizePlus, 0) - parseNumeric(fcBoxCutSizeMinus, 0),
        gsmPaper: parseNumeric(fcBoxGsmPaper, 150),
        gsmFlute: parseNumeric(fcBoxGsmFlute, 150),
        gsmPacking: parseNumeric(fcBoxGsmPacking, 150),
        isDuplex: fcBoxIsDuplex,
        duplexPrice: Number(fcBoxDuplexPrice),
        isLaminated: fcBoxIsLaminated,
        laminationRupees: Number(fcBoxLaminationRupees),
        isPrintingCharge: fcBoxIsPrintingCharge,
        printingLabourCharge: Number(fcBoxPrintingLabourCharge),
        printingPlatePrice: Number(fcBoxPrintingPlatePrice),
        printingNoOfPlates: Number(fcBoxPrintingNoOfPlates),
        isInkCost: fcBoxIsInkCost,
        inkPricePerBox: Number(fcBoxInkPricePerBox),
        isScreenPrinting: fcBoxIsScreenPrinting,
        screenPrintingPricePerBox: Number(fcBoxScreenPrintingPricePerBox),
        isCallicoCost: fcBoxIsCallicoCost,
        callicoPricePerBox: Number(fcBoxCallicoPricePerBox)
      });
      setFcBoxResults(computed);
    } catch (e) {
      console.error('Full Closing Box calculation error:', e);
      setFcBoxResults(null);
    }
  }, [fcBoxSizeId, fcBoxSizes, fcBoxQtyBoxes, fcBoxPlyType, fcBoxFluteExtraPercent, fcBoxPricePerKg, fcBoxQtyData, fcBoxGstPercent, fcBoxReelSizePlus, fcBoxReelSizeMinus, fcBoxCutSizePlus, fcBoxCutSizeMinus, fcBoxGsmPaper, fcBoxGsmFlute, fcBoxGsmPacking, fcBoxIsDuplex, fcBoxDuplexPrice, fcBoxIsLaminated, fcBoxLaminationRupees, fcBoxIsPrintingCharge, fcBoxPrintingLabourCharge, fcBoxPrintingPlatePrice, fcBoxPrintingNoOfPlates, fcBoxIsInkCost, fcBoxInkPricePerBox, fcBoxIsScreenPrinting, fcBoxScreenPrintingPricePerBox, fcBoxIsCallicoCost, fcBoxCallicoPricePerBox]);

  // ─── Full Closing Box Save ──────────────────────────────────────────────────
  const handleFcBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!fcBoxResults) {
      setFcBoxError('Please fill in all details to generate a valid calculation first.');
      return;
    }
    const rawFcBoxCustomerCopy = fcBoxShowNewCustomerCopyInput ? fcBoxNewCustomerCopyFile : fcBoxCustomerCopyFile;
    const finalFcBoxCustomerCopy = rawFcBoxCustomerCopy ? rawFcBoxCustomerCopy.trim() : '';
    if (!finalFcBoxCustomerCopy) {
      setFcBoxError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(fcBoxShowNewCustomerCopyInput, fcBoxNewCustomerCopyFile, setFcBoxError)) return;

    setFcBoxSaving(true);
    setFcBoxError('');

    let finalCustomerName = finalFcBoxCustomerCopy;
    const extraFcMeta = {
      duplexRate: parseNumeric(fcBoxDuplexPrice, 60),
      laminationRate: parseNumeric(fcBoxLaminationRupees, 0),
      printingLabour: parseNumeric(fcBoxPrintingLabourCharge, 0),
      printingPlatePrice: parseNumeric(fcBoxPrintingPlatePrice, 0),
      printingNoOfPlates: parseNumeric(fcBoxPrintingNoOfPlates, 0)
    };
    finalCustomerName = `[ExtraChargesMeta: ${JSON.stringify(extraFcMeta)}] ${finalCustomerName}`;

    if (fcBoxIsDuplex) {
      finalCustomerName = `[Duplex: ₹${Number(fcBoxResults.duplexSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (fcBoxIsLaminated) {
      finalCustomerName = `[Laminated: ₹${Number(fcBoxResults.laminationSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (fcBoxIsPrintingCharge) {
      finalCustomerName = `[Printing: ₹${Number(fcBoxResults.singleBoxPrintingCharge).toFixed(2)}] ${finalCustomerName}`;
    }
    if (fcBoxIsInkCost) {
      finalCustomerName = `[Ink: ₹${Number(fcBoxResults.inkSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (fcBoxIsScreenPrinting) {
      finalCustomerName = `[ScreenPrinting: ₹${Number(fcBoxResults.screenPrintingSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (fcBoxIsCallicoCost) {
      finalCustomerName = `[Callico: ₹${Number(fcBoxResults.callicoSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }

    // Prefix with Full Closing Box
    finalCustomerName = `${FULL_CLOSING_BOX_CALC_PREFIX} ${finalCustomerName}`;

    const payload = {
      calc_type: 'full_closing',
      company_id: fcBoxCompanyId,
      size_id: fcBoxSizeId,
      customer_name: finalCustomerName,
      company_reference: '',
      quantity_of_boxes: Number(fcBoxQtyBoxes),
      ply_type: Number(fcBoxPlyType),
      flute_extra_percent: Number(fcBoxFluteExtraPercent),
      price_per_kg: Number(fcBoxPricePerKg),
      gsm: Number(fcBoxGsmPaper),
      gsm_paper: Number(fcBoxGsmPaper),
      gsm_flute: Number(fcBoxGsmFlute),
      gsm_packing: fcBoxIsDuplex ? 0 : Number(fcBoxGsmPacking),
      bf: Number(fcBoxBf),
      quantity_of_data: Number(fcBoxQtyData),
      gst_percent: Number(fcBoxGstPercent),
      reel_size_adjust: parseNumeric(fcBoxReelSizePlus, 0) - parseNumeric(fcBoxReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(fcBoxCutSizePlus, 0) - parseNumeric(fcBoxCutSizeMinus, 0),
      reel_size: fcBoxResults.reelSize,
      cut_size: fcBoxResults.cutSize,
      paper: fcBoxResults.paper,
      flute: fcBoxResults.flute,
      weight_per_unit: fcBoxResults.weightPerUnit,
      box_weight: fcBoxResults.boxWeight,
      single_box_price: fcBoxResults.singleBoxPrice,
      per_piece_price: fcBoxIsDuplex ? null : fcBoxResults.singleBoxPrice,
      kraft_box_cost: fcBoxIsDuplex ? fcBoxResults.kraftSingleBoxPrice : null,
      kraft_subtotal: fcBoxIsDuplex ? fcBoxResults.kraftBoxCost : null,
      duplex_box_cost: fcBoxIsDuplex ? fcBoxResults.duplexSingleBoxPrice : null,
      duplex_subtotal: fcBoxIsDuplex ? fcBoxResults.duplexBoxCost : null,
      total_cost: fcBoxResults.totalCost,
      gst_amount: fcBoxResults.gstAmount,
      grand_total: fcBoxResults.grandTotal,
      is_duplex: fcBoxIsDuplex,
      duplex_price: Number(fcBoxDuplexPrice),
      is_laminated: fcBoxIsLaminated,
      lamination_price: Number(fcBoxLaminationRupees),
      is_printing: fcBoxIsPrintingCharge,
      printing_price: Number(fcBoxPrintingLabourCharge),
      is_ink: fcBoxIsInkCost,
      ink_price: Number(fcBoxInkPricePerBox),
      is_screen_printing: fcBoxIsScreenPrinting,
      screen_printing_price: Number(fcBoxScreenPrintingPricePerBox),
      is_callico: fcBoxIsCallicoCost,
      callico_price: Number(fcBoxCallicoPricePerBox)
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'full_closing' || editingType === 'full_closing_box');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setFcBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Full closing box calculation updated successfully!' : (isSaveAsNew ? 'New full closing box copy saved successfully!' : 'Full closing box calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setFcBoxError(errData.message || 'Error saving full closing box calculation details.');
      }
    } catch (err) {
      setFcBoxError('Server connection error. Please try again.');
    } finally {
      setFcBoxSaving(false);
    }
  };

  // ─── Box Save ──────────────────────────────────────────────────────────────
  const handleBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!boxResults) {
      setBoxError('Please fill in all details to generate a valid calculation first.');
      return;
    }
    const rawBoxCustomerCopy = boxShowNewCustomerCopyInput ? boxNewCustomerCopyFile : boxCustomerCopyFile;
    const finalBoxCustomerCopy = rawBoxCustomerCopy ? rawBoxCustomerCopy.trim() : '';
    if (!finalBoxCustomerCopy) {
      setBoxError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(boxShowNewCustomerCopyInput, boxNewCustomerCopyFile, setBoxError)) return;

    setBoxSaving(true);
    setBoxError('');

    let finalCustomerName = finalBoxCustomerCopy;
    const extraBoxMeta = {
      duplexRate: parseNumeric(boxDuplexPrice, 60),
      laminationRate: parseNumeric(boxLaminationRupees, 0),
      printingLabour: parseNumeric(boxPrintingLabourCharge, 0),
      printingPlatePrice: parseNumeric(boxPrintingPlatePrice, 0),
      printingNoOfPlates: parseNumeric(boxPrintingNoOfPlates, 0)
    };
    finalCustomerName = `[ExtraChargesMeta: ${JSON.stringify(extraBoxMeta)}] ${finalCustomerName}`;

    if (boxIsDuplex) {
      finalCustomerName = `[Duplex: ₹${Number(boxResults.duplexSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (boxIsLaminated) {
      finalCustomerName = `[Laminated: ₹${Number(boxResults.laminationSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (boxIsPrintingCharge) {
      finalCustomerName = `[Printing: ₹${Number(boxResults.singleBoxPrintingCharge).toFixed(2)}] ${finalCustomerName}`;
    }
    if (boxIsInkCost) {
      finalCustomerName = `[Ink: ₹${Number(boxResults.inkSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (boxIsScreenPrinting) {
      finalCustomerName = `[ScreenPrinting: ₹${Number(boxResults.screenPrintingSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }
    if (boxIsCallicoCost) {
      finalCustomerName = `[Callico: ₹${Number(boxResults.callicoSingleBoxPrice).toFixed(2)}] ${finalCustomerName}`;
    }

    const payload = {
      calc_type: 'box',
      company_id: boxCompanyId,
      size_id: boxSizeId,
      customer_name: finalCustomerName,
      company_reference: '',
      quantity_of_boxes: Number(boxQtyBoxes),
      ply_type: Number(boxPlyType),
      flute_extra_percent: Number(boxFluteExtraPercent),
      price_per_kg: Number(boxPricePerKg),
      gsm: Number(boxGsmPaper),
      gsm_paper: Number(boxGsmPaper),
      gsm_flute: Number(boxGsmFlute),
      gsm_packing: boxIsDuplex ? 0 : Number(boxGsmPacking),
      bf: Number(boxBf),
      quantity_of_data: Number(boxQtyData),
      gst_percent: Number(boxGstPercent),
      reel_size_adjust: parseNumeric(boxReelSizePlus, 0) - parseNumeric(boxReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(boxCutSizePlus, 0) - parseNumeric(boxCutSizeMinus, 0),
      reel_size: boxResults.reelSize,
      cut_size: boxResults.cutSize,
      paper: boxResults.paper,
      flute: boxResults.flute,
      weight_per_unit: boxResults.weightPerUnit,
      box_weight: boxResults.boxWeight,
      single_box_price: boxResults.singleBoxPrice,
      per_piece_price: boxIsDuplex ? null : boxResults.singleBoxPrice,
      kraft_box_cost: boxIsDuplex ? boxResults.kraftSingleBoxPrice : null,
      kraft_subtotal: boxIsDuplex ? boxResults.kraftBoxCost : null,
      duplex_box_cost: boxIsDuplex ? boxResults.duplexSingleBoxPrice : null,
      duplex_subtotal: boxIsDuplex ? boxResults.duplexBoxCost : null,
      total_cost: boxResults.totalCost,
      gst_amount: boxResults.gstAmount,
      grand_total: boxResults.grandTotal,
      is_duplex: boxIsDuplex,
      duplex_price: Number(boxDuplexPrice),
      is_laminated: boxIsLaminated,
      lamination_price: Number(boxLaminationRupees),
      is_printing: boxIsPrintingCharge,
      printing_price: Number(boxPrintingLabourCharge),
      is_ink: boxIsInkCost,
      ink_price: Number(boxInkPricePerBox),
      is_screen_printing: boxIsScreenPrinting,
      screen_printing_price: Number(boxScreenPrintingPricePerBox),
      is_callico: boxIsCallicoCost,
      callico_price: Number(boxCallicoPricePerBox)
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'box';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast(isEditingThisCard ? 'Calculation updated successfully!' : (isSaveAsNew ? 'New calculation copy saved successfully!' : 'Calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1200);
      } else {
        const errData = await res.json();
        setBoxError(errData.message || 'Error saving calculation details.');
        showToast(errData.message || 'Error saving calculation details.', 'error');
      }
    } catch (err) {
      setBoxError('Server connection error. Please try again.');
      showToast('Server connection error. Please try again.', 'error');
    } finally {
      setBoxSaving(false);
    }
  };

  // ─── Pad Save ──────────────────────────────────────────────────────────────
  const handlePadSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!padResults) {
      setPadError('Please fill in all details to generate a valid pad calculation first.');
      return;
    }
    const rawPadCustomerCopy = padShowNewCustomerCopyInput ? padNewCustomerCopyFile : padCustomerCopyFile;
    const finalPadCustomerCopy = rawPadCustomerCopy ? rawPadCustomerCopy.trim() : '';
    if (!finalPadCustomerCopy) {
      setPadError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(padShowNewCustomerCopyInput, padNewCustomerCopyFile, setPadError)) return;

    setPadSaving(true);
    setPadError('');

    const payload = {
      calc_type: 'pad',
      company_id: padCompanyId,
      size_id: padSizeId,
      // Prefix with [Pad] so history views can identify this entry
      customer_name: `${PAD_CALC_PREFIX} ${finalPadCustomerCopy}`,
      company_reference: '',
      quantity_of_boxes: Number(padQtyPads),
      ply_type: Number(padPlyType),
      flute_extra_percent: Number(padFluteExtraPercent),
      price_per_kg: Number(padPricePerKg),
      gsm: Number(padGsmPaper),
      gsm_paper: Number(padGsmPaper),
      gsm_flute: Number(padGsmFlute),
      gsm_packing: Number(padGsmPacking),
      bf: Number(padBf),
      quantity_of_data: Number(padQtyData),
      gst_percent: Number(padGstPercent),
      reel_size_adjust: parseNumeric(padReelSizePlus, 0) - parseNumeric(padReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(padCutSizePlus, 0) - parseNumeric(padCutSizeMinus, 0),
      reel_size: padResults.reelSize,
      cut_size: padResults.cutSize,
      paper: padResults.paper,
      flute: padResults.flute,
      weight_per_unit: padResults.weightPerUnit,
      box_weight: padResults.padWeight,
      single_box_price: padResults.singlePadPrice,
      per_piece_price: padResults.singlePadPrice,
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: padResults.totalCost,
      gst_amount: padResults.gstAmount,
      grand_total: padResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'pad';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setPadSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Pad calculation updated successfully!' : (isSaveAsNew ? 'New pad copy saved successfully!' : 'Pad calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setPadError(errData.message || 'Error saving pad calculation details.');
      }
    } catch (err) {
      setPadError('Server connection error. Please try again.');
    } finally {
      setPadSaving(false);
    }
  };

  // ─── Partition Save ─────────────────────────────────────────────────────────────
  const handlePartitionSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!partitionResults) {
      setPartitionError('Please fill in all details to generate a valid partition calculation first.');
      return;
    }
    const rawPartitionCustomerCopy = partitionShowNewCustomerCopyInput ? partitionNewCustomerCopyFile : partitionCustomerCopyFile;
    const finalPartitionCustomerCopy = rawPartitionCustomerCopy ? rawPartitionCustomerCopy.trim() : '';
    if (!finalPartitionCustomerCopy) {
      setPartitionError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(partitionShowNewCustomerCopyInput, partitionNewCustomerCopyFile, setPartitionError)) return;

    setPartitionSaving(true);
    setPartitionError('');

    const selectedOption = partitionGroupedSizes.find(s => s.id === partitionSizeId);
    // For paired: use first partition's size_id; for single: use the size id
    const sizeIdForDb = selectedOption?.type === 'paired' ? selectedOption.first.id : (selectedOption?.size?.id || partitionSizeId);

    let payload;
    if (partitionResults.isPaired) {
      const pairMetaObj = {
        pairId: partitionSizeId,
        p1SizeId: selectedOption?.first?.id,
        p2SizeId: selectedOption?.second?.id,
        p1Label: selectedOption?.first?.label || '',
        p2Label: selectedOption?.second?.label || '',
        p1Reel: partitionResults.first.reelSize,
        p1Cut: partitionResults.first.cutSize,
        p2Reel: partitionResults.second.reelSize,
        p2Cut: partitionResults.second.cutSize,
        p1Slots: partitionResults.first.slotCount || selectedOption?.first?.slot_count || 1,
        p2Slots: partitionResults.second.slotCount || selectedOption?.second?.slot_count || 1
      };
      const pairMetaTag = `[PairMeta: ${JSON.stringify(pairMetaObj)}]`;

      payload = {
        calc_type: 'partition',
        company_id: partitionCompanyId,
        size_id: sizeIdForDb,
        customer_name: `${PARTITION_CALC_PREFIX} ${pairMetaTag} ${finalPartitionCustomerCopy}`,
        company_reference: '',
        quantity_of_boxes: Number(partitionQtyPads),
        ply_type: Number(partitionPlyType),
        flute_extra_percent: Number(partitionFluteExtraPercent),
        price_per_kg: Number(partitionPricePerKg),
        gsm: Number(partitionGsmPaper),
        gsm_paper: Number(partitionGsmPaper),
        gsm_flute: Number(partitionGsmFlute),
        gsm_packing: Number(partitionGsmPacking),
        bf: Number(partitionBf),
        quantity_of_data: Number(partitionSet),
        gst_percent: Number(partitionGstPercent),
        reel_size_adjust: parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0),
        cut_size_adjust: parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0),
        reel_size: partitionResults.first.reelSize,
        cut_size: partitionResults.first.cutSize,
        paper: partitionResults.paper,
        flute: partitionResults.flute,
        weight_per_unit: partitionResults.first.weightPerUnit + partitionResults.second.weightPerUnit,
        box_weight: partitionResults.first.boxWeight + partitionResults.second.boxWeight,
        single_box_price: partitionResults.singleSetPrice,
        per_piece_price: partitionResults.singleSetPrice,
        kraft_box_cost: null,
        kraft_subtotal: null,
        duplex_box_cost: null,
        duplex_subtotal: null,
        total_cost: partitionResults.totalCost,
        gst_amount: partitionResults.gstAmount,
        grand_total: partitionResults.grandTotal
      };
    } else {
      payload = {
        calc_type: 'partition',
        company_id: partitionCompanyId,
        size_id: sizeIdForDb,
        customer_name: `${PARTITION_CALC_PREFIX} ${finalPartitionCustomerCopy}`,
        company_reference: '',
        quantity_of_boxes: Number(partitionQtyPads),
        ply_type: Number(partitionPlyType),
        flute_extra_percent: Number(partitionFluteExtraPercent),
        price_per_kg: Number(partitionPricePerKg),
        gsm: Number(partitionGsmPaper),
        gsm_paper: Number(partitionGsmPaper),
        gsm_flute: Number(partitionGsmFlute),
        gsm_packing: Number(partitionGsmPacking),
        bf: Number(partitionBf),
        quantity_of_data: Number(partitionQtyData),
        gst_percent: Number(partitionGstPercent),
        reel_size_adjust: parseNumeric(partitionReelSizePlus, 0) - parseNumeric(partitionReelSizeMinus, 0),
        cut_size_adjust: parseNumeric(partitionCutSizePlus, 0) - parseNumeric(partitionCutSizeMinus, 0),
        reel_size: partitionResults.reelSize,
        cut_size: partitionResults.cutSize,
        paper: partitionResults.paper,
        flute: partitionResults.flute,
        weight_per_unit: partitionResults.weightPerUnit,
        box_weight: partitionResults.padWeight,
        single_box_price: partitionResults.singlePadPrice,
        per_piece_price: partitionResults.singlePadPrice,
        kraft_box_cost: null,
        kraft_subtotal: null,
        duplex_box_cost: null,
        duplex_subtotal: null,
        total_cost: partitionResults.totalCost,
        gst_amount: partitionResults.gstAmount,
        grand_total: partitionResults.grandTotal
      };
    }

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'partition';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setPartitionSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Partition calculation updated successfully!' : (isSaveAsNew ? 'New partition copy saved successfully!' : 'Partition calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setPartitionError(errData.message || 'Error saving partition calculation details.');
      }
    } catch (err) {
      setPartitionError('Server connection error. Please try again.');
    } finally {
      setPartitionSaving(false);
    }
  };


  // ─── Tray Save ─────────────────────────────────────────────────────────────
  const handleTraySave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!trayResults) {
      setTrayError('Please fill in all details to generate a valid tray calculation first.');
      return;
    }
    const rawTrayCustomerCopy = trayShowNewCustomerCopyInput ? trayNewCustomerCopyFile : trayCustomerCopyFile;
    const finalTrayCustomerCopy = rawTrayCustomerCopy ? rawTrayCustomerCopy.trim() : '';
    if (!finalTrayCustomerCopy) {
      setTrayError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(trayShowNewCustomerCopyInput, trayNewCustomerCopyFile, setTrayError)) return;

    setTraySaving(true);
    setTrayError('');

    const payload = {
      calc_type: 'tray',
      company_id: trayCompanyId,
      size_id: traySizeId,
      customer_name: `${TRAY_CALC_PREFIX} ${finalTrayCustomerCopy}`,
      company_reference: '',
      quantity_of_boxes: Number(trayQtyTrays),
      ply_type: Number(trayPlyType),
      flute_extra_percent: Number(trayFluteExtraPercent),
      price_per_kg: Number(trayPricePerKg),
      gsm: Number(trayGsmPaper),
      gsm_paper: Number(trayGsmPaper),
      gsm_flute: Number(trayGsmFlute),
      gsm_packing: Number(trayGsmPacking),
      bf: Number(trayBf),
      quantity_of_data: Number(trayQtyData),
      gst_percent: Number(trayGstPercent),
      reel_size_adjust: parseNumeric(trayReelSizePlus, 0) - parseNumeric(trayReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(trayCutSizePlus, 0) - parseNumeric(trayCutSizeMinus, 0),
      reel_size: trayResults.reelSize,
      cut_size: trayResults.cutSize,
      paper: trayResults.paper,
      flute: trayResults.flute,
      weight_per_unit: trayResults.weightPerUnit,
      box_weight: trayResults.trayWeight,
      single_box_price: trayResults.singleTrayPrice,
      per_piece_price: trayResults.singleTrayPrice,
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: trayResults.totalCost,
      gst_amount: trayResults.gstAmount,
      grand_total: trayResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'tray';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setTraySavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Tray calculation updated successfully!' : (isSaveAsNew ? 'New tray copy saved successfully!' : 'Tray calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setTrayError(errData.message || 'Error saving tray calculation details.');
      }
    } catch (err) {
      setTrayError('Server connection error. Please try again.');
    } finally {
      setTraySaving(false);
    }
  };

  // ─── Sleave Save ─────────────────────────────────────────────────────────
  const handleSleaveSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!sleaveResults) {
      setSleaveError('Please fill in all details to generate a valid sleave calculation first.');
      return;
    }
    const rawSleaveCustomerCopy = sleaveShowNewCustomerCopyInput ? sleaveNewCustomerCopyFile : sleaveCustomerCopyFile;
    const finalSleaveCustomerCopy = rawSleaveCustomerCopy ? rawSleaveCustomerCopy.trim() : '';
    if (!finalSleaveCustomerCopy) {
      setSleaveError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(sleaveShowNewCustomerCopyInput, sleaveNewCustomerCopyFile, setSleaveError)) return;

    setSleaveSaving(true);
    setSleaveError('');

    const flabMetaObj = {
      flabL: parseNumeric(sleaveFlabL, 0),
      flabW: parseNumeric(sleaveFlabW, 0)
    };
    const flabMetaTag = `[FlabMeta: ${JSON.stringify(flabMetaObj)}]`;

    let finalSleaveCustName = `${SLEAVE_CALC_PREFIX} ${flabMetaTag} ${finalSleaveCustomerCopy}`;
    if (sleaveIsScreenPrinting && sleaveResults?.screenPrintingSingleBoxPrice > 0) {
      finalSleaveCustName = `[ScreenPrinting: ₹${Number(sleaveResults.screenPrintingSingleBoxPrice).toFixed(2)}] ${finalSleaveCustName}`;
    }
    if (sleaveIsCallicoCost && sleaveResults?.callicoSingleBoxPrice > 0) {
      finalSleaveCustName = `[Callico: ₹${Number(sleaveResults.callicoSingleBoxPrice).toFixed(2)}] ${finalSleaveCustName}`;
    }

    const payload = {
      calc_type: 'sleave',
      company_id: sleaveCompanyId,
      size_id: sleaveSizeId,
      customer_name: finalSleaveCustName,
      company_reference: '',
      quantity_of_boxes: Number(sleaveQty),
      ply_type: Number(sleavePlyType),
      flute_extra_percent: Number(sleaveFluteExtraPercent),
      price_per_kg: Number(sleavePricePerKg),
      gsm: Number(sleaveGsmPaper),
      gsm_paper: Number(sleaveGsmPaper),
      gsm_flute: Number(sleaveGsmFlute),
      gsm_packing: Number(sleaveGsmPacking),
      bf: Number(sleaveBf),
      quantity_of_data: Number(sleaveQtyData),
      gst_percent: Number(sleaveGstPercent),
      reel_size_adjust: parseNumeric(sleaveReelSizePlus, 0) - parseNumeric(sleaveReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(sleaveCutSizePlus, 0) - parseNumeric(sleaveCutSizeMinus, 0),
      reel_size: sleaveResults.reelSize,
      cut_size: sleaveResults.cutSize,
      paper: sleaveResults.paper,
      flute: sleaveResults.flute,
      weight_per_unit: sleaveResults.weightPerUnit,
      box_weight: sleaveResults.sleaveWeight,
      single_box_price: sleaveResults.singleSleavePrice,
      per_piece_price: sleaveResults.singleSleavePrice,
      is_screen_printing: sleaveIsScreenPrinting,
      screen_printing_price: Number(sleaveScreenPrintingPricePerBox),
      is_callico: sleaveIsCallicoCost,
      callico_price: Number(sleaveCallicoPricePerBox),
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: sleaveResults.totalCost,
      gst_amount: sleaveResults.gstAmount,
      grand_total: sleaveResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && editingType === 'sleave';
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setSleaveSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Sleave calculation updated successfully!' : (isSaveAsNew ? 'New sleave copy saved successfully!' : 'Sleave calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setSleaveError(errData.message || 'Error saving sleave calculation details.');
      }
    } catch (err) {
      setSleaveError('Server connection error. Please try again.');
    } finally {
      setSleaveSaving(false);
    }
  };

  // ─── Coller Box Save ─────────────────────────────────────────────────────────
  const handleCollerBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!collerBoxResults) {
      setCollerBoxError('Please fill in all details to generate a valid coller box calculation first.');
      return;
    }
    const rawCollerBoxCustomerCopy = collerBoxShowNewCustomerCopyInput ? collerBoxNewCustomerCopyFile : collerBoxCustomerCopyFile;
    const finalCollerBoxCustomerCopy = rawCollerBoxCustomerCopy ? rawCollerBoxCustomerCopy.trim() : '';
    if (!finalCollerBoxCustomerCopy) {
      setCollerBoxError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(collerBoxShowNewCustomerCopyInput, collerBoxNewCustomerCopyFile, setCollerBoxError)) return;

    setCollerBoxSaving(true);
    setCollerBoxError('');

    const collerFlabMetaObj = {
      flabL: parseNumeric(collerBoxFlabL, 0),
      flabW: parseNumeric(collerBoxFlabW, 0)
    };
    const collerFlabMetaTag = `[FlabMeta: ${JSON.stringify(collerFlabMetaObj)}]`;

    const payload = {
      calc_type: 'coller_box',
      company_id: collerBoxCompanyId,
      size_id: collerBoxSizeId,
      customer_name: `${COLLER_BOX_CALC_PREFIX} ${collerFlabMetaTag} ${finalCollerBoxCustomerCopy}`,
      company_reference: '',
      quantity_of_boxes: Number(collerBoxQty),
      ply_type: Number(collerBoxPlyType),
      flute_extra_percent: Number(collerBoxFluteExtraPercent),
      price_per_kg: Number(collerBoxPricePerKg),
      gsm: Number(collerBoxGsmPaper),
      gsm_paper: Number(collerBoxGsmPaper),
      gsm_flute: Number(collerBoxGsmFlute),
      gsm_packing: Number(collerBoxGsmPacking),
      bf: Number(collerBoxBf),
      quantity_of_data: Number(collerBoxQtyData),
      gst_percent: Number(collerBoxGstPercent),
      reel_size_adjust: parseNumeric(collerBoxReelSizePlus, 0) - parseNumeric(collerBoxReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(collerBoxCutSizePlus, 0) - parseNumeric(collerBoxCutSizeMinus, 0),
      reel_size: collerBoxResults.reelSize,
      cut_size: collerBoxResults.cutSize,
      paper: collerBoxResults.paper,
      flute: collerBoxResults.flute,
      weight_per_unit: collerBoxResults.weightPerUnit,
      box_weight: collerBoxResults.collerBoxWeight,
      single_box_price: collerBoxResults.singleCollerBoxPrice,
      per_piece_price: collerBoxResults.singleCollerBoxPrice,
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: collerBoxResults.totalCost,
      gst_amount: collerBoxResults.gstAmount,
      grand_total: collerBoxResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'coller_box' || editingType === 'coller');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setCollerBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Coller box calculation updated successfully!' : (isSaveAsNew ? 'New coller box copy saved successfully!' : 'Coller box calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setCollerBoxError(errData.message || 'Error saving coller box calculation details.');
      }
    } catch (err) {
      setCollerBoxError('Server connection error. Please try again.');
    } finally {
      setCollerBoxSaving(false);
    }
  };

  // ─── Top Side Tray Box Save ────────────────────────────────────────────────────
  const handleTopSideTrayBoxSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!uBoxResults) {
      setUBoxError('Please fill in all details to generate a valid top side tray box calculation first.');
      return;
    }
    const rawUBoxCustomerCopy = uBoxShowNewCustomerCopyInput ? uBoxNewCustomerCopyFile : uBoxCustomerCopyFile;
    const finalUBoxCustomerCopy = rawUBoxCustomerCopy ? rawUBoxCustomerCopy.trim() : '';
    if (!finalUBoxCustomerCopy) {
      setUBoxError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(uBoxShowNewCustomerCopyInput, uBoxNewCustomerCopyFile, setUBoxError)) return;

    setUBoxSaving(true);
    setUBoxError('');

    const uBoxFlabMetaObj = {
      flabL: parseNumeric(uBoxFlabL, 0),
      flabW: parseNumeric(uBoxFlabW, 0)
    };
    const uBoxFlabMetaTag = `[FlabMeta: ${JSON.stringify(uBoxFlabMetaObj)}]`;

    let finalUBoxCustName = `${TOP_SIDE_TRAY_BOX_CALC_PREFIX} ${uBoxFlabMetaTag} ${finalUBoxCustomerCopy}`;
    if (uBoxIsScreenPrinting && uBoxResults?.screenPrintingSingleBoxPrice > 0) {
      finalUBoxCustName = `[ScreenPrinting: ₹${Number(uBoxResults.screenPrintingSingleBoxPrice).toFixed(2)}] ${finalUBoxCustName}`;
    }
    if (uBoxIsCallicoCost && uBoxResults?.callicoSingleBoxPrice > 0) {
      finalUBoxCustName = `[Callico: ₹${Number(uBoxResults.callicoSingleBoxPrice).toFixed(2)}] ${finalUBoxCustName}`;
    }

    const payload = {
      calc_type: 'top_side_tray',
      company_id: uBoxCompanyId,
      size_id: uBoxSizeId,
      customer_name: finalUBoxCustName,
      company_reference: '',
      quantity_of_boxes: Number(uBoxQty),
      ply_type: Number(uBoxPlyType),
      flute_extra_percent: Number(uBoxFluteExtraPercent),
      price_per_kg: Number(uBoxPricePerKg),
      gsm: Number(uBoxGsmPaper),
      gsm_paper: Number(uBoxGsmPaper),
      gsm_flute: Number(uBoxGsmFlute),
      gsm_packing: Number(uBoxGsmPacking),
      bf: Number(uBoxBf),
      quantity_of_data: Number(uBoxQtyData),
      gst_percent: Number(uBoxGstPercent),
      reel_size_adjust: parseNumeric(uBoxReelSizePlus, 0) - parseNumeric(uBoxReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(uBoxCutSizePlus, 0) - parseNumeric(uBoxCutSizeMinus, 0),
      reel_size: uBoxResults.reelSize,
      cut_size: uBoxResults.cutSize,
      paper: uBoxResults.paper,
      flute: uBoxResults.flute,
      weight_per_unit: uBoxResults.weightPerUnit,
      box_weight: uBoxResults.topSideTrayBoxWeight,
      single_box_price: uBoxResults.singleTopSideTrayBoxPrice,
      per_piece_price: uBoxResults.singleTopSideTrayBoxPrice,
      is_screen_printing: uBoxIsScreenPrinting,
      screen_printing_price: Number(uBoxScreenPrintingPricePerBox),
      is_callico: uBoxIsCallicoCost,
      callico_price: Number(uBoxCallicoPricePerBox),
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: uBoxResults.totalCost,
      gst_amount: uBoxResults.gstAmount,
      grand_total: uBoxResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'top_side_tray_box' || editingType === 'top_side_tray');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setUBoxSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Top side tray box calculation updated successfully!' : (isSaveAsNew ? 'New top side tray box copy saved successfully!' : 'Top side tray box calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setUBoxError(errData.message || 'Error saving top side tray box calculation details.');
      }
    } catch (err) {
      setUBoxError('Server connection error. Please try again.');
    } finally {
      setUBoxSaving(false);
    }
  };


  // ─── Universal Type Save ────────────────────────────────────────────────────
  const handleUniversalTypeSave = async (e, isSaveAsNew = false) => {
    e.preventDefault();
    if (!uTypeResults) {
      setUTypeError('Please fill in all details to generate a valid universal type calculation first.');
      return;
    }
    const rawUTypeCustomerCopy = uTypeShowNewCustomerCopyInput ? uTypeNewCustomerCopyFile : uTypeCustomerCopyFile;
    const finalUTypeCustomerCopy = rawUTypeCustomerCopy ? rawUTypeCustomerCopy.trim() : '';
    if (!finalUTypeCustomerCopy) {
      setUTypeError('Please select a Customer Copy (Xerox File) or create a new file.');
      showToast && showToast('Please select a Customer Copy (Xerox File) or create a new file', 'error');
      return;
    }
    if (checkDuplicateFile(uTypeShowNewCustomerCopyInput, uTypeNewCustomerCopyFile, setUTypeError)) return;

    setUTypeSaving(true);
    setUTypeError('');

    let finalUTypeCustName = `${UNIVERSAL_TYPE_CALC_PREFIX} ${finalUTypeCustomerCopy}`;
    if (uTypeIsScreenPrinting && uTypeResults?.screenPrintingSingleBoxPrice > 0) {
      finalUTypeCustName = `[ScreenPrinting: ₹${Number(uTypeResults.screenPrintingSingleBoxPrice).toFixed(2)}] ${finalUTypeCustName}`;
    }
    if (uTypeIsCallicoCost && uTypeResults?.callicoSingleBoxPrice > 0) {
      finalUTypeCustName = `[Callico: ₹${Number(uTypeResults.callicoSingleBoxPrice).toFixed(2)}] ${finalUTypeCustName}`;
    }

    const payload = {
      calc_type: 'universal',
      company_id: uTypeCompanyId,
      size_id: uTypeSizeId,
      customer_name: finalUTypeCustName,
      company_reference: '',
      quantity_of_boxes: Number(uTypeQty),
      ply_type: Number(uTypePlyType),
      flute_extra_percent: Number(uTypeFluteExtraPercent),
      price_per_kg: Number(uTypePricePerKg),
      gsm: Number(uTypeGsmPaper),
      gsm_paper: Number(uTypeGsmPaper),
      gsm_flute: Number(uTypeGsmFlute),
      gsm_packing: Number(uTypeGsmPacking),
      bf: Number(uTypeBf),
      quantity_of_data: Number(uTypeQtyData),
      gst_percent: Number(uTypeGstPercent),
      reel_size_adjust: parseNumeric(uTypeReelSizePlus, 0) - parseNumeric(uTypeReelSizeMinus, 0),
      cut_size_adjust: parseNumeric(uTypeCutSizePlus, 0) - parseNumeric(uTypeCutSizeMinus, 0),
      reel_size: uTypeResults.reelSize,
      cut_size: uTypeResults.cutSize,
      paper: uTypeResults.paper,
      flute: uTypeResults.flute,
      weight_per_unit: uTypeResults.weightPerUnit,
      box_weight: uTypeResults.universalTypeWeight,
      single_box_price: uTypeResults.singleUniversalTypePrice,
      per_piece_price: uTypeResults.singleUniversalTypePrice,
      kraft_box_cost: null,
      kraft_subtotal: null,
      duplex_box_cost: null,
      duplex_subtotal: null,
      total_cost: uTypeResults.totalCost,
      gst_amount: uTypeResults.gstAmount,
      grand_total: uTypeResults.grandTotal
    };

    try {
      const isEditingThisCard = !isSaveAsNew && editingId && (editingType === 'universal' || editingType === 'universal_type');
      const method = isEditingThisCard ? 'PUT' : 'POST';
      const endpoint = isEditingThisCard ? `/api/customers/${editingId}` : '/api/customers';
      const res = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await refreshExistingFiles();
        setUTypeSavedSuccess(true);
        setEditingId(null);
        setEditingType(null);
        showToast && showToast(isEditingThisCard ? 'Universal type calculation updated successfully!' : (isSaveAsNew ? 'New universal type copy saved successfully!' : 'Universal type calculation saved successfully!'), 'success');
        setTimeout(() => { navigate('/customers'); }, 1500);
      } else {
        const errData = await res.json();
        setUTypeError(errData.message || 'Error saving universal type calculation details.');
      }
    } catch (err) {
      setUTypeError('Server connection error. Please try again.');
    } finally {
      setUTypeSaving(false);
    }
  };



  // ─── Shared result preview renderer ───────────────────────────────────────
  const renderPreview = ({ results, calcType, plyType, gsmPaper, gsmPacking, gsmFlute, fluteExtraPercent, qty, gstPercent }) => {
    const plyKey = Number(plyType);
    const isPad = calcType === 'pad' || calcType === 'partition';
    const isTray = calcType === 'tray';
    const isFullClosingBox = calcType === 'fullClosingBox';

    if (!results) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
          <Calculator size={48} />
          <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>
            Provide all the dimensions on the left form to calculate values.
          </span>
        </div>
      );
    }

    const fmt = (val, digits = 2) => {
      const n = Number(val);
      return isNaN(n) ? (0).toFixed(digits) : n.toFixed(digits);
    };

    const weightLabel = calcType === 'partition' ? 'Partition Weight' : isPad ? 'Pad Weight' : isTray ? 'Tray Weight' : 'Box Weight';
    const weightKey = isPad ? 'padWeight' : isTray ? 'trayWeight' : 'boxWeight';
    const priceLabel = calcType === 'partition' ? 'Single Partition Cost' : isPad ? 'Single Pad Cost' : isTray ? 'Single Tray Cost' : 'Single Box Cost';
    const priceKey = isPad ? 'singlePadPrice' : isTray ? 'singleTrayPrice' : 'singleBoxPrice';
    const reelFormula = isPad ? 'W+0.5' : isTray ? 'W+H+H+1' : isFullClosingBox ? 'W+H+6' : 'W+H+1';
    const cutFormula = isPad ? 'L+0.5' : isTray ? 'L+H+H+1' : 'L+W+2';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Structural Sizes */}
        <div>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            📐 Calculated Sizing
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reelsize ({reelFormula})</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(results.reelSize, 2)} in</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cutsize ({cutFormula})</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(results.cutSize, 2)} in</div>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />

        {/* Ply calculations */}
        <div>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            📦 Materials Consumption
          </h3>
          {results.isDuplex && results.duplexPaperGSM != null ? (
            <>
              {/* DUPLEX MODE: Two-part breakdown */}
              {/* Part 1: Kraft */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-accent)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Part 1 — Kraft (Normal Price/KG: ₹{Number(boxPricePerKg)})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Paper Plies ({PLY_CONFIG[plyKey]?.paper - 1} × {gsmPaper}g)
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{fmt(results.kraftPaperGSM, 1)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flute Plies</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{fmt(results.flute, 1)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kraft Total GSM</span>
                  <strong>{fmt(results.kraftTotalGSM, 1)}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight (per unit)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fmt(results.kraftWeightPerUnit, 4)} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight (× multiplier)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-success)' }}>{fmt(results.kraftBoxWeight, 4)} kg</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '8px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kraft Box Price</span>
                  <strong style={{ color: 'var(--color-accent)' }}>₹{fmt(results.kraftSingleBoxPrice, 2)}</strong>
                </div>
              </div>

              {/* Part 2: Duplex */}
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(38, 92%, 50%)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Part 2 — Duplex (Duplex Price/KG: ₹{Number(boxDuplexPrice)})
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Duplex Paper (230 GSM)
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{fmt(results.duplexPaperGSM, 1)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duplex Total GSM</span>
                  <strong>{fmt(results.duplexTotalGSM, 1)}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight (per unit)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fmt(results.duplexWeightPerUnit, 4)} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight (× multiplier)</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-success)' }}>{fmt(results.duplexBoxWeight, 4)} kg</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duplex Box Price</span>
                  <strong style={{ color: 'hsl(38, 92%, 50%)' }}>₹{fmt(results.duplexSingleBoxPrice, 2)}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* NORMAL MODE: Standard display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {`Paper Plies GSM ((${PLY_CONFIG[plyKey]?.paper - 1} × ${gsmPaper}g) + (1 × ${gsmPacking}g))`}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{fmt(results.paper, 1)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flute Plies GSM (({fluteExtraPercent}% + {gsmFlute}g) × {PLY_CONFIG[plyKey]?.flute})</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{fmt(results.flute, 1)}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total GSM (P+F)</span>
                <strong style={{ fontSize: '1.1rem' }}>{fmt(results.totalPF, 1)}</strong>
              </div>
            </>
          )}
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />

        {/* Weight estimations */}
        {(!results.isDuplex || results.duplexPaperGSM == null) && (
          <div>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              ⚖️ Weight Estimation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight per Unit (kg)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{fmt(results.weightPerUnit, 4)} kg</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{weightLabel} (Wt/Unit × Multiplier)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-success)' }}>{fmt(results[weightKey], 4)} kg</div>
              </div>
            </div>
          </div>
        )}

        {(!results.isDuplex || results.duplexPaperGSM == null) && (
          <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />
        )}

        {/* Costs */}
        <div style={{ marginTop: 'auto' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            💰 Value Estimation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.isDuplex && results.duplexPaperGSM != null ? (
              <>
                {/* Duplex mode: show Kraft and Duplex costs separately */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kraft Box Cost:</span>
                  <strong>₹{fmt(results.kraftSingleBoxPrice, 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Kraft Subtotal ({qty} units):</span>
                  <strong>₹{fmt(results.kraftBoxCost, 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duplex Box Cost:</span>
                  <strong>₹{fmt(results.duplexSingleBoxPrice, 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Duplex Subtotal ({qty} units):</span>
                  <strong>₹{fmt(results.duplexBoxCost, 2)}</strong>
                </div>
              </>
            ) : (
              <>
                {/* Normal mode */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{priceLabel}:</span>
                  <strong>₹{fmt(results[priceKey], 2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({qty} units):</span>
                  <strong>₹{fmt(results.totalCost, 2)}</strong>
                </div>
              </>
            )}
            {results.isLaminated && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Lamination Price (per box):</span>
                  <span>₹{fmt(results.laminationSingleBoxPrice, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Lamination Cost (₹{fmt(results.laminationSingleBoxPrice, 2)} × {qty}):</span>
                  <strong style={{ color: 'var(--color-success)' }}>₹{fmt(results.laminationBoxCost, 2)}</strong>
                </div>
              </div>
            )}
            {results.isPrintingCharge && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Printing Charge (Labour + Plates):</span>
                  <span>₹{fmt(results.printingCharge, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Single Box Printing Charge (÷ {qty}):</span>
                  <span>₹{fmt(results.singleBoxPrintingCharge, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Total Printing Cost:</span>
                  <strong style={{ color: 'hsl(38, 92%, 50%)' }}>₹{fmt(results.printingBoxCost, 2)}</strong>
                </div>
              </div>
            )}
            {results.isInkCost && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Ink Price (per box):</span>
                  <span>₹{fmt(results.inkSingleBoxPrice, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Total Ink Cost (₹{fmt(results.inkSingleBoxPrice, 2)} × {qty}):</span>
                  <strong style={{ color: 'var(--color-info, #3b82f6)' }}>₹{fmt(results.inkBoxCost, 2)}</strong>
                </div>
              </div>
            )}
            {results.isScreenPrinting && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Screen Printing (per box):</span>
                  <span>₹{fmt(results.screenPrintingSingleBoxPrice, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Total Screen Printing (₹{fmt(results.screenPrintingSingleBoxPrice, 2)} × {qty}):</span>
                  <strong style={{ color: 'var(--color-success)' }}>₹{fmt(results.screenPrintingBoxCost, 2)}</strong>
                </div>
              </div>
            )}
            {results.isCallicoCost && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Callico Cost (per box):</span>
                  <span>₹{fmt(results.callicoSingleBoxPrice, 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Total Callico Cost (₹{fmt(results.callicoSingleBoxPrice, 2)} × {qty}):</span>
                  <strong style={{ color: 'hsl(270, 70%, 60%)' }}>₹{fmt(results.callicoBoxCost, 2)}</strong>
                </div>
              </div>
            )}
            {/* GST shown after all costs since it's calculated on the combined total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>GST ({gstPercent}%):</span>
              <strong>₹{fmt(results.gstAmount, 2)}</strong>
            </div>
            <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-accent)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--glow-shadow)' }}>
              <span style={{ fontWeight: '500' }}>Grand Total Cost:</span>
              <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>₹{fmt(results.grandTotal, 2)}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div style={{ padding: '24px 32px', maxWidth: '100%', width: '100%' }} className="animate-fade">

      {/* ── Page Title ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', marginBottom: '4px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Add New Calculation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Calculate costs and specifications for box manufacturing and packaging.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* BOX CALCULATION SECTION                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="box" label="📦 Standard Box Calculation" color="var(--color-accent)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {boxSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Box Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {boxError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {boxError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Box — Form */}
        <form onSubmit={handleBoxSave} className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>
            Specification Inputs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'box').map(c => ({ value: c.id, label: c.name }))}
                value={boxCompanyId}
                onChange={val => setBoxCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Size Option (L × W × H)</label>
              <SearchableSelect
                options={boxSizes.map(s => ({ value: s.id, label: s.label }))}
                value={boxSizeId}
                onChange={val => setBoxSizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                disabled={boxSizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Boxes</label>
              <input type="text" inputMode="numeric" value={boxQtyBoxes} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setBoxQtyBoxes(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={boxPlyType} onChange={e => setBoxPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={boxFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={boxPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={boxGsmPaper} onChange={e => setBoxGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={boxGsmFlute} onChange={e => setBoxGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={boxIsDuplex ? '230' : boxGsmPacking} onChange={e => setBoxGsmPacking(e.target.value)} className="form-control" disabled={boxIsDuplex}>
                <option value="0">No Packing (Optional)</option>
                <GsmOptions />
              </select>
            </div>

            {/* Duplex Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsDuplex} onChange={e => setBoxIsDuplex(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Use Duplex Paper (230 GSM)</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duplex paper (230 GSM) will replace the packing paper and will be calculated by weight</span>
              </div>
              <div>
                <label className="form-label">Duplex Price per KG (₹)</label>
                <input type="text" inputMode="decimal" value={boxDuplexPrice} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxDuplexPrice(val); }} className="form-control" disabled={!boxIsDuplex} placeholder="e.g. 70" />
              </div>
            </div>

            {/* Lamination Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsLaminated} onChange={e => setBoxIsLaminated(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Use Lamination</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lamination price added based on (Reel size × Cut size) × Rupees</span>
              </div>
              <div>
                <label className="form-label">Lamination Rupees (₹ per sq. inch)</label>
                <input type="text" inputMode="decimal" value={boxLaminationRupees} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxLaminationRupees(val); }} className="form-control" disabled={!boxIsLaminated} placeholder="e.g. 0.015" />
              </div>
            </div>

            {/* Printing Charge Toggle & Inputs */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gridColumn: 'span 2' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsPrintingCharge} onChange={e => setBoxIsPrintingCharge(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Printing Charge</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Printing Charge = Labour Charge + (Plate Price × No. of Plates), then divided by Qty of Boxes for per-box cost</span>
              </div>
              <div>
                <label className="form-label">Labour Charge (₹)</label>
                <input type="text" inputMode="decimal" value={boxPrintingLabourCharge} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxPrintingLabourCharge(val); }} className="form-control" disabled={!boxIsPrintingCharge} placeholder="e.g. 5000" />
              </div>
              <div>
                <label className="form-label">Plate Price (₹)</label>
                <input type="text" inputMode="decimal" value={boxPrintingPlatePrice} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxPrintingPlatePrice(val); }} className="form-control" disabled={!boxIsPrintingCharge} placeholder="e.g. 500" />
              </div>
              <div>
                <label className="form-label">No. of Plates</label>
                <input type="text" inputMode="numeric" value={boxPrintingNoOfPlates} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setBoxPrintingNoOfPlates(val); }} className="form-control" disabled={!boxIsPrintingCharge} placeholder="e.g. 4" />
              </div>
            </div>

            {/* Ink Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsInkCost} onChange={e => setBoxIsInkCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Ink Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ink Price added per box directly</span>
              </div>
              <div>
                <label className="form-label">Ink Price per Box (₹)</label>
                <input type="text" inputMode="decimal" value={boxInkPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxInkPricePerBox(val); }} className="form-control" disabled={!boxIsInkCost} placeholder="e.g. 5.50" />
              </div>
            </div>

            {/* Screen Printing Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsScreenPrinting} onChange={e => setBoxIsScreenPrinting(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Screen Printing Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screen Printing cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Screen Printing Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={boxScreenPrintingPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxScreenPrintingPricePerBox(val); }} className="form-control" disabled={!boxIsScreenPrinting} placeholder="e.g. 2.00" />
              </div>
            </div>

            {/* Callico Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={boxIsCallicoCost} onChange={e => setBoxIsCallicoCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Callico Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Callico cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Callico Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={boxCallicoPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxCallicoPricePerBox(val); }} className="form-control" disabled={!boxIsCallicoCost} placeholder="e.g. 3.00" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={boxBf} onChange={e => setBoxBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Data (Multiplier)</label>
              <input type="text" inputMode="decimal" value={boxQtyData} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxQtyData(val); }} className="form-control" placeholder="e.g. 2" />
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={boxGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={boxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={boxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={boxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={boxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={boxCustomerCopyFile} setSelectedFile={setBoxCustomerCopyFile} showNewInput={boxShowNewCustomerCopyInput} setShowNewInput={setBoxShowNewCustomerCopyInput} newFileName={boxNewCustomerCopyFile} setNewFileName={setBoxNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

          </div>

          {editingId && editingType === 'box' ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleBoxSave(e, false)}
                disabled={boxSaving || !boxResults}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Save size={18} />
                <span>{boxSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleBoxSave(e, true)}
                disabled={boxSaving || !boxResults}
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
                  cursor: boxSaving || !boxResults ? 'not-allowed' : 'pointer',
                  opacity: boxSaving || !boxResults ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                <FolderPlus size={18} />
                <span>{boxSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={boxSaving || !boxResults} className="btn-primary" style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}>
              <Save size={18} />
              <span>{boxSaving ? 'Saving calculations...' : 'Save Box Calculation'}</span>
            </button>
          )}
        </form>

        {/* Box — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Calculation Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid var(--color-accent)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {renderPreview({
              results: boxResults,
              calcType: 'box',
              plyType: boxPlyType,
              gsmPaper: boxGsmPaper,
              gsmPacking: boxGsmPacking,
              gsmFlute: boxGsmFlute,
              fluteExtraPercent: boxFluteExtraPercent,
              qty: boxQtyBoxes,
              gstPercent: boxGstPercent
            })}
          </div>
        </div>
      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PAD CALCULATION SECTION                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="pad" label="🟦 Pad Calculation" color="hsl(240, 75%, 65%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {padSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Pad Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {padError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {padError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Pad — Form */}
        <form onSubmit={handlePadSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(240, 75%, 65%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Pad Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Flat corrugated pad — Length × Width only (no height dimension)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'pad').map(c => ({ value: c.id, label: c.name }))}
                value={padCompanyId}
                onChange={val => setPadCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Size Option (L × W)</label>
              <SearchableSelect
                options={padSizes.map(s => {
                  const parts = s.label.split('×').map(p => p.trim());
                  const padLabel = parts.length >= 2 ? `${parts[0]} × ${parts[1]}` : s.label;
                  return { value: s.id, label: `${padLabel} (L × W)` };
                })}
                value={padSizeId}
                onChange={val => setPadSizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                disabled={padSizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Pads</label>
              <input type="text" inputMode="numeric" value={padQtyPads} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setPadQtyPads(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={padPlyType} onChange={e => setPadPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={padFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={padPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={padGsmPaper} onChange={e => setPadGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={padGsmFlute} onChange={e => setPadGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={padGsmPacking} onChange={e => setPadGsmPacking(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={padBf} onChange={e => setPadBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>


            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={padGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={padReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={padReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={padCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={padCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPadCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={padCustomerCopyFile} setSelectedFile={setPadCustomerCopyFile} showNewInput={padShowNewCustomerCopyInput} setShowNewInput={setPadShowNewCustomerCopyInput} newFileName={padNewCustomerCopyFile} setNewFileName={setPadNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

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
            <button type="submit" disabled={padSaving || !padResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(240, 75%, 55%), hsl(260, 75%, 65%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: padSaving || !padResults ? 'not-allowed' : 'pointer', opacity: padSaving || !padResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(100, 100, 240, 0.3)' }}>
              <Save size={18} />
              <span>{padSaving ? 'Saving pad calculation...' : 'Save Pad Calculation'}</span>
            </button>
          )}
        </form>

        {/* Pad — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Pad Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(240, 75%, 65%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {renderPreview({
              results: padResults,
              calcType: 'pad',
              plyType: padPlyType,
              gsmPaper: padGsmPaper,
              gsmPacking: padGsmPacking,
              gsmFlute: padGsmFlute,
              fluteExtraPercent: padFluteExtraPercent,
              qty: padQtyPads,
              gstPercent: padGstPercent
            })}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PARTITION CALCULATION SECTION                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="partition" label="📦 Partition Calculation" color="hsl(215, 75%, 60%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {partitionSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Partition Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {partitionError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {partitionError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Partition — Form */}
        <form onSubmit={handlePartitionSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(215, 75%, 60%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Partition Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Flat corrugated partition — Length × Width only (no height dimension)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }} className="form-grid">

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'partition').map(c => ({ value: c.id, label: c.name }))}
                value={partitionCompanyId}
                onChange={val => setPartitionCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Size Option (L × W)</label>
              <SearchableSelect
                options={partitionGroupedSizes.map(opt => {
                  if (opt.type === 'paired') {
                    return { value: opt.id, label: opt.label };
                  } else {
                    const parts = opt.size.label.split('×').map(p => p.trim());
                    const lbl = parts.length >= 2 ? `${parts[0]} × ${parts[1]}` : opt.size.label;
                    return { value: opt.id, label: `${lbl} (L × W)` };
                  }
                })}
                value={partitionSizeId}
                onChange={val => setPartitionSizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, Slot 4, inch, mm)..."
                disabled={partitionGroupedSizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Partitions</label>
              <input type="text" inputMode="numeric" value={partitionQtyPads} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setPartitionQtyPads(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={partitionPlyType} onChange={e => setPartitionPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={partitionFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={partitionPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={partitionGsmPaper} onChange={e => setPartitionGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={partitionGsmFlute} onChange={e => setPartitionGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={partitionGsmPacking} onChange={e => setPartitionGsmPacking(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={partitionBf} onChange={e => setPartitionBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={partitionGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            {/* Set input - shown for paired partitions */}
            {partitionGroupedSizes.find(s => s.id === partitionSizeId)?.type === 'paired' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: 'hsl(215, 75%, 60%)' }}>Set</label>
                <input type="text" inputMode="numeric" value={partitionSet} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setPartitionSet(val); }} className="form-control" placeholder="e.g. 1" />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={partitionReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={partitionReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={partitionCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={partitionCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setPartitionCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={partitionCustomerCopyFile} setSelectedFile={setPartitionCustomerCopyFile} showNewInput={partitionShowNewCustomerCopyInput} setShowNewInput={setPartitionShowNewCustomerCopyInput} newFileName={partitionNewCustomerCopyFile} setNewFileName={setPartitionNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

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
            <button type="submit" disabled={partitionSaving || !partitionResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(215, 75%, 50%), hsl(230, 75%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: partitionSaving || !partitionResults ? 'not-allowed' : 'pointer', opacity: partitionSaving || !partitionResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(70, 120, 240, 0.3)' }}>
              <Save size={18} />
              <span>{partitionSaving ? 'Saving partition calculation...' : 'Save Partition Calculation'}</span>
            </button>
          )}
        </form>

        {/* Partition — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Partition Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(215, 75%, 60%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {!partitionResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                <Calculator size={48} />
                <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>
                  Provide all the dimensions on the left form to calculate values.
                </span>
              </div>
            ) : partitionResults.isPaired ? (
              /* PAIRED PARTITION PREVIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* First Partition */}
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    First Partition (Reel × Cut) — Slot {partitionResults.first.slotCount}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel Size (W)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{(Number(partitionResults.first?.reelSize) || 0).toFixed(4)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cut Size (L)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{(Number(partitionResults.first?.cutSize) || 0).toFixed(4)} in</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight per unit</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{(Number(partitionResults.first?.weightPerUnit) || 0).toFixed(5)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Box Weight (Set×{partitionResults.first?.usedSlot ?? 0}×WPU)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-success)' }}>{(Number(partitionResults.first?.boxWeight) || 0).toFixed(5)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>First Partition Price</span>
                    <strong style={{ color: 'var(--color-accent)' }}>₹{(Number(partitionResults.first?.price) || 0).toFixed(2)}</strong>
                  </div>
                </div>

                {/* Second Partition */}
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(38, 92%, 50%)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Second Partition (Reel × Cut) — Slot {partitionResults.second?.slotCount ?? 0}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel Size (W)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{(Number(partitionResults.second?.reelSize) || 0).toFixed(4)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cut Size (L)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{(Number(partitionResults.second?.cutSize) || 0).toFixed(4)} in</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight per unit</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{(Number(partitionResults.second?.weightPerUnit) || 0).toFixed(5)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Box Weight (Set×{partitionResults.second?.usedSlot ?? 0}×WPU)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-success)' }}>{(Number(partitionResults.second?.boxWeight) || 0).toFixed(5)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Second Partition Price</span>
                    <strong style={{ color: 'hsl(38, 92%, 50%)' }}>₹{(Number(partitionResults.second?.price) || 0).toFixed(2)}</strong>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '4px 0' }} />

                {/* Combined Totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Single Set Price (1st + 2nd)</span>
                    <strong>₹{(Number(partitionResults.singleSetPrice) || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Total Cost (× {partitionQtyPads} qty)</span>
                    <strong>₹{(Number(partitionResults.totalCost) || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>GST ({partitionGstPercent}%)</span>
                    <span>₹{(Number(partitionResults.gstAmount) || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', borderRadius: '8px', fontWeight: '700', fontSize: '1.15rem', marginTop: '4px' }}>
                    <span>Grand Total</span>
                    <span style={{ color: 'var(--color-accent)' }}>₹{(Number(partitionResults.grandTotal) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* SINGLE PARTITION PREVIEW - use existing renderPreview */
              renderPreview({
                results: partitionResults,
                calcType: 'partition',
                plyType: partitionPlyType,
                gsmPaper: partitionGsmPaper,
                gsmPacking: partitionGsmPacking,
                gsmFlute: partitionGsmFlute,
                fluteExtraPercent: partitionFluteExtraPercent,
                qty: partitionQtyPads,
                gstPercent: partitionGstPercent
              })
            )}
          </div>
        </div>

      </div>


      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TRAY CALCULATION SECTION                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="tray" label="🟩 Tray Calculation" color="hsl(150, 65%, 45%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {traySavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Tray Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {trayError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {trayError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Tray — Form (same as Box but with tray labels) */}
        <form onSubmit={handleTraySave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(150, 65%, 45%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Tray Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Corrugated tray — uses L × W × H dimensions
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'tray').map(c => ({ value: c.id, label: c.name }))}
                value={trayCompanyId}
                onChange={val => setTrayCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Size Option (L × W × H)</label>
              <SearchableSelect
                options={traySizes.map(s => ({ value: s.id, label: s.label }))}
                value={traySizeId}
                onChange={val => setTraySizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                disabled={traySizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Trays</label>
              <input type="text" inputMode="numeric" value={trayQtyTrays} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setTrayQtyTrays(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={trayPlyType} onChange={e => setTrayPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={trayFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={trayPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={trayGsmPaper} onChange={e => setTrayGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={trayGsmFlute} onChange={e => setTrayGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={trayGsmPacking} onChange={e => setTrayGsmPacking(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={trayBf} onChange={e => setTrayBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>


            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={trayGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={trayReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={trayReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={trayCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={trayCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setTrayCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={trayCustomerCopyFile} setSelectedFile={setTrayCustomerCopyFile} showNewInput={trayShowNewCustomerCopyInput} setShowNewInput={setTrayShowNewCustomerCopyInput} newFileName={trayNewCustomerCopyFile} setNewFileName={setTrayNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

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
            <button type="submit" disabled={traySaving || !trayResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: traySaving || !trayResults ? 'not-allowed' : 'pointer', opacity: traySaving || !trayResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}>
              <Save size={18} />
              <span>{traySaving ? 'Saving tray calculation...' : 'Save Tray Calculation'}</span>
            </button>
          )}
        </form>

        {/* Tray — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Tray Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(150, 65%, 45%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {renderPreview({
              results: trayResults,
              calcType: 'tray',
              plyType: trayPlyType,
              gsmPaper: trayGsmPaper,
              gsmPacking: trayGsmPacking,
              gsmFlute: trayGsmFlute,
              fluteExtraPercent: trayFluteExtraPercent,
              qty: trayQtyTrays,
              gstPercent: trayGstPercent
            })}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SLEAVE CALCULATION SECTION                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="sleave" label="🟧 Sleave Calculation" color="hsl(30, 80%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {sleaveSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Sleave Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {sleaveError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {sleaveError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Sleave — Form */}
        <form onSubmit={handleSleaveSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(30, 80%, 55%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Sleave Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Sleave — L × W × H with optional flab for length &amp; width sides
          </p>

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

            {/* Flab inputs - highlighted section */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: 'rgba(230, 120, 20, 0.08)', border: '1px solid hsl(30, 80%, 55%)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(30, 80%, 55%)', marginBottom: '12px' }}>
                  📐 Flab Dimensions (Optional — inches)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Length) — in
                      {sleaveSizeId && sleaveSizes.find(s => s.id === sleaveSizeId) && (
                        <span style={{ color: 'hsl(30, 80%, 55%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc L: {(Number(sleaveSizes.find(s => s.id === sleaveSizeId)?.length_inches || 0) + Number(sleaveFlabL) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={sleaveFlabL} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveFlabL(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given L + Flab + 1" waste = Calculated Length</div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Width) — in
                      {sleaveSizeId && sleaveSizes.find(s => s.id === sleaveSizeId) && (
                        <span style={{ color: 'hsl(30, 80%, 55%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc W: {(Number(sleaveSizes.find(s => s.id === sleaveSizeId)?.width_inches || 0) + Number(sleaveFlabW) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={sleaveFlabW} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveFlabW(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given W + Flab + 1" waste = Calculated Width</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Sleaves</label>
              <input type="text" inputMode="numeric" value={sleaveQty} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setSleaveQty(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={sleavePlyType} onChange={e => setSleavePlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={sleaveFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={sleavePricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleavePricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={sleaveGsmPaper} onChange={e => setSleaveGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={sleaveGsmFlute} onChange={e => setSleaveGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={sleaveGsmPacking} onChange={e => setSleaveGsmPacking(e.target.value)} className="form-control">
                <option value="0">No Packing (Optional)</option>
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={sleaveBf} onChange={e => setSleaveBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={sleaveGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={sleaveReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={sleaveReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={sleaveCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={sleaveCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            {/* Screen Printing Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={sleaveIsScreenPrinting} onChange={e => setSleaveIsScreenPrinting(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Screen Printing Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screen Printing cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Screen Printing Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={sleaveScreenPrintingPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveScreenPrintingPricePerBox(val); }} className="form-control" disabled={!sleaveIsScreenPrinting} placeholder="e.g. 2.00" />
              </div>
            </div>

            {/* Callico Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={sleaveIsCallicoCost} onChange={e => setSleaveIsCallicoCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Callico Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Callico cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Callico Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={sleaveCallicoPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setSleaveCallicoPricePerBox(val); }} className="form-control" disabled={!sleaveIsCallicoCost} placeholder="e.g. 3.00" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={sleaveCustomerCopyFile} setSelectedFile={setSleaveCustomerCopyFile} showNewInput={sleaveShowNewCustomerCopyInput} setShowNewInput={setSleaveShowNewCustomerCopyInput} newFileName={sleaveNewCustomerCopyFile} setNewFileName={setSleaveNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

          </div>

          {editingId && editingType === 'sleave' ? (
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
            <button type="submit" disabled={sleaveSaving || !sleaveResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(30, 80%, 50%), hsl(40, 85%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: sleaveSaving || !sleaveResults ? 'not-allowed' : 'pointer', opacity: sleaveSaving || !sleaveResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 120, 20, 0.3)' }}>
              <Save size={18} />
              <span>{sleaveSaving ? 'Saving sleave calculation...' : 'Save Sleave Calculation'}</span>
            </button>
          )}
        </form>

        {/* Sleave — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Sleave Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(30, 80%, 55%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {sleaveResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Calculated Dimensions */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Length (L+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcLength.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Width (W+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcWidth.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel Height (H+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(30,80%,55%)' }}>{sleaveResults.calcHeight.toFixed(2)} in</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Materials */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📋 Materials Consumption</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paper Plies GSM ({PLY_CONFIG[Number(sleavePlyType)]?.paper - 1} × {sleaveGsmPaper}g + 1 × {sleaveGsmPacking}g)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{sleaveResults.paper.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flute Plies GSM ({sleaveFluteExtraPercent}% + {sleaveGsmFlute}g × {PLY_CONFIG[Number(sleavePlyType)]?.flute})</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{sleaveResults.flute.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total GSM (P+F)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{sleaveResults.totalPF.toFixed(1)}</strong>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Weight */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>⚖️ Weight Estimation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Length Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{sleaveResults.lengthWeight.toFixed(4)} kg</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Width Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{sleaveResults.widthWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single Box Weight (L Wt + W Wt)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{sleaveResults.weightPerUnit.toFixed(4)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sleave Weight (Qty Data Multiplied)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-success)' }}>{sleaveResults.sleaveWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Costs */}
                <div style={{ marginTop: 'auto' }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>💰 Value Estimation</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Single Sleave Cost:</span>
                      <strong>₹{sleaveResults.singleSleavePrice.toFixed(2)}</strong>
                    </div>

                    {sleaveResults.isScreenPrinting && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Screen Printing (per box):</span>
                          <span>₹{sleaveResults.screenPrintingSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Screen Printing (₹{sleaveResults.screenPrintingSingleBoxPrice.toFixed(2)} × {sleaveQty}):</span>
                          <strong style={{ color: 'var(--color-success)' }}>₹{sleaveResults.screenPrintingBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                    {sleaveResults.isCallicoCost && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Callico Cost (per box):</span>
                          <span>₹{sleaveResults.callicoSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Callico Cost (₹{sleaveResults.callicoSingleBoxPrice.toFixed(2)} × {sleaveQty}):</span>
                          <strong style={{ color: 'hsl(270, 70%, 60%)' }}>₹{sleaveResults.callicoBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({sleaveQty} units):</span>
                      <strong>₹{sleaveResults.totalCost.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>GST ({sleaveGstPercent}%):</span>
                      <strong>₹{sleaveResults.gstAmount.toFixed(2)}</strong>
                    </div>
                    <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(30,80%,50%), hsl(40,85%,60%))', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(230, 120, 20, 0.3)' }}>
                      <span style={{ fontWeight: '500' }}>Grand Total Cost:</span>
                      <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>₹{sleaveResults.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                <Calculator size={48} />
                <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Provide dimensions and flab values to calculate sleave pricing.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* COLLER BOX CALCULATION SECTION                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="coller_box" label="🟪 Coller Box Calculation" color="hsl(300, 70%, 50%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {collerBoxSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Coller Box Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {collerBoxError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {collerBoxError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Coller Box — Form */}
        <form onSubmit={handleCollerBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(300, 70%, 50%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Coller Box Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Coller Box — L × W × H with optional flab for length &amp; width sides
          </p>

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

            {/* Flab inputs - highlighted section */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: 'rgba(230, 20, 200, 0.08)', border: '1px solid hsl(300, 70%, 50%)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(300, 70%, 50%)', marginBottom: '12px' }}>
                  📐 Flab Dimensions (Optional — inches)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Length) — in
                      {collerBoxSizeId && collerBoxSizes.find(s => s.id === collerBoxSizeId) && (
                        <span style={{ color: 'hsl(300, 70%, 50%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc L: {(Number(collerBoxSizes.find(s => s.id === collerBoxSizeId)?.length_inches || 0) + Number(collerBoxFlabL) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={collerBoxFlabL} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxFlabL(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given L + Flab + 1" waste = Calculated Length</div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Width) — in
                      {collerBoxSizeId && collerBoxSizes.find(s => s.id === collerBoxSizeId) && (
                        <span style={{ color: 'hsl(300, 70%, 50%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc W: {(Number(collerBoxSizes.find(s => s.id === collerBoxSizeId)?.width_inches || 0) + Number(collerBoxFlabW) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={collerBoxFlabW} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxFlabW(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given W + Flab + 1" waste = Calculated Width</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Coller Boxes</label>
              <input type="text" inputMode="numeric" value={collerBoxQty} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setCollerBoxQty(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={collerBoxPlyType} onChange={e => setCollerBoxPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={collerBoxFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={collerBoxPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={collerBoxGsmPaper} onChange={e => setCollerBoxGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={collerBoxGsmFlute} onChange={e => setCollerBoxGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={collerBoxGsmPacking} onChange={e => setCollerBoxGsmPacking(e.target.value)} className="form-control">
                <option value="0">No Packing (Optional)</option>
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={collerBoxBf} onChange={e => setCollerBoxBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={collerBoxGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={collerBoxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={collerBoxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={collerBoxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={collerBoxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setCollerBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={collerBoxCustomerCopyFile} setSelectedFile={setCollerBoxCustomerCopyFile} showNewInput={collerBoxShowNewCustomerCopyInput} setShowNewInput={setCollerBoxShowNewCustomerCopyInput} newFileName={collerBoxNewCustomerCopyFile} setNewFileName={setCollerBoxNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

          </div>

          {editingId && (editingType === 'coller_box' || editingType === 'coller') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleCollerBoxSave(e, false)}
                disabled={collerBoxSaving || !collerBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(300, 70%, 45%), hsl(320, 75%, 55%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: collerBoxSaving || !collerBoxResults ? 'not-allowed' : 'pointer', opacity: collerBoxSaving || !collerBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 20, 200, 0.3)' }}
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
            <button type="submit" disabled={collerBoxSaving || !collerBoxResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(300, 70%, 45%), hsl(320, 75%, 55%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: collerBoxSaving || !collerBoxResults ? 'not-allowed' : 'pointer', opacity: collerBoxSaving || !collerBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(230, 20, 200, 0.3)' }}>
              <Save size={18} />
              <span>{collerBoxSaving ? 'Saving coller box calculation...' : 'Save Coller Box Calculation'}</span>
            </button>
          )}
        </form>

        {/* Coller Box — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Coller Box Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(300, 70%, 50%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {collerBoxResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Calculated Dimensions */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Length (L+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcLength.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Width (W+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcWidth.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel Height (H+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(300,70%,50%)' }}>{collerBoxResults.calcHeight.toFixed(2)} in</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Materials */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📋 Materials Consumption</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paper Plies GSM ({PLY_CONFIG[Number(collerBoxPlyType)]?.paper - 1} × {collerBoxGsmPaper}g + 1 × {collerBoxGsmPacking}g)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{collerBoxResults.paper.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flute Plies GSM ({collerBoxFluteExtraPercent}% + {collerBoxGsmFlute}g × {PLY_CONFIG[Number(collerBoxPlyType)]?.flute})</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{collerBoxResults.flute.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total GSM (P+F)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{collerBoxResults.totalPF.toFixed(1)}</strong>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Weight */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>⚖️ Weight Estimation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Length Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{collerBoxResults.lengthWeight.toFixed(4)} kg</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Width Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{collerBoxResults.widthWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single Box Weight (L Wt + W Wt)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{collerBoxResults.weightPerUnit.toFixed(4)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coller Box Weight (Qty Data Multiplied)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-success)' }}>{collerBoxResults.collerBoxWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Costs */}
                <div style={{ marginTop: 'auto' }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>💰 Value Estimation</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Single Coller Box Cost:</span>
                      <strong>₹{collerBoxResults.singleCollerBoxPrice.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({collerBoxQty} units):</span>
                      <strong>₹{collerBoxResults.totalCost.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>GST ({collerBoxGstPercent}%):</span>
                      <strong>₹{collerBoxResults.gstAmount.toFixed(2)}</strong>
                    </div>
                    <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(300,70%,45%), hsl(320,75%,55%))', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(230, 20, 200, 0.3)' }}>
                      <span style={{ fontWeight: '500' }}>Grand Total Cost:</span>
                      <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>₹{collerBoxResults.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                <Calculator size={48} />
                <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Provide dimensions and flab values to calculate coller box pricing.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TOP SIDE TRAY BOX CALCULATION SECTION                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="top_side_tray_box" label="🟪 Top Side Tray Box Calculation" color="hsl(280, 70%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {uBoxSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Top Side Tray Box Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {uBoxError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {uBoxError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Top Side Tray Box — Form */}
        <form onSubmit={handleTopSideTrayBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(280, 70%, 55%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Top Side Tray Box Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Top Side Tray Box — L × W × H with optional flab. Reel = H + (W÷2) + 1
          </p>

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

            {/* Flab inputs - highlighted section */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ background: 'rgba(160, 80, 220, 0.08)', border: '1px solid hsl(280, 70%, 55%)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(280, 70%, 55%)', marginBottom: '12px' }}>
                  📐 Flab Dimensions (Optional — inches)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Length) — in
                      {uBoxSizeId && uBoxSizes.find(s => s.id === uBoxSizeId) && (
                        <span style={{ color: 'hsl(280, 70%, 55%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc L: {(Number(uBoxSizes.find(s => s.id === uBoxSizeId)?.length_inches || 0) + Number(uBoxFlabL) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={uBoxFlabL} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxFlabL(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given L + Flab + 1" waste = Calculated Length</div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>
                      Flab (Width) — in
                      {uBoxSizeId && uBoxSizes.find(s => s.id === uBoxSizeId) && (
                        <span style={{ color: 'hsl(280, 70%, 55%)', marginLeft: '6px', fontWeight: '700' }}>
                          → Calc W: {(Number(uBoxSizes.find(s => s.id === uBoxSizeId)?.width_inches || 0) + Number(uBoxFlabW) + 1).toFixed(2)} in
                        </span>
                      )}
                    </label>
                    <input type="text" inputMode="decimal" value={uBoxFlabW} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxFlabW(val); }} className="form-control" placeholder="0" />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Given W + Flab + 1" waste = Calculated Width</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Top Side Tray Boxes</label>
              <input type="text" inputMode="numeric" value={uBoxQty} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setUBoxQty(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={uBoxPlyType} onChange={e => setUBoxPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={uBoxFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={uBoxPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={uBoxGsmPaper} onChange={e => setUBoxGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={uBoxGsmFlute} onChange={e => setUBoxGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={uBoxGsmPacking} onChange={e => setUBoxGsmPacking(e.target.value)} className="form-control">
                <option value="0">No Packing (Optional)</option>
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={uBoxBf} onChange={e => setUBoxBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>


            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={uBoxGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={uBoxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={uBoxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={uBoxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={uBoxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            {/* Screen Printing Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={uBoxIsScreenPrinting} onChange={e => setUBoxIsScreenPrinting(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Screen Printing Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screen Printing cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Screen Printing Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={uBoxScreenPrintingPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxScreenPrintingPricePerBox(val); }} className="form-control" disabled={!uBoxIsScreenPrinting} placeholder="e.g. 2.00" />
              </div>
            </div>

            {/* Callico Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={uBoxIsCallicoCost} onChange={e => setUBoxIsCallicoCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Callico Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Callico cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Callico Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={uBoxCallicoPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUBoxCallicoPricePerBox(val); }} className="form-control" disabled={!uBoxIsCallicoCost} placeholder="e.g. 3.00" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={uBoxCustomerCopyFile} setSelectedFile={setUBoxCustomerCopyFile} showNewInput={uBoxShowNewCustomerCopyInput} setShowNewInput={setUBoxShowNewCustomerCopyInput} newFileName={uBoxNewCustomerCopyFile} setNewFileName={setUBoxNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

          </div>

          {editingId && (editingType === 'top_side_tray_box' || editingType === 'top_side_tray') ? (
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
            <button type="submit" disabled={uBoxSaving || !uBoxResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(300, 65%, 60%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: uBoxSaving || !uBoxResults ? 'not-allowed' : 'pointer', opacity: uBoxSaving || !uBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(160, 80, 220, 0.3)' }}>
              <Save size={18} />
              <span>{uBoxSaving ? 'Saving top side tray box calculation...' : 'Save Top Side Tray Box Calculation'}</span>
            </button>
          )}
        </form>

        {/* Top Side Tray Box — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Top Side Tray Box Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(280, 70%, 55%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {uBoxResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Calculated Dimensions */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Length (L+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcLength.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Calc. Width (W+Flab+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcWidth.toFixed(2)} in</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel Size (H+W÷2+1)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'hsl(280,70%,55%)' }}>{uBoxResults.calcHeight.toFixed(2)} in</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Materials */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📋 Materials Consumption</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paper Plies GSM ({PLY_CONFIG[Number(uBoxPlyType)]?.paper - 1} × {uBoxGsmPaper}g + 1 × {uBoxGsmPacking}g)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{uBoxResults.paper.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flute Plies GSM ({uBoxFluteExtraPercent}% + {uBoxGsmFlute}g × {PLY_CONFIG[Number(uBoxPlyType)]?.flute})</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{uBoxResults.flute.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total GSM (P+F)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{uBoxResults.totalPF.toFixed(1)}</strong>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Weight */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>⚖️ Weight Estimation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Length Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{uBoxResults.lengthWeight.toFixed(4)} kg</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Width Side Weight (2 sides)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{uBoxResults.widthWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single Box Weight (L Wt + W Wt)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{uBoxResults.weightPerUnit.toFixed(4)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top Side Tray Box Weight (Qty Data Multiplied)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-success)' }}>{uBoxResults.topSideTrayBoxWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Costs */}
                <div style={{ marginTop: 'auto' }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>💰 Value Estimation</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Single Top Side Tray Box Cost:</span>
                      <strong>₹{uBoxResults.singleTopSideTrayBoxPrice.toFixed(2)}</strong>
                    </div>

                    {uBoxResults.isScreenPrinting && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Screen Printing (per box):</span>
                          <span>₹{uBoxResults.screenPrintingSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Screen Printing (₹{uBoxResults.screenPrintingSingleBoxPrice.toFixed(2)} × {uBoxQty}):</span>
                          <strong style={{ color: 'var(--color-success)' }}>₹{uBoxResults.screenPrintingBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                    {uBoxResults.isCallicoCost && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Callico Cost (per box):</span>
                          <span>₹{uBoxResults.callicoSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Callico Cost (₹{uBoxResults.callicoSingleBoxPrice.toFixed(2)} × {uBoxQty}):</span>
                          <strong style={{ color: 'hsl(270, 70%, 60%)' }}>₹{uBoxResults.callicoBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({uBoxQty} units):</span>
                      <strong>₹{uBoxResults.totalCost.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>GST ({uBoxGstPercent}%):</span>
                      <strong>₹{uBoxResults.gstAmount.toFixed(2)}</strong>
                    </div>
                    <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(280,70%,50%), hsl(300,65%,60%))', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(160,80,220,0.3)' }}>
                      <span style={{ fontWeight: '500' }}>Grand Total Cost:</span>
                      <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>₹{uBoxResults.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                <Calculator size={48} />
                <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Provide dimensions and flab values to calculate top side tray box pricing.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* UNIVERSAL TYPE CALCULATION SECTION                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="universal" label="🟦 Universal Type Calculation" color="hsl(200, 70%, 50%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {uTypeSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Universal Type Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {uTypeError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {uTypeError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Universal Type — Form */}
        <form onSubmit={handleUniversalTypeSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(200, 70%, 50%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Universal Type Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Universal Type — L × W × H (Top has +0.5" in both reel & cut, Bottom has raw sizes)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'universal').map(c => ({ value: c.id, label: c.name }))}
                value={uTypeCompanyId}
                onChange={val => setUTypeCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Size Option (L × W × H)</label>
              <SearchableSelect
                options={uTypeSizes.map(s => ({ value: s.id, label: s.label }))}
                value={uTypeSizeId}
                onChange={val => setUTypeSizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                disabled={uTypeSizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Boxes</label>
              <input type="text" inputMode="numeric" value={uTypeQty} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setUTypeQty(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={uTypePlyType} onChange={e => setUTypePlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={uTypeFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={uTypePricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypePricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={uTypeGsmPaper} onChange={e => setUTypeGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={uTypeGsmFlute} onChange={e => setUTypeGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={uTypeGsmPacking} onChange={e => setUTypeGsmPacking(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={uTypeBf} onChange={e => setUTypeBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={uTypeGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={uTypeReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={uTypeReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={uTypeCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={uTypeCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            {/* Screen Printing Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={uTypeIsScreenPrinting} onChange={e => setUTypeIsScreenPrinting(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Screen Printing Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screen Printing cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Screen Printing Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={uTypeScreenPrintingPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeScreenPrintingPricePerBox(val); }} className="form-control" disabled={!uTypeIsScreenPrinting} placeholder="e.g. 2.00" />
              </div>
            </div>

            {/* Callico Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={uTypeIsCallicoCost} onChange={e => setUTypeIsCallicoCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Callico Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Callico cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Callico Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={uTypeCallicoPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setUTypeCallicoPricePerBox(val); }} className="form-control" disabled={!uTypeIsCallicoCost} placeholder="e.g. 3.00" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={uTypeCustomerCopyFile} setSelectedFile={setUTypeCustomerCopyFile} showNewInput={uTypeShowNewCustomerCopyInput} setShowNewInput={setUTypeShowNewCustomerCopyInput} newFileName={uTypeNewCustomerCopyFile} setNewFileName={setUTypeNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

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
            <button type="submit" disabled={uTypeSaving || !uTypeResults} style={{ width: '100%', marginTop: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(200, 70%, 45%), hsl(210, 70%, 55%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: uTypeSaving || !uTypeResults ? 'not-allowed' : 'pointer', opacity: uTypeSaving || !uTypeResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(40, 140, 200, 0.3)' }}>
              <Save size={18} />
              <span>{uTypeSaving ? 'Saving universal type calculation...' : 'Save Universal Type Calculation'}</span>
            </button>
          )}
        </form>

        {/* Universal Type — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Universal Type Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(200, 70%, 50%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {uTypeResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* Calculated Dimensions */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📐 Calculated Dimensions</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(200, 70%, 45%)', marginBottom: '4px' }}>Top (with +0.5" extra)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel: {(uTypeResults.reelSize + 0.5).toFixed(2)} in</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cut: {(uTypeResults.cutSize + 0.5).toFixed(2)} in</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(200, 70%, 45%)', marginBottom: '4px' }}>Bottom (raw size)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reel: {uTypeResults.reelSize.toFixed(2)} in</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cut: {uTypeResults.cutSize.toFixed(2)} in</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Materials */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>📋 Materials Consumption</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paper Plies GSM ({PLY_CONFIG[Number(uTypePlyType)]?.paper - 1} × {uTypeGsmPaper}g + 1 × {uTypeGsmPacking}g)</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{uTypeResults.paper.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flute Plies GSM ({uTypeFluteExtraPercent}% + {uTypeGsmFlute}g × {PLY_CONFIG[Number(uTypePlyType)]?.flute})</div>
                      <div style={{ fontSize: '1rem', fontWeight: '600' }}>{uTypeResults.flute.toFixed(1)}</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total GSM (P+F)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{uTypeResults.totalPF.toFixed(1)}</strong>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Weight */}
                <div>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px' }}>⚖️ Weight Estimation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top Weight</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{uTypeResults.topWeight.toFixed(4)} kg</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bottom Weight</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700' }}>{uTypeResults.bottomWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Single Box Weight (Top + Bottom)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{uTypeResults.weightPerUnit.toFixed(4)} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Weight</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-success)' }}>{uTypeResults.universalTypeWeight.toFixed(4)} kg</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

                {/* Costs */}
                <div style={{ marginTop: 'auto' }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>💰 Value Estimation</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Single Box Cost:</span>
                      <strong>₹{uTypeResults.singleUniversalTypePrice.toFixed(2)}</strong>
                    </div>

                    {uTypeResults.isScreenPrinting && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Screen Printing (per box):</span>
                          <span>₹{uTypeResults.screenPrintingSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Screen Printing (₹{uTypeResults.screenPrintingSingleBoxPrice.toFixed(2)} × {uTypeQty}):</span>
                          <strong style={{ color: 'var(--color-success)' }}>₹{uTypeResults.screenPrintingBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                    {uTypeResults.isCallicoCost && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>Callico Cost (per box):</span>
                          <span>₹{uTypeResults.callicoSingleBoxPrice.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span>Total Callico Cost (₹{uTypeResults.callicoSingleBoxPrice.toFixed(2)} × {uTypeQty}):</span>
                          <strong style={{ color: 'hsl(270, 70%, 60%)' }}>₹{uTypeResults.callicoBoxCost.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Subtotal ({uTypeQty} units):</span>
                      <strong>₹{uTypeResults.totalCost.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>GST ({uTypeGstPercent}%):</span>
                      <strong>₹{uTypeResults.gstAmount.toFixed(2)}</strong>
                    </div>
                    <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(200,70%,50%), hsl(210,70%,60%))', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(40,140,200,0.3)' }}>
                      <span style={{ fontWeight: '500' }}>Grand Total Cost:</span>
                      <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>₹{uTypeResults.grandTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)' }}>
                <Calculator size={48} />
                <span style={{ textAlign: 'center', fontSize: '0.95rem' }}>Provide dimensions to calculate universal type pricing.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      </AccordionCard>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FULL CLOSING BOX CALCULATION SECTION                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <AccordionCard id="full_closing" label="🟥 Full Closing Box Calculation" color="hsl(330, 75%, 55%)" activeId={activeAccordion} onToggle={handleAccordionToggle}>

      {fcBoxSavedSuccess && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-success)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', marginBottom: '32px' }}>
          <CheckCircle2 size={24} />
          <span>Full Closing Box Calculation Saved Successfully! Redirecting...</span>
        </div>
      )}
      {fcBoxError && (
        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontWeight: '600', marginBottom: '32px' }}>
          {fcBoxError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="calculator-layout">

        {/* Full Closing Box — Form */}
        <form onSubmit={handleFcBoxSave} className="glass-panel" style={{ padding: '32px', borderTop: '3px solid hsl(330, 75%, 55%)' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>
            Full Closing Box Specification Inputs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Same as standard Box, except using 6-inch waste in reel size calculation.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-grid">

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <SearchableSelect
                options={filterCompaniesForType(companies, 'full_closing').map(c => ({ value: c.id, label: c.name }))}
                value={fcBoxCompanyId}
                onChange={val => setFcBoxCompanyId(val)}
                placeholder="Select Company..."
                searchPlaceholder="Search company..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Size Option (L × W × H)</label>
              <SearchableSelect
                options={fcBoxSizes.map(s => ({ value: s.id, label: s.label }))}
                value={fcBoxSizeId}
                onChange={val => setFcBoxSizeId(val)}
                placeholder="Select Size..."
                searchPlaceholder="Search size (e.g. 22.5, FULL CLOSE, inch, mm)..."
                disabled={fcBoxSizes.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Boxes</label>
              <input type="text" inputMode="numeric" value={fcBoxQtyBoxes} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setFcBoxQtyBoxes(val); }} className="form-control" placeholder="e.g. 150" />
            </div>

            <div className="form-group">
              <label className="form-label">Ply Type</label>
              <select value={fcBoxPlyType} onChange={e => setFcBoxPlyType(e.target.value)} className="form-control">
                <option value="3">3 Ply (2 Paper, 1 Flute)</option>
                <option value="5">5 Ply (3 Paper, 2 Flute)</option>
                <option value="7">7 Ply (4 Paper, 3 Flute)</option>
                <option value="9">9 Ply (5 Paper, 4 Flute)</option>
                <option value="11">11 Ply (6 Paper, 5 Flute)</option>
                <option value="13">13 Ply (7 Paper, 6 Flute)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Flute Extra (%)</label>
              <input type="text" inputMode="decimal" value={fcBoxFluteExtraPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxFluteExtraPercent(val); }} className="form-control" placeholder="e.g. 45" />
            </div>

            <div className="form-group">
              <label className="form-label">Price per KG (₹)</label>
              <input type="text" inputMode="decimal" value={fcBoxPricePerKg} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxPricePerKg(val); }} className="form-control" placeholder="e.g. 60" />
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Paper thickness)</label>
              <select value={fcBoxGsmPaper} onChange={e => setFcBoxGsmPaper(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Flute thickness)</label>
              <select value={fcBoxGsmFlute} onChange={e => setFcBoxGsmFlute(e.target.value)} className="form-control">
                <GsmOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GSM (Packing paper)</label>
              <select value={fcBoxIsDuplex ? '230' : fcBoxGsmPacking} onChange={e => setFcBoxGsmPacking(e.target.value)} className="form-control" disabled={fcBoxIsDuplex}>
                <GsmOptions />
              </select>
            </div>

            {/* Duplex Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsDuplex} onChange={e => setFcBoxIsDuplex(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Use Duplex Paper</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top liner paper is duplex 230 GSM, normal paper for rest</span>
              </div>
              <div>
                <label className="form-label">Duplex Price per KG (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxDuplexPrice} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxDuplexPrice(val); }} className="form-control" disabled={!fcBoxIsDuplex} placeholder="e.g. 70.00" />
              </div>
            </div>

            {/* Lamination Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsLaminated} onChange={e => setFcBoxIsLaminated(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Lamination</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lamination cost added per box</span>
              </div>
              <div>
                <label className="form-label">Lamination cost per sq inch (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxLaminationRupees} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxLaminationRupees(val); }} className="form-control" disabled={!fcBoxIsLaminated} placeholder="e.g. 0.0018" />
              </div>
            </div>

            {/* Printing Toggle & Plate Info */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsPrintingCharge} onChange={e => setFcBoxIsPrintingCharge(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Printing Charge</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Printing labour and plate charges split per box</span>
              </div>
              <div>
                <label className="form-label">Labour Charge (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxPrintingLabourCharge} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxPrintingLabourCharge(val); }} className="form-control" disabled={!fcBoxIsPrintingCharge} placeholder="Labour" />
              </div>
              <div>
                <label className="form-label">Plate (₹) &amp; Qty</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" inputMode="decimal" value={fcBoxPrintingPlatePrice} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxPrintingPlatePrice(val); }} className="form-control" disabled={!fcBoxIsPrintingCharge} placeholder="Price" />
                  <input type="text" inputMode="numeric" value={fcBoxPrintingNoOfPlates} onChange={e => { const val = sanitizeUnsignedIntegerInput(e.target.value); if (val !== null) setFcBoxPrintingNoOfPlates(val); }} className="form-control" disabled={!fcBoxIsPrintingCharge} placeholder="Qty" style={{ width: '60px' }} />
                </div>
              </div>
            </div>

            {/* Ink Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsInkCost} onChange={e => setFcBoxIsInkCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Ink Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ink cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Ink Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxInkPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxInkPricePerBox(val); }} className="form-control" disabled={!fcBoxIsInkCost} placeholder="e.g. 1.50" />
              </div>
            </div>

            {/* Screen Printing Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsScreenPrinting} onChange={e => setFcBoxIsScreenPrinting(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Screen Printing</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screen printing cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Screen Printing Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxScreenPrintingPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxScreenPrintingPricePerBox(val); }} className="form-control" disabled={!fcBoxIsScreenPrinting} placeholder="e.g. 2.00" />
              </div>
            </div>

            {/* Callico Cost Toggle & Price */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', gridColumn: 'span 2', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={fcBoxIsCallicoCost} onChange={e => setFcBoxIsCallicoCost(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ fontWeight: '700' }}>Add Callico Cost</span>
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Callico cost added per box directly</span>
              </div>
              <div>
                <label className="form-label">Callico Cost per Box (₹)</label>
                <input type="text" inputMode="decimal" value={fcBoxCallicoPricePerBox} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxCallicoPricePerBox(val); }} className="form-control" disabled={!fcBoxIsCallicoCost} placeholder="e.g. 3.00" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">BF (Burst Factor)</label>
              <select value={fcBoxBf} onChange={e => setFcBoxBf(e.target.value)} className="form-control">
                <BfOptions />
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity of Data (Multiplier)</label>
              <input type="text" inputMode="decimal" value={fcBoxQtyData} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxQtyData(val); }} className="form-control" placeholder="e.g. 2" />
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate (%)</label>
              <input type="text" inputMode="decimal" value={fcBoxGstPercent} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxGstPercent(val); }} className="form-control" placeholder="e.g. 18" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (+)</label>
              <input type="text" inputMode="decimal" value={fcBoxReelSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxReelSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Reel Size (-)</label>
              <input type="text" inputMode="decimal" value={fcBoxReelSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxReelSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (+)</label>
              <input type="text" inputMode="decimal" value={fcBoxCutSizePlus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxCutSizePlus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div className="form-group">
              <label className="form-label">Cut Size (-)</label>
              <input type="text" inputMode="decimal" value={fcBoxCutSizeMinus} onChange={e => { const val = sanitizeUnsignedDecimalInput(e.target.value); if (val !== null) setFcBoxCutSizeMinus(val); }} className="form-control" placeholder="e.g. 0.5" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', gridColumn: 'span 2', marginTop: '8px' }}>
              <CopyFileSelector label="Select / Create File" selectedFile={fcBoxCustomerCopyFile} setSelectedFile={setFcBoxCustomerCopyFile} showNewInput={fcBoxShowNewCustomerCopyInput} setShowNewInput={setFcBoxShowNewCustomerCopyInput} newFileName={fcBoxNewCustomerCopyFile} setNewFileName={setFcBoxNewCustomerCopyFile} existingFiles={existingCustomerCopyFiles} />
            </div>

          </div>

          {editingId && (editingType === 'full_closing' || editingType === 'full_closing_box') ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={(e) => handleFcBoxSave(e, false)}
                disabled={fcBoxSaving || !fcBoxResults}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, hsl(330, 75%, 50%), hsl(340, 75%, 60%))', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)', border: 'none' }}
              >
                <Save size={18} />
                <span>{fcBoxSaving ? 'Updating...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleFcBoxSave(e, true)}
                disabled={fcBoxSaving || !fcBoxResults}
                style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, hsl(150, 65%, 40%), hsl(160, 65%, 50%))', color: 'white', border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: fcBoxSaving || !fcBoxResults ? 'not-allowed' : 'pointer', opacity: fcBoxSaving || !fcBoxResults ? 0.6 : 1, transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(50, 160, 100, 0.3)' }}
              >
                <FolderPlus size={18} />
                <span>{fcBoxSaving ? 'Saving Copy...' : 'Save as New Data'}</span>
              </button>
            </div>
          ) : (
            <button type="submit" disabled={fcBoxSaving || !fcBoxResults} className="btn-primary" style={{ width: '100%', marginTop: '24px', justifyContent: 'center', background: 'linear-gradient(135deg, hsl(330, 75%, 50%), hsl(340, 75%, 60%))', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.3)', border: 'none' }}>
              <Save size={18} />
              <span>{fcBoxSaving ? 'Saving calculations...' : 'Save Full Closing Box Calculation'}</span>
            </button>
          )}
        </form>

        {/* Full Closing Box — Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)' }}>Calculation Preview</h2>
          <div className="glass-panel" style={{ padding: '32px', borderLeft: '4px solid hsl(330, 75%, 55%)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {renderPreview({
              results: fcBoxResults,
              calcType: 'fullClosingBox',
              plyType: fcBoxPlyType,
              gsmPaper: fcBoxGsmPaper,
              gsmPacking: fcBoxGsmPacking,
              gsmFlute: fcBoxGsmFlute,
              fluteExtraPercent: fcBoxFluteExtraPercent,
              qty: fcBoxQtyBoxes,
              gstPercent: fcBoxGstPercent
            })}
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
