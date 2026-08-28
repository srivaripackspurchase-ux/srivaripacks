import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Trash2, Printer, AlertCircle, RefreshCw, ArrowLeft, FolderOpen, FileText, Edit3, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { useNotification } from '../context/NotificationContext';

export default function ProductionHistory() {
  const { authenticatedFetch } = useAuth();
  const { showToast, confirmModal, promptModal } = useNotification();
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFile, setExpandedFile] = useState(null);

  const [registeredFiles, setRegisteredFiles] = useState([]);

  const fetchRegisteredFiles = async () => {
    try {
      const res = await authenticatedFetch('/api/customers/files?type=production');
      if (res.ok) {
        const data = await res.json();
        setRegisteredFiles(data);
      }
    } catch (e) { }
  };

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCalculations(data);
      } else {
        setError('Failed to fetch production logs.');
        showToast('Failed to fetch production records', 'error');
      }
    } catch (err) {
      setError('Failed to reach backend server.');
      showToast('Network error loading production records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        await Promise.all([fetchCalculations(), fetchRegisteredFiles()]);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleEdit = (calc, e) => {
    e.stopPropagation();
    navigate(`/production?editId=${calc.id}`);
  };

  const handleRenameFile = (oldName) => {
    promptModal({
      title: 'Rename Production File',
      message: `Enter a new file name for "${oldName}":`,
      defaultValue: oldName,
      confirmText: 'Rename File',
      onConfirm: async (newName) => {
        if (!newName || !newName.trim() || newName.trim() === oldName) return;

        try {
          const res = await authenticatedFetch('/api/customers/files/rename', {
            method: 'PUT',
            body: JSON.stringify({ oldName, newName: newName.trim(), type: 'production' })
          });
          if (res.ok) {
            await fetchCalculations();
            await fetchRegisteredFiles();
            showToast(`Production file renamed to "${newName.trim()}" successfully!`, 'success');
          } else {
            showToast('Could not rename production file.', 'error');
          }
        } catch (err) {
          showToast('Network error renaming production file.', 'error');
        }
      }
    });
  };

  const handleDeleteFile = (fileName) => {
    confirmModal({
      title: 'Delete Production File',
      message: `Are you sure you want to delete production file "${fileName}" and ALL its records? This action cannot be undone.`,
      confirmText: 'Delete File & Orders',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch('/api/customers/files/delete', {
            method: 'DELETE',
            body: JSON.stringify({ name: fileName, type: 'production' })
          });
          if (res.ok) {
            await fetchCalculations();
            await fetchRegisteredFiles();
            showToast(`Production file "${fileName}" deleted successfully!`, 'success');
          } else {
            showToast('Could not delete production file.', 'error');
          }
        } catch (err) {
          showToast('Network error deleting production file.', 'error');
        }
      }
    });
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    confirmModal({
      title: 'Delete Production Order',
      message: 'Are you sure you want to delete this production calculation record? This action cannot be undone.',
      confirmText: 'Delete Record',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/customers/${id}?tab=production`, {
            method: 'DELETE',
          });
          if (res.ok) {
            await fetchCalculations();
            showToast('Production record deleted successfully!', 'success');
          } else {
            showToast('Could not delete production record.', 'error');
          }
        } catch (err) {
          showToast('Network error deleting production record.', 'error');
        }
      }
    });
  };

  // Helper to parse fractions and labels to numeric dimensions
  // Returns { L, W, H } in the ORIGINAL unit, plus the unit itself
  const getBoxDimensions = (calc) => {
    let L = Number(calc.company_sizes?.length_inches || 0);
    let W = Number(calc.company_sizes?.width_inches || 0);
    let H = Number(calc.company_sizes?.height_inches || 0);
    const unit = calc.company_sizes?.unit || 'inch';

    if (L === 0 && calc.size_label) {
      let normalized = calc.size_label
        .replace(/¾/g, '.75')
        .replace(/½/g, '.5')
        .replace(/¼/g, '.25');
      const matches = normalized.match(/[\d.]+/g);
      if (matches && matches.length >= 3) {
        L = parseFloat(matches[0]);
        W = parseFloat(matches[1]);
        H = parseFloat(matches[2]);
      } else if (matches && matches.length >= 2) {
        L = parseFloat(matches[0]);
        W = parseFloat(matches[1]);
        H = 0;
      }
    }
    return { L, W, H, unit };
  };

  const parseCalcMeta = (calc) => {
    let pOption = 'N';
    let lOption = 'G/N';
    let refName = 'Production Order';
    let savedMultiplier = 1;
    let productionFile = 'Ungrouped';
    let isPad = false;
    let isPartition = false;
    let isTray = false;
    let isSleave = false;
    let isCollerBox = false;
    let isTopSideTrayBox = false;
    let isUniversalType = false;
    let isFullClosingBox = false;
    let isPaired = false;
    let p1ReelCut = '';
    let p2ReelCut = '';
    let p1Packing = 0;
    let p1Liner = 0;
    let p2Packing = 0;
    let p2Liner = 0;
    let p1DefaultPacking = 0;
    let p1DefaultLiner = 0;
    let p2DefaultPacking = 0;
    let p2DefaultLiner = 0;
    let p1SizeMM = '';
    let p2SizeMM = '';
    let p1SizeInch = '';
    let p2SizeInch = '';
    let dateOfFinish = '';

    try {
      const parsed = JSON.parse(calc.customer_name);
      if (parsed && typeof parsed === 'object') {
        pOption = parsed.pOption || 'N';
        lOption = parsed.lOption || 'N';
        refName = parsed.ref || 'Production Order';
        const reelMult = parsed.reelMultiplier || parsed.sizeMultiplier || 1;
        const cutMult = parsed.cutMultiplier || 1;
        savedMultiplier = reelMult * cutMult;
        productionFile = parsed.productionFile || 'Ungrouped';
        isPad = parsed.isPad || false;
        isPartition = parsed.isPartition || false;
        isTray = parsed.isTray || false;
        isSleave = parsed.isSleave || parsed.isTrayBox || false;
        isCollerBox = parsed.isCollerBox || false;
        isTopSideTrayBox = parsed.isTopSideTrayBox || false;
        isUniversalType = parsed.isUniversalType || false;
        isFullClosingBox = parsed.isFullClosingBox || false;
        isPaired = parsed.isPaired || false;
        p1ReelCut = parsed.p1ReelCut || '';
        p2ReelCut = parsed.p2ReelCut || '';
        p1Packing = parsed.p1Packing !== undefined ? parsed.p1Packing : 0;
        p1Liner = parsed.p1Liner !== undefined ? parsed.p1Liner : 0;
        p2Packing = parsed.p2Packing !== undefined ? parsed.p2Packing : 0;
        p2Liner = parsed.p2Liner !== undefined ? parsed.p2Liner : 0;
        p1DefaultPacking = parsed.p1DefaultPacking !== undefined ? parsed.p1DefaultPacking : 0;
        p1DefaultLiner = parsed.p1DefaultLiner !== undefined ? parsed.p1DefaultLiner : 0;
        p2DefaultPacking = parsed.p2DefaultPacking !== undefined ? parsed.p2DefaultPacking : 0;
        p2DefaultLiner = parsed.p2DefaultLiner !== undefined ? parsed.p2DefaultLiner : 0;
        p1SizeMM = parsed.p1SizeMM || '';
        p2SizeMM = parsed.p2SizeMM || '';
        p1SizeInch = parsed.p1SizeInch || '';
        p2SizeInch = parsed.p2SizeInch || '';
        dateOfFinish = parsed.dateOfFinish || calc.date_of_finish || '';
      }
    } catch (e) {
      if (calc.customer_name) refName = calc.customer_name;
    }

    let defaultTypeRef = 'Standard Box Production';
    if (isPad) defaultTypeRef = 'Pad Production';
    else if (isPartition) defaultTypeRef = 'Partition Production';
    else if (isTray) defaultTypeRef = 'Tray Production';
    else if (isSleave) defaultTypeRef = 'Sleave Production';
    else if (isCollerBox) defaultTypeRef = 'Coller Box Production';
    else if (isTopSideTrayBox) defaultTypeRef = 'Top Side Tray Box Production';
    else if (isUniversalType) defaultTypeRef = 'Universal Type Production';
    else if (isFullClosingBox) defaultTypeRef = 'Full Closing Box Production';

    const genericRefs = [
      '',
      'Production Order',
      'Standard Box Production Order',
      'Pad Production Order',
      'Partition Production Order',
      'Tray Production Order',
      'Sleave Production Order',
      'Coller Box Production Order',
      'Top Side Tray Box Production Order',
      'Universal Type Production Order',
      'Full Closing Box Production Order'
    ];

    if (!refName || genericRefs.includes(refName.trim())) {
      refName = defaultTypeRef;
    }

    const dims = getBoxDimensions(calc);
    let sizeMM = 'N/A';
    let sizeInch = 'N/A';

    if (dims && (dims.L > 0 || dims.W > 0)) {
      const isMM = dims.unit && dims.unit.toLowerCase() === 'mm';
      const L = dims.L;
      const W = dims.W;
      const H = dims.H;

      const hasH = H > 0 && !isPad;

      if (isMM) {
        sizeMM = hasH ? `${L} × ${W} × ${H}` : `${L} × ${W}`;
        const lIn = Number((L / 25.4).toFixed(2));
        const wIn = Number((W / 25.4).toFixed(2));
        const hIn = Number((H / 25.4).toFixed(2));
        sizeInch = hasH ? `${lIn} × ${wIn} × ${hIn}` : `${lIn} × ${wIn}`;
      } else {
        const lMm = Math.round(L * 25.4);
        const wMm = Math.round(W * 25.4);
        const hMm = Math.round(H * 25.4);
        sizeMM = hasH ? `${lMm} × ${wMm} × ${hMm}` : `${lMm} × ${wMm}`;
        const lIn = Number(L.toFixed(2));
        const wIn = Number(W.toFixed(2));
        const hIn = Number(H.toFixed(2));
        sizeInch = hasH ? `${lIn} × ${wIn} × ${hIn}` : `${lIn} × ${wIn}`;
      }
    }

    const format2Dec = (val) => {
      if (val === null || val === undefined || val === '') return 'N/A';
      const num = Number(val);
      if (isNaN(num)) return val;
      return num.toFixed(2);
    };

    let reelCut = `${format2Dec(calc.reel_size)} × ${format2Dec(calc.cut_size)}`;
    let lengthReelCut = '';
    let widthReelCut = '';
    let topReelCut = '';
    let bottomReelCut = '';

    if (isSleave || isCollerBox || isTopSideTrayBox) {
      try {
        const parsed = JSON.parse(calc.customer_name);
        lengthReelCut = parsed.lengthReelCut || '';
        widthReelCut = parsed.widthReelCut || '';
        if (!lengthReelCut || !widthReelCut) {
          const reelM = parsed.reelMultiplier || 1;
          const cutM = parsed.cutMultiplier || 1;
          const flabL = Number(parsed.flabL || 0);
          const flabW = Number(parsed.flabW || 0);
          const reelAdj = Number(calc.reel_size_adjust || 0);
          const cutAdj = Number(calc.cut_size_adjust || 0);
          const L = dims.L;
          const W = dims.W;
          const H = dims.H;
          if (L > 0 && W > 0 && H > 0) {
            const calcLength = L + flabL + 1;
            const calcWidth = W + flabW + 1;
            const calcHeight = isTopSideTrayBox ? (H + (W / 2) + 1 + reelAdj) : (H + 1 + reelAdj);
            lengthReelCut = `${(calcHeight * reelM).toFixed(2)} × ${((calcLength + cutAdj) * cutM).toFixed(2)}`;
            widthReelCut = `${(calcHeight * reelM).toFixed(2)} × ${((calcWidth + cutAdj) * cutM).toFixed(2)}`;
          } else if (calc.reel_size && calc.cut_size) {
            lengthReelCut = `${(Number(calc.reel_size)).toFixed(2)} × ${(Number(calc.cut_size)).toFixed(2)}`;
            widthReelCut = `${(Number(calc.reel_size)).toFixed(2)} × ${(Number(calc.cut_size)).toFixed(2)}`;
          }
        }
      } catch (e) { }
    } else if (isUniversalType) {
      try {
        const parsed = JSON.parse(calc.customer_name);
        topReelCut = parsed.topReelCut || '';
        bottomReelCut = parsed.bottomReelCut || '';
        if (!topReelCut || !bottomReelCut) {
          const reelM = parsed.reelMultiplier || 1;
          const cutM = parsed.cutMultiplier || 1;
          const reelAdj = Number(calc.reel_size_adjust || 0);
          const cutAdj = Number(calc.cut_size_adjust || 0);
          const L = dims.L;
          const W = dims.W;
          const H = dims.H;
          if (L > 0 && W > 0 && H > 0) {
            const rSize = L + H + H + 1 + reelAdj;
            const cSize = W + H + H + 1 + cutAdj;
            topReelCut = `${((rSize + 0.5) * reelM).toFixed(2)} × ${((cSize + 0.5) * cutM).toFixed(2)}`;
            bottomReelCut = `${(rSize * reelM).toFixed(2)} × ${(cSize * cutM).toFixed(2)}`;
          } else if (calc.reel_size && calc.cut_size) {
            const rSize = Number(calc.reel_size);
            const cSize = Number(calc.cut_size);
            topReelCut = `${((rSize + 0.5) * reelM).toFixed(2)} × ${((cSize + 0.5) * cutM).toFixed(2)}`;
            bottomReelCut = `${(rSize * reelM).toFixed(2)} × ${(cSize * cutM).toFixed(2)}`;
          }
        }
      } catch (e) { }
    }

    const qty = calc.quantity_of_boxes || 0;
    const ply = Number(calc.ply_type) || 3;

    let defaultPackingCount = (!pOption || pOption === '-') ? 0 : qty;
    let defaultLinerCount = (isPad ? ply : (ply - 1) / 2) * qty;

    let packingCount = defaultPackingCount;
    let linerCount = defaultLinerCount;

    let lengthPackingCount = 0;
    let widthPackingCount = 0;
    let topPackingCount = 0;
    let bottomPackingCount = 0;
    let lengthLinerCount = 0;
    let widthLinerCount = 0;
    let topLinerCount = 0;
    let bottomLinerCount = 0;

    try {
      const parsed = JSON.parse(calc.customer_name);
      if (parsed) {
        if (parsed.packingPaperCount !== undefined) packingCount = parsed.packingPaperCount;
        if (parsed.linerCount !== undefined) linerCount = parsed.linerCount;

        if (isSleave || isCollerBox || isTopSideTrayBox) {
          lengthPackingCount = parsed.lengthPackingPaperCount !== undefined ? parsed.lengthPackingPaperCount : defaultPackingCount;
          widthPackingCount = parsed.widthPackingPaperCount !== undefined ? parsed.widthPackingPaperCount : defaultPackingCount;
          lengthLinerCount = parsed.lengthLinerCount !== undefined ? parsed.lengthLinerCount : defaultLinerCount;
          widthLinerCount = parsed.widthLinerCount !== undefined ? parsed.widthLinerCount : defaultLinerCount;
        } else if (isUniversalType) {
          topPackingCount = parsed.topPackingPaperCount !== undefined ? parsed.topPackingPaperCount : defaultPackingCount;
          bottomPackingCount = parsed.bottomPackingPaperCount !== undefined ? parsed.bottomPackingPaperCount : defaultPackingCount;
          topLinerCount = parsed.topLinerCount !== undefined ? parsed.topLinerCount : defaultLinerCount;
          bottomLinerCount = parsed.bottomLinerCount !== undefined ? parsed.bottomLinerCount : defaultLinerCount;
        }
      }
    } catch (e) { }

    return {
      pOption,
      lOption,
      refName,
      savedMultiplier,
      productionFile,
      isPad,
      isPartition,
      isTray,
      isSleave,
      isCollerBox,
      isTopSideTrayBox,
      isUniversalType,
      isFullClosingBox,
      isPaired,
      p1ReelCut,
      p2ReelCut,
      p1Packing,
      p1Liner,
      p2Packing,
      p2Liner,
      p1DefaultPacking,
      p1DefaultLiner,
      p2DefaultPacking,
      p2DefaultLiner,
      p1SizeMM,
      p2SizeMM,
      p1SizeInch,
      p2SizeInch,
      qty,
      sizeMM,
      sizeInch,
      reelCut,
      lengthReelCut,
      widthReelCut,
      topReelCut,
      bottomReelCut,
      lengthPackingCount,
      widthPackingCount,
      topPackingCount,
      bottomPackingCount,
      lengthLinerCount,
      widthLinerCount,
      topLinerCount,
      bottomLinerCount,
      packingCount,
      linerCount,
      dateOfFinish
    };
  };

  const productionCalcs = calculations.filter(calc => Number(calc.grand_total) === 0);

  const fileNames = [...new Set(productionCalcs.map(calc => parseCalcMeta(calc).productionFile))].sort();

  const filteredCalculations = productionCalcs.filter(calc => {
    const meta = parseCalcMeta(calc);
    const query = search.toLowerCase();
    const compName = (calc.company_name || '').toLowerCase();
    const fileName = (meta.productionFile || '').toLowerCase();
    const refName = (meta.refName || '').toLowerCase();
    return compName.includes(query) || fileName.includes(query) || refName.includes(query);
  });

  const groupedByFile = {};
  registeredFiles.forEach(fName => {
    if (!search || fName.toLowerCase().includes(search.toLowerCase())) {
      groupedByFile[fName] = [];
    }
  });

  filteredCalculations.forEach(calc => {
    const meta = parseCalcMeta(calc);
    if (!groupedByFile[meta.productionFile]) {
      groupedByFile[meta.productionFile] = [];
    }
    groupedByFile[meta.productionFile].push(calc);
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const trimmed = dateStr.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(trimmed)) {
      return trimmed.replace(/-/g, '/');
    }
    return trimmed;
  };

  const handleSavePDF = async (fileName) => {
    const calcsForFile = groupedByFile[fileName] || [];
    if (calcsForFile.length === 0) return;

    showToast && showToast(`Generating PDF for ${fileName}...`, 'info');

    const now = new Date();
    const dateSuffix = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const pdfDownloadName = `${fileName}_${dateSuffix}.pdf`;

    const timeStampStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const formattedDateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // A4 Landscape dimensions: 297mm x 210mm
    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const pdfWidth = 297;
    const pdfHeight = 210;

    // DOM Container dimensions matching 297mm x 210mm aspect ratio at high rendering quality
    const containerWidth = 1188; // 297 * 4
    const containerHeight = 840;  // 210 * 4

    // 1. Construct DOM tr HTML for each record with professional readable styling (10.5px font, line-height 1.4, clear borders)
    const renderedRows = calcsForFile.map((calc, idx) => {
      const meta = parseCalcMeta(calc);
      const serialNo = idx + 1;

      let packingCellContent = `<span style="color: #16a34a; font-weight: 700;">${meta.packingCount} (${meta.pOption})</span>`;
      let linerCellContent = `<span style="color: #16a34a; font-weight: 700;">${meta.linerCount} (${meta.lOption})</span>`;
      let sizeMMCell = `<span style="font-weight: 700;">${meta.sizeMM}</span>`;
      let sizeInchCell = `<span style="font-weight: 700;">${meta.sizeInch}</span>`;
      let reelCutCell = `<span style="font-weight: 700;">${meta.reelCut}${meta.savedMultiplier > 1 ? ` <small>(${meta.savedMultiplier}×)</small>` : ''}</span>`;

      if (meta.isPaired && meta.p1ReelCut) {
        if (meta.p1SizeMM) sizeMMCell = `<div style="font-weight: 700;">P1: ${meta.p1SizeMM}</div><div style="font-weight: 700; margin-top: 2px;">P2: ${meta.p2SizeMM}</div>`;
        if (meta.p1SizeInch) sizeInchCell = `<div style="font-weight: 700;">P1: ${meta.p1SizeInch}</div><div style="font-weight: 700; margin-top: 2px;">P2: ${meta.p2SizeInch}</div>`;
        reelCutCell = `<div style="font-weight: 700;">P1: ${meta.p1ReelCut}</div><div style="font-weight: 700; margin-top: 2px;">P2: ${meta.p2ReelCut}</div>${meta.savedMultiplier > 1 ? `<small>(${meta.savedMultiplier}×)</small>` : ''}`;
        packingCellContent = `
          <div style="color: #16a34a; font-weight: 700;">P1: ${meta.p1Packing} (${meta.pOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">P2: ${meta.p2Packing} (${meta.pOption})</div>
        `;
        linerCellContent = `
          <div style="color: #16a34a; font-weight: 700;">P1: ${meta.p1Liner} (${meta.lOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">P2: ${meta.p2Liner} (${meta.lOption})</div>
        `;
      } else if (meta.isSleave || meta.isCollerBox || meta.isTopSideTrayBox) {
        reelCutCell = `<div style="font-weight: 700;">L: ${meta.lengthReelCut}</div><div style="font-weight: 700; margin-top: 2px;">W: ${meta.widthReelCut}</div>${meta.savedMultiplier > 1 ? `<small>(${meta.savedMultiplier}×)</small>` : ''}`;
        packingCellContent = `
          <div style="color: #16a34a; font-weight: 700;">L: ${meta.lengthPackingCount} (${meta.pOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">W: ${meta.widthPackingCount} (${meta.pOption})</div>
        `;
        linerCellContent = `
          <div style="color: #16a34a; font-weight: 700;">L: ${meta.lengthLinerCount} (${meta.lOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">W: ${meta.widthLinerCount} (${meta.lOption})</div>
        `;
      } else if (meta.isUniversalType) {
        reelCutCell = `<div style="font-weight: 700;">Top: ${meta.topReelCut}</div><div style="font-weight: 700; margin-top: 2px;">Btm: ${meta.bottomReelCut}</div>${meta.savedMultiplier > 1 ? `<small>(${meta.savedMultiplier}×)</small>` : ''}`;
        packingCellContent = `
          <div style="color: #16a34a; font-weight: 700;">Top: ${meta.topPackingCount} (${meta.pOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">Btm: ${meta.bottomPackingCount} (${meta.pOption})</div>
        `;
        linerCellContent = `
          <div style="color: #16a34a; font-weight: 700;">Top: ${meta.topLinerCount} (${meta.lOption})</div>
          <div style="color: #16a34a; font-weight: 700; margin-top: 2px;">Btm: ${meta.bottomLinerCount} (${meta.lOption})</div>
        `;
      }

      const finishDateStr = formatDateDisplay(meta.dateOfFinish);
      const bgStyle = idx % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;';

      const trHTML = `
        <tr style="${bgStyle}">
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-weight: 800; color: #0f172a; font-size: 10.5px; box-sizing: border-box; vertical-align: middle;">${serialNo}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 6px; font-weight: 800; color: #0f172a; font-size: 10.5px; text-transform: uppercase; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${calc.company_name || 'Unknown'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${sizeMMCell}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${sizeInchCell}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${reelCutCell}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${packingCellContent}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;">${linerCellContent}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; font-weight: 700; box-sizing: border-box; vertical-align: middle;">${calc.ply_type || 'N/A'} Ply</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; font-weight: 700; box-sizing: border-box; vertical-align: middle;">${calc.gsm_paper || calc.gsm || 150} / ${calc.bf || 16}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; font-weight: 800; color: #0f172a; box-sizing: border-box; vertical-align: middle;">${meta.qty}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10.5px; font-weight: 700; box-sizing: border-box; vertical-align: middle;">${finishDateStr}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 6px; text-align: center; font-size: 10.5px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box; vertical-align: middle;"><span style="color: #2563eb; font-weight: 700;">${meta.refName}</span></td>
        </tr>
      `;
      return { idx, trHTML, company: calc.company_name || '', ref: meta.refName || '' };
    });

    // 2. Measure actual content lengths to calculate dynamic column width distribution
    // Available printable width inside 1188px container with 20px padding left/right = 1148px
    let maxCompanyLen = 0;
    let maxRefLen = 0;
    calcsForFile.forEach(calc => {
      const meta = parseCalcMeta(calc);
      const cLen = (calc.company_name || '').length;
      const rLen = (meta.refName || '').length;
      if (cLen > maxCompanyLen) maxCompanyLen = cLen;
      if (rLen > maxRefLen) maxRefLen = rLen;
    });

    // Minimum base widths for columns (sum = 1148px)
    const colWidths = {
      serial: 36,     // #
      company: 140,   // COMPANY
      sizeMM: 110,    // SIZE (MM)
      sizeInch: 105,  // SIZE (INCH)
      reelCut: 125,   // REEL × CUT
      packing: 100,   // PACKING PAPER
      liner: 100,     // LINER
      ply: 65,        // PLY TYPE
      gsmBf: 75,      // GSM / BF
      qty: 68,        // QTY OF BOX
      finishDate: 88, // DATE OF FINISH
      ref: 136,       // REF
    };

    const totalBaseWidth = Object.values(colWidths).reduce((a, b) => a + b, 0); // 1148px
    const extraPixels = 1148 - totalBaseWidth;

    if (extraPixels > 0) {
      const companyWeight = Math.max(maxCompanyLen, 10);
      const refWeight = Math.max(maxRefLen, 10);
      const totalWeight = companyWeight + refWeight;

      colWidths.company += Math.round((companyWeight / totalWeight) * extraPixels);
      colWidths.ref += Math.round((refWeight / totalWeight) * extraPixels);
    }

    const headerHTML = `
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a;">
          <th style="width: ${colWidths.serial}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">S.No</th>
          <th style="width: ${colWidths.company}px; padding: 8px 6px; text-align: left; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">COMPANY</th>
          <th style="width: ${colWidths.sizeMM}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">SIZE (MM)</th>
          <th style="width: ${colWidths.sizeInch}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">SIZE (INCH)</th>
          <th style="width: ${colWidths.reelCut}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">REEL × CUT</th>
          <th style="width: ${colWidths.packing}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">PACKING PAPER</th>
          <th style="width: ${colWidths.liner}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">LINER</th>
          <th style="width: ${colWidths.ply}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">PLY TYPE</th>
          <th style="width: ${colWidths.gsmBf}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">GSM / BF</th>
          <th style="width: ${colWidths.qty}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">QTY OF BOX</th>
          <th style="width: ${colWidths.finishDate}px; padding: 8px 4px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">DATE OF FINISH</th>
          <th style="width: ${colWidths.ref}px; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 800; border: 1px solid #cbd5e1; box-sizing: border-box;">REF</th>
        </tr>
      </thead>
    `;

    // 3. Temporary DOM element to measure actual rendered height of every row
    const measureContainer = document.createElement('div');
    measureContainer.style.position = 'absolute';
    measureContainer.style.left = '-9999px';
    measureContainer.style.top = '-9999px';
    measureContainer.style.width = `${containerWidth}px`;
    measureContainer.style.padding = '20px';
    measureContainer.style.background = '#ffffff';
    measureContainer.style.fontFamily = "'Inter', system-ui, sans-serif";
    measureContainer.style.boxSizing = 'border-box';

    measureContainer.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; border: 1px solid #cbd5e1;">
        ${headerHTML}
        <tbody>
          ${renderedRows.map(r => r.trHTML).join('')}
        </tbody>
      </table>
    `;

    document.body.appendChild(measureContainer);

    const rowElements = measureContainer.querySelectorAll('tbody tr');
    const measuredHeights = [];
    rowElements.forEach((tr) => {
      const h = Math.ceil(tr.getBoundingClientRect().height);
      measuredHeights.push(Math.max(h, 32));
    });

    if (document.body.contains(measureContainer)) {
      document.body.removeChild(measureContainer);
    }

    // 4. Calculate page distribution dynamically based on actual rendered row heights
    // Total printable container height = 840px
    // Top & bottom padding = 40px
    // Header section = ~110px
    // Blue line separator = ~14px
    // Table header = ~38px
    // Footer = ~45px
    // Max available height for tbody per page = 840 - 247 = 593px. Using 575px for safety margin.
    const MAX_TBODY_HEIGHT = 575;

    const pagesRows = [];
    let currentBatch = [];
    let currentBatchHeight = 0;

    renderedRows.forEach((rowObj, i) => {
      const rowH = measuredHeights[i] || 36;

      if (currentBatch.length > 0 && (currentBatchHeight + rowH > MAX_TBODY_HEIGHT)) {
        pagesRows.push(currentBatch);
        currentBatch = [rowObj];
        currentBatchHeight = rowH;
      } else {
        currentBatch.push(rowObj);
        currentBatchHeight += rowH;
      }
    });

    if (currentBatch.length > 0) {
      pagesRows.push(currentBatch);
    }

    const totalPages = pagesRows.length;

    // 5. Render pages and generate PDF
    try {
      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const pageCalcsRows = pagesRows[pageIdx];
        const pageRowsHTML = pageCalcsRows.map(r => r.trHTML).join('');

        const pageHTML = `
          <div style="padding: 20px; background: #ffffff; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; width: ${containerWidth}px; height: ${containerHeight}px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Date & Time &nbsp;: &nbsp;${timeStampStr}</div>
                <div style="text-align: center; flex: 1;">
                  <h1 style="font-size: 26px; font-weight: 900; letter-spacing: 0.05em; color: #0b192c; text-transform: uppercase; margin: 0; font-family: 'Inter', sans-serif;">SRI VARI PACKS</h1>
                  <div style="font-size: 13px; font-weight: 800; letter-spacing: 0.15em; color: #2563eb; text-transform: uppercase; margin-top: 2px;">PRODUCTION SYSTEM</div>
                  <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-top: 4px;">Production Report • Generated on ${formattedDateStr} • Total Records : ${calcsForFile.length}</div>
                </div>
                <div style="width: 140px;"></div>
              </div>

              <div style="height: 2px; background: #2563eb; margin-top: 8px; margin-bottom: 12px; width: 100%;"></div>

              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; border: 1px solid #cbd5e1;">
                ${headerHTML}
                <tbody>
                  ${pageRowsHTML}
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; margin-top: auto;">
              <div style="flex: 1; text-align: center; color: #2563eb; font-weight: 700; font-style: italic;">SRI VARI PACKS Production System</div>
              <div style="color: #334155; font-weight: 700;">Page ${pageIdx + 1} of ${totalPages}</div>
            </div>
          </div>
        `;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = `${containerWidth}px`;
        container.style.height = `${containerHeight}px`;
        container.style.background = '#ffffff';
        container.innerHTML = pageHTML;
        document.body.appendChild(container);

        try {
          const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/png');

          if (pageIdx > 0) {
            pdf.addPage('a4', 'l');
          }

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        } finally {
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }
      }

      pdf.save(pdfDownloadName);
      showToast && showToast(`Downloaded ${pdfDownloadName} successfully!`, 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast && showToast('Failed to generate PDF download.', 'error');
    }
  };

  return (
    <div className="page-container animate-fade">

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            Production History
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Organized production files with print-ready reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/production')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Planner</span>
          </button>
        </div>
      </div>

      {/* Single Search Bar for File & Company Selection */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search by Company Name or File Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <button
          onClick={fetchCalculations}
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600'
          }}
          title="Reload logs"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading production records...
        </div>
      ) : error ? (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : filteredCalculations.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          No production records found{search ? ` matching "${search}"` : ''}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {Object.entries(groupedByFile).map(([fileName, calcs]) => {
            const isFileExpanded = expandedFile === fileName;
            return (
              <div key={fileName} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>

                {/* File Header */}
                <div
                  onClick={() => setExpandedFile(isFileExpanded ? null : fileName)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    background: 'var(--bg-tertiary)',
                    borderBottom: isFileExpanded ? '2px solid var(--color-accent)' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {fileName}
                    </span>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--color-accent)',
                      fontWeight: '600',
                      fontSize: '0.75rem',
                    }}>
                      {calcs.length} record{calcs.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="no-print">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRenameFile(fileName); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                        }}
                        title="Rename Production File"
                      >
                        <Edit3 size={14} />
                        Rename
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(fileName); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--color-error)',
                          border: '1px solid var(--color-error)',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                        }}
                        title="Delete Production File and all records"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSavePDF(fileName); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--gradient-accent)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease',
                        }}
                        title="Download Production Report as PDF"
                      >
                        <FileDown size={14} />
                        Save as PDF
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: isFileExpanded ? 'var(--color-accent)' : 'var(--text-secondary)', fontWeight: '600' }}>
                      <span>{isFileExpanded ? 'Collapse File' : 'Expand File'}</span>
                      {isFileExpanded ? <ChevronUp size={18} color="var(--color-accent)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                {isFileExpanded && (
                  <div style={{ overflowX: 'auto' }} className="animate-fade">
                    {calcs.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        📁 No production orders inside file folder <strong>"{fileName}"</strong>.
                        <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                          This file folder remains saved in your database and is available in the selection dropdown. Click <strong>"Delete"</strong> above to permanently remove this file folder.
                        </div>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Company</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Size (MM)</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Size (Inch)</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Reel × Cut</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Packing Paper</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Liner</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Ply Type</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>GSM / BF</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Qty of Box</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Date of Finish</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>Ref</th>
                            <th style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcs.map(calc => {
                            const meta = parseCalcMeta(calc);
                            return (
                              <tr key={calc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '14px 16px', fontWeight: '600' }}>{calc.company_name || 'Unknown'}</td>
                                <td style={{ padding: '14px 16px' }}>
                                  {meta.isPaired && meta.p1SizeMM ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>P1: {meta.p1SizeMM}</div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>P2: {meta.p2SizeMM}</div>
                                    </div>
                                  ) : (
                                    meta.sizeMM
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  {meta.isPaired && meta.p1SizeInch ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>P1: {meta.p1SizeInch}</div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>P2: {meta.p2SizeInch}</div>
                                    </div>
                                  ) : (
                                    meta.sizeInch
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px' }}>
                                  {meta.isPaired && meta.p1ReelCut ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>P1: {meta.p1ReelCut}</div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>P2: {meta.p2ReelCut}</div>
                                      {meta.savedMultiplier > 1 && (
                                        <span style={{ marginTop: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontWeight: '600', fontSize: '0.7rem', alignSelf: 'flex-start' }}>
                                          {meta.savedMultiplier}×
                                        </span>
                                      )}
                                    </div>
                                  ) : meta.isSleave || meta.isCollerBox || meta.isTopSideTrayBox ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>L: {meta.lengthReelCut}</div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>W: {meta.widthReelCut}</div>
                                      {meta.savedMultiplier > 1 && (
                                        <span style={{ marginTop: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontWeight: '600', fontSize: '0.7rem', alignSelf: 'flex-start' }}>
                                          {meta.savedMultiplier}×
                                        </span>
                                      )}
                                    </div>
                                  ) : meta.isUniversalType ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>Top: {meta.topReelCut}</div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>Btm: {meta.bottomReelCut}</div>
                                      {meta.savedMultiplier > 1 && (
                                        <span style={{ marginTop: '2px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontWeight: '600', fontSize: '0.7rem', alignSelf: 'flex-start' }}>
                                          {meta.savedMultiplier}×
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      {meta.reelCut}
                                      {meta.savedMultiplier > 1 && (
                                        <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontWeight: '600', fontSize: '0.7rem' }}>
                                          {meta.savedMultiplier}×
                                        </span>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--color-success)' }}>
                                  {meta.isPaired && meta.p1Packing !== undefined && meta.p1ReelCut ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>P1: {meta.p1Packing} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>P2: {meta.p2Packing} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                    </div>
                                  ) : meta.isSleave || meta.isCollerBox || meta.isTopSideTrayBox ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>L: {meta.lengthPackingCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>W: {meta.widthPackingCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                    </div>
                                  ) : meta.isUniversalType ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>Top: {meta.topPackingCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>Btm: {meta.bottomPackingCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.pOption})</span></div>
                                    </div>
                                  ) : (
                                    <>
                                      {meta.packingCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({meta.pOption})</span>
                                    </>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--color-success)' }}>
                                  {meta.isPaired && meta.p1Liner !== undefined && meta.p1ReelCut ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>P1: {meta.p1Liner} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>P2: {meta.p2Liner} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                    </div>
                                  ) : meta.isSleave || meta.isCollerBox || meta.isTopSideTrayBox ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>L: {meta.lengthLinerCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>W: {meta.widthLinerCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                    </div>
                                  ) : meta.isUniversalType ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                                      <div>Top: {meta.topLinerCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>Btm: {meta.bottomLinerCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>({meta.lOption})</span></div>
                                    </div>
                                  ) : (
                                    <>
                                      {meta.linerCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({meta.lOption})</span>
                                    </>
                                  )}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: '600' }}>{calc.ply_type || 'N/A'} Ply</td>
                                <td style={{ padding: '14px 16px' }}>{calc.gsm_paper || calc.gsm || 150} / {calc.bf || 16}</td>
                                <td style={{ padding: '14px 16px', fontWeight: '700' }}>{meta.qty}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDateDisplay(meta.dateOfFinish)}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{meta.refName}</td>
                                <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <button
                                    onClick={(e) => handleEdit(calc, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--color-accent)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      marginRight: '4px'
                                    }}
                                    title="Edit Record"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(calc.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--color-error)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      transition: 'all 0.15s',
                                    }}
                                    title="Delete Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
