import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Trash2, ChevronDown, ChevronUp, FileText, Download, AlertCircle, FileDown, FolderOpen, RefreshCw, Edit3, Edit } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { jsPDF } from 'jspdf';
import { PLY_CONFIG } from '../utils/calculations';

export default function Customers() {
  const { authenticatedFetch } = useAuth();
  const { showToast, confirmModal, promptModal } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();

  // Default activeTab to 'customer' unless passed in router state
  const [activeTab, setActiveTab] = useState(
    (location.state && location.state.activeTab) || 'customer'
  );

  const [calculations, setCalculations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedFile, setExpandedFile] = useState(null);
  const [error, setError] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [quotationFolder, setQuotationFolder] = useState('');
  const [toAddressProfiles, setToAddressProfiles] = useState([]);
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [quotationItems, setQuotationItems] = useState([]);
  const [calculationGroups, setCalculationGroups] = useState([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormCalcIds, setGroupFormCalcIds] = useState([]);
  const [groupFormRepId, setGroupFormRepId] = useState(null);
  const [quotationHeader, setQuotationHeader] = useState({
    date: new Date().toLocaleDateString('en-GB'),
    selectedKeyword: '',
    toCompany: '',
    toAddress: '',
    dearSir: 'Dear Sir,',
    kindAttn: 'Mr. Karuppiah Subramanian',
    subject: 'Quotation for Corrugated boxes \u2013 Reg.',
    introText: 'With References to the subject, as per sample we mentioned below the best quote for our carton box as per your requirement.',
    techSpec1: 'The above box is using top 230 GSM white board and packing & flute using 180/18 BF.',
    techSpec2: 'The rate is including Rapper sheets, printing and Glass lamination charges.',
    term1: 'Delivery : 7 Days from the date of your confirmed Purchase Order',
    term2: 'Transport : Additional cost',
    term3: 'Payment : 15 days',
    term4: 'Tax : GST 18% Extra',
    signatory: 'M.MUTHUKUMAR',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    sNo: true,
    description: true,
    size: true,
    ply: true,
    qty: true,
    gsmBf: true,
    rate: true,
    dieCost: false,
  });
  const [showTechSpecs, setShowTechSpecs] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [isPDFSelectionModalOpen, setIsPDFSelectionModalOpen] = useState(false);
  const [pdfSelectionFolder, setPdfSelectionFolder] = useState('');
  const [pdfSelectionItems, setPdfSelectionItems] = useState([]);

  // Helper to parse duplex/lamination/printing/ink/screen printing/callico charges and clean the file name
  const parseCustomerNameDetails = (customerName) => {
    if (!customerName) {
      return {
        isDuplex: false, duplexPrice: null,
        isLaminated: false, laminationPrice: null,
        isPrintingCharge: false, printingPrice: null,
        isInkCost: false, inkPrice: null,
        isScreenPrinting: false, screenPrintingPrice: null,
        isCallicoCost: false, callicoPrice: null,
        pairMeta: null,
        cleanName: ''
      };
    }

    let clean = customerName;
    let isDuplex = false;
    let duplexPrice = null;
    let isLaminated = false;
    let laminationPrice = null;
    let isPrintingCharge = false;
    let printingPrice = null;
    let isInkCost = false;
    let inkPrice = null;
    let isScreenPrinting = false;
    let screenPrintingPrice = null;
    let isCallicoCost = false;
    let callicoPrice = null;
    let pairMeta = null;

    const pairMatch = clean.match(/\[PairMeta:\s*(\{.*?\})\]/i);
    if (pairMatch) {
      try { pairMeta = JSON.parse(pairMatch[1]); } catch (e) { }
    }
    clean = clean.replace(/\[PairMeta:\s*\{.*?\}\]\s*/gi, '')
      .replace(/\[ExtraChargesMeta:\s*\{.*?\}\]\s*/gi, '')
      .replace(/\[FlabMeta:\s*\{.*?\}\]\s*/gi, '');

    const duplexMatch = clean.match(/\[Duplex:\s*₹?([\d.]+)\]/i);
    if (duplexMatch) {
      isDuplex = true;
      duplexPrice = parseFloat(duplexMatch[1]);
      clean = clean.replace(/\[Duplex:\s*₹?[\d.]+\]\s*/gi, '');
    }

    const lamMatch = clean.match(/\[Laminated?:\s*₹?([\d.]+)\]/i);
    if (lamMatch) {
      isLaminated = true;
      laminationPrice = parseFloat(lamMatch[1]);
      clean = clean.replace(/\[Laminated?:\s*₹?[\d.]+\]\s*/gi, '');
    }

    const printingMatch = clean.match(/\[Printing:\s*₹?([\d.]+)\]/i);
    if (printingMatch) {
      isPrintingCharge = true;
      printingPrice = parseFloat(printingMatch[1]);
      clean = clean.replace(/\[Printing:\s*₹?[\d.]+\]\s*/gi, '');
    }

    const inkMatch = clean.match(/\[Ink:\s*₹?([\d.]+)\]/i);
    if (inkMatch) {
      isInkCost = true;
      inkPrice = parseFloat(inkMatch[1]);
      clean = clean.replace(/\[Ink:\s*₹?[\d.]+\]\s*/gi, '');
    }

    const screenMatch = clean.match(/\[ScreenPrinting:\s*₹?([\d.]+)\]/i);
    if (screenMatch) {
      isScreenPrinting = true;
      screenPrintingPrice = parseFloat(screenMatch[1]);
      clean = clean.replace(/\[ScreenPrinting:\s*₹?[\d.]+\]\s*/gi, '');
    }

    const callicoMatch = clean.match(/\[Callico:\s*₹?([\d.]+)\]/i);
    if (callicoMatch) {
      isCallicoCost = true;
      callicoPrice = parseFloat(callicoMatch[1]);
      clean = clean.replace(/\[Callico:\s*₹?[\d.]+\]\s*/gi, '');
    }

    // Strip type prefixes
    clean = clean.replace(/^\[Pad\]\s*/gi, '');
    clean = clean.replace(/^\[Partition\]\s*/gi, '');
    clean = clean.replace(/^\[Tray\]\s*/gi, '');
    clean = clean.replace(/^\[Sleave\]\s*/gi, '');
    clean = clean.replace(/^\[CollerBox\]\s*/gi, '');
    clean = clean.replace(/^\[TopSideTrayBox\]\s*/gi, '');
    clean = clean.replace(/^\[UniversalType\]\s*/gi, '');
    clean = clean.replace(/^\[FullClosingBox\]\s*/gi, '');

    let flabMeta = null;
    const flabMatch = customerName.match(/\[FlabMeta:\s*(\{.*?\})\]/i);
    if (flabMatch) {
      try { flabMeta = JSON.parse(flabMatch[1]); } catch (e) { }
    }

    return {
      isDuplex, duplexPrice,
      isLaminated, laminationPrice,
      isPrintingCharge, printingPrice,
      isInkCost, inkPrice,
      isScreenPrinting, screenPrintingPrice,
      isCallicoCost, callicoPrice,
      pairMeta,
      flabMeta,
      cleanName: clean.trim()
    };
  };

  const getCalculationTypeLabel = (calc) => {
    if (!calc) return 'Standard Box';
    const customerName = typeof calc === 'string' ? calc : (calc.customer_name || '');
    const calcType = (calc.company_sizes && calc.company_sizes.calc_type) || calc.calc_type || '';

    if (calcType === 'pad' || /\[Pad\]/i.test(customerName)) return 'Pad';
    if (calcType === 'partition' || /\[Partition\]/i.test(customerName)) return 'Partition';
    if (calcType === 'tray' || /\[Tray\]/i.test(customerName)) return 'Tray';
    if (calcType === 'sleave' || /\[Sleave\]/i.test(customerName)) return 'Sleave';
    if (calcType === 'coller_box' || calcType === 'coller' || calcType === 'collerbox' || /\[CollerBox\]/i.test(customerName)) return 'Coller Box';
    if (calcType === 'top_side_tray_box' || calcType === 'top_side_tray' || calcType === 'top_side_tray_type' || calcType === 'top-side-tray' || calcType === 'u_box' || calcType === 'ubox' || /\[TopSideTrayBox\]/i.test(customerName) || /\[TopSideTray\]/i.test(customerName)) return 'Top Side Tray Box';
    if (calcType === 'universal' || calcType === 'universal_type' || /\[UniversalType\]/i.test(customerName)) return 'Universal Type';
    if (calcType === 'full_closing' || calcType === 'full_closing_box' || /\[FullClosingBox\]/i.test(customerName)) return 'Full Closing Box';
    return 'Standard Box';
  };

  const getCalcPricingDetails = (calc) => {
    const details = parseCustomerNameDetails(calc.customer_name);
    const isDuplex = !!(calc.is_duplex || details.isDuplex);

    let perPiece = (calc.per_piece_price !== undefined && calc.per_piece_price !== null && calc.per_piece_price !== 0 && calc.per_piece_price !== '0')
      ? Number(calc.per_piece_price)
      : null;
    let kraftSingle = (calc.kraft_box_cost !== undefined && calc.kraft_box_cost !== null && calc.kraft_box_cost !== 0 && calc.kraft_box_cost !== '0')
      ? Number(calc.kraft_box_cost)
      : null;
    let kraftSub = (calc.kraft_subtotal !== undefined && calc.kraft_subtotal !== null && calc.kraft_subtotal !== 0 && calc.kraft_subtotal !== '0')
      ? Number(calc.kraft_subtotal)
      : null;
    let duplexSingle = (calc.duplex_box_cost !== undefined && calc.duplex_box_cost !== null && calc.duplex_box_cost !== 0 && calc.duplex_box_cost !== '0')
      ? Number(calc.duplex_box_cost)
      : null;
    let duplexSub = (calc.duplex_subtotal !== undefined && calc.duplex_subtotal !== null && calc.duplex_subtotal !== 0 && calc.duplex_subtotal !== '0')
      ? Number(calc.duplex_subtotal)
      : null;

    if (isDuplex && (kraftSingle === null || duplexSingle === null)) {
      try {
        const plyType = Number(calc.ply_type || 5);
        const plies = PLY_CONFIG[plyType] || { paper: 3, flute: 2 };
        const paperPlies = plies.paper;
        const flutePlies = plies.flute;
        const gsmFlute = calc.gsm_flute === 0 ? 0 : Number(calc.gsm_flute || 150);
        const fluteExtraPercent = Number(calc.flute_extra_percent || 45);
        const flute = ((gsmFlute * (fluteExtraPercent / 100)) + gsmFlute) * flutePlies;

        const reelSize = Number(calc.reel_size || 0);
        const cutSize = Number(calc.cut_size || 0);
        const qtyData = Number(calc.quantity_of_data || 1);
        const pricePerKg = Number(calc.price_per_kg || 0);
        const qtyBoxes = Number(calc.quantity_of_boxes || 1);
        const gsmPaper = Number(calc.gsm_paper || calc.gsm || 150);
        const dupRate = Number(calc.duplex_price || details.duplexPrice || 60);

        // Part 1: Kraft
        const kraftPaperGSM = (paperPlies - 1) * gsmPaper;
        const kraftTotalGSM = kraftPaperGSM + flute;
        const kraftWeightPerUnit = (reelSize * cutSize * kraftTotalGSM) / 1550000;
        const kraftBoxWeight = kraftWeightPerUnit * qtyData;
        kraftSingle = kraftBoxWeight * pricePerKg;
        kraftSub = kraftSingle * qtyBoxes;

        // Part 2: Duplex
        const duplexPaperGSM = 230;
        const duplexTotalGSM = duplexPaperGSM;
        const duplexWeightPerUnit = (reelSize * cutSize * duplexTotalGSM) / 1550000;
        const duplexBoxWeight = duplexWeightPerUnit * qtyData;
        duplexSingle = duplexBoxWeight * dupRate;
        duplexSub = duplexSingle * qtyBoxes;

        perPiece = null;
      } catch (e) {
        console.error('Error calculating duplex details:', e);
      }
    } else if (!isDuplex && perPiece === null) {
      perPiece = Number(calc.single_box_price || 0);
    }

    return {
      isDuplex,
      perPiecePrice: perPiece,
      kraftSingleBoxPrice: kraftSingle,
      kraftBoxCost: kraftSub,
      duplexSingleBoxPrice: duplexSingle,
      duplexBoxCost: duplexSub
    };
  };

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCalculations(data);
      } else {
        setError('Failed to fetch calculation history.');
        showToast('Failed to fetch calculation records.', 'error');
      }
    } catch (err) {
      setError('Failed to reach backend server.');
      showToast('Network error loading calculations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [registeredFiles, setRegisteredFiles] = useState([]);

  const fetchRegisteredFiles = async () => {
    try {
      const res = await authenticatedFetch('/api/customers/files?type=customer_copy');
      if (res.ok) {
        const data = await res.json();
        setRegisteredFiles(data);
      }
    } catch (e) { }
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

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleEdit = (calc, e) => {
    e.stopPropagation();
    navigate(`/add-customer?editId=${calc.id}`);
  };

  const handleRenameFile = (oldName) => {
    promptModal({
      title: 'Rename File Folder',
      message: `Enter a new folder name for "${oldName}":`,
      defaultValue: oldName,
      confirmText: 'Rename File',
      onConfirm: async (newName) => {
        if (!newName || !newName.trim() || newName.trim() === oldName) return;

        try {
          const res = await authenticatedFetch('/api/customers/files/rename', {
            method: 'PUT',
            body: JSON.stringify({ oldName, newName: newName.trim(), type: 'customer_copy' })
          });
          if (res.ok) {
            await fetchCalculations();
            await fetchRegisteredFiles();
            showToast(`File renamed to "${newName.trim()}" successfully!`, 'success');
          } else {
            showToast('Could not rename file.', 'error');
          }
        } catch (err) {
          showToast('Network error renaming file.', 'error');
        }
      }
    });
  };

  const handleDeleteFile = (fileName) => {
    confirmModal({
      title: 'Delete File Folder',
      message: `Are you sure you want to delete file folder "${fileName}"? This action cannot be undone.`,
      confirmText: 'Delete File',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch('/api/customers/files/delete', {
            method: 'DELETE',
            body: JSON.stringify({ name: fileName, type: 'customer_copy' })
          });
          if (res.ok) {
            await fetchCalculations();
            await fetchRegisteredFiles();
            showToast(`Folder "${fileName}" deleted successfully!`, 'success');
          } else {
            showToast('Could not delete file folder.', 'error');
          }
        } catch (err) {
          showToast('Network error deleting file folder.', 'error');
        }
      }
    });
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    confirmModal({
      title: 'Delete Calculation Record',
      message: 'Are you sure you want to delete this calculation record? This action cannot be undone.',
      confirmText: 'Delete Record',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/customers/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            await fetchCalculations();
            await fetchRegisteredFiles();
            showToast('Calculation record deleted successfully!', 'success');
          } else {
            showToast('Could not delete record.', 'error');
          }
        } catch (err) {
          showToast('Network error deleting record.', 'error');
        }
      }
    });
  };

  const toggleRow = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Only keep priced calculations (grand_total > 0)
  const pricedCalcs = calculations.filter(calc => Number(calc.grand_total) > 0);

  // Extract unique file folder names based on the active tab
  const fileNames = [...new Set(pricedCalcs.map(calc => {
    if (activeTab === 'customer') {
      return parseCustomerNameDetails(calc.customer_name).cleanName || 'Ungrouped';
    } else {
      return calc.company_reference || 'Ungrouped';
    }
  }))].filter(Boolean).sort();

  // Filter based on search query (Company Name or File Name)
  const filteredCalculations = pricedCalcs.filter(calc => {
    const compName = (calc.company_name || '').toLowerCase();
    const query = search.toLowerCase();

    const details = parseCustomerNameDetails(calc.customer_name);
    const fileName = (activeTab === 'customer' ? details.cleanName : calc.company_reference) || '';

    return compName.includes(query) || fileName.toLowerCase().includes(query);
  });

  // Group calculations by their folder name (including registered empty files)
  const groupedByFile = {};
  registeredFiles.forEach(fName => {
    if (!search || fName.toLowerCase().includes(search.toLowerCase())) {
      groupedByFile[fName] = [];
    }
  });

  filteredCalculations.forEach(calc => {
    const details = parseCustomerNameDetails(calc.customer_name);
    const calcFile = activeTab === 'customer' ? (details.cleanName || 'Ungrouped') : (calc.company_reference || 'Ungrouped');
    if (!groupedByFile[calcFile]) {
      groupedByFile[calcFile] = [];
    }
    groupedByFile[calcFile].push(calc);
  });



  const handleSaveFilePDF = (fileName) => {
    const calcsForFile = groupedByFile[fileName] || [];
    if (calcsForFile.length === 0) return;

    const doc = new jsPDF();

    // Header styling
    doc.setFillColor(31, 41, 55); // Dark grey theme color
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(fileName, 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("CUSTOMER CALCULATION REPORT", 15, 28);

    // Date & File details on the right side of header
    const rightAlignX = 140;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", rightAlignX, 18);
    doc.text("Total Records:", rightAlignX, 28);

    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('en-IN'), rightAlignX + 30, 18);
    doc.text(String(calcsForFile.length), rightAlignX + 30, 28);

    // Reset text color to dark
    doc.setTextColor(31, 41, 55);

    // Table headers
    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Company", 15, y);
    doc.text("Size", 60, y);
    doc.text("Qty", 90, y);
    doc.text("Box Wt", 110, y);
    doc.text("Price/Box", 135, y);
    doc.text("Grand Total", 165, y);

    // Header divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, y + 3, 195, y + 3);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    calcsForFile.forEach((calc) => {
      if (y > 270) {
        doc.addPage();
        y = 20;

        // Headers on new page
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Company", 15, y);
        doc.text("Size", 60, y);
        doc.text("Qty", 90, y);
        doc.text("Box Wt", 110, y);
        doc.text("Price/Box", 135, y);
        doc.text("Grand Total", 165, y);
        doc.line(15, y + 3, 195, y + 3);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }

      doc.text(calc.company_name || 'N/A', 15, y);
      doc.text(calc.size_label || 'N/A', 60, y);
      doc.text(String(calc.quantity_of_boxes), 90, y);
      doc.text(`${Number(calc.box_weight).toFixed(3)} kg`, 110, y);
      doc.text(`Rs. ${Number(calc.single_box_price).toFixed(2)}`, 135, y);
      doc.text(`Rs. ${Number(calc.grand_total).toFixed(2)}`, 165, y);

      y += 8;
    });

    // Draw outer boundary border
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("System generated document. No signature required.", 15, 280);
    doc.text("Thank you for choosing SRI VARI PACKS", 195, 280, { align: 'right' });

    doc.save(`${fileName}_Calculation_Report.pdf`);
  };

  const handleOpenPDFSelectionModal = (fileName) => {
    const calcs = groupedByFile[fileName] || [];
    const items = calcs.map(calc => ({
      id: calc.id,
      selected: true,
      company_name: calc.company_name,
      size_label: calc.size_label,
      quantity_of_boxes: calc.quantity_of_boxes,
      box_weight: calc.box_weight,
      single_box_price: calc.single_box_price,
      grand_total: calc.grand_total,
      originalCalc: calc
    }));
    setPdfSelectionItems(items);
    setPdfSelectionFolder(fileName);
    setIsPDFSelectionModalOpen(true);
  };

  const handleSaveFilePDFSelected = () => {
    const selectedCalcs = pdfSelectionItems.filter(item => item.selected).map(item => item.originalCalc);
    if (selectedCalcs.length === 0) {
      showToast('Please select at least one calculation to generate PDF.', 'error');
      return;
    }

    const doc = new jsPDF();
    const fileName = pdfSelectionFolder;

    // Header styling
    doc.setFillColor(31, 41, 55); // Dark grey theme color
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(fileName, 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("CUSTOMER CALCULATION REPORT", 15, 28);

    // Date & File details on the right side of header
    const rightAlignX = 140;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", rightAlignX, 18);
    doc.text("Total Records:", rightAlignX, 28);

    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('en-IN'), rightAlignX + 30, 18);
    doc.text(String(selectedCalcs.length), rightAlignX + 30, 28);

    // Reset text color to dark
    doc.setTextColor(31, 41, 55);

    // Table headers
    let y = 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Company", 15, y);
    doc.text("Size", 60, y);
    doc.text("Qty", 90, y);
    doc.text("Box Wt", 110, y);
    doc.text("Price/Box", 135, y);
    doc.text("Grand Total", 165, y);

    // Header divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, y + 3, 195, y + 3);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    selectedCalcs.forEach((calc) => {
      if (y > 270) {
        doc.addPage();
        y = 20;

        // Headers on new page
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Company", 15, y);
        doc.text("Size", 60, y);
        doc.text("Qty", 90, y);
        doc.text("Box Wt", 110, y);
        doc.text("Price/Box", 135, y);
        doc.text("Grand Total", 165, y);
        doc.line(15, y + 3, 195, y + 3);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
      }

      doc.text(calc.company_name || 'N/A', 15, y);
      doc.text(calc.size_label || 'N/A', 60, y);
      doc.text(String(calc.quantity_of_boxes), 90, y);
      doc.text(`${Number(calc.box_weight).toFixed(3)} kg`, 110, y);
      doc.text(`Rs. ${Number(calc.single_box_price).toFixed(2)}`, 135, y);
      doc.text(`Rs. ${Number(calc.grand_total).toFixed(2)}`, 165, y);

      y += 8;
    });

    // Draw outer boundary border
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("System generated document. No signature required.", 15, 280);
    doc.text("Thank you for choosing SRI VARI PACKS", 195, 280, { align: 'right' });

    doc.save(`${fileName}_Calculation_Report.pdf`);
    setIsPDFSelectionModalOpen(false);
  };

  const fetchToAddressProfiles = async () => {
    try {
      const res = await authenticatedFetch('/api/to-address-profiles');
      if (res.ok) {
        const data = await res.json();
        setToAddressProfiles(data || []);
      }
    } catch (err) {
      console.warn('Could not load to-address profiles:', err);
    }
  };

  useEffect(() => {
    fetchToAddressProfiles();
  }, []);

  const handleProfileKeywordSelect = (e) => {
    const selKw = e.target.value;
    if (!selKw) {
      selectProfile(null);
      return;
    }
    const prof = toAddressProfiles.find(p => p.keyword === selKw);
    if (prof) {
      selectProfile(prof);
    }
  };

  const selectProfile = (prof) => {
    if (!prof) {
      setQuotationHeader(prev => ({ ...prev, selectedKeyword: '' }));
      setProfileSearchTerm('');
      setIsProfileDropdownOpen(false);
      return;
    }

    let companyStr = '';
    let addressStr = prof.to_address || '';

    const lines = addressStr.split('\n');
    if (lines.length > 1 && (lines[0].startsWith('M/s.') || lines[0].startsWith('M/S.') || lines[0].endsWith(','))) {
      companyStr = lines[0].trim();
      addressStr = lines.slice(1).join('\n').trim();
    } else if (lines.length > 1) {
      companyStr = lines[0].trim();
      addressStr = lines.slice(1).join('\n').trim();
    } else {
      companyStr = prof.keyword;
    }

    setQuotationHeader(prev => ({
      ...prev,
      selectedKeyword: prof.keyword,
      toCompany: companyStr,
      toAddress: addressStr,
      dearSir: prof.dear_sir || 'Dear Sir,',
      kindAttn: prof.kind_attn || '',
      subject: prof.subject || 'Quotation for Corrugated boxes – Reg.'
    }));

    setProfileSearchTerm(prof.keyword);
    setIsProfileDropdownOpen(false);
  };

  const ALL_QUOTATION_COLUMNS = [
    { id: 'sNo', name: 'S.No', baseWidth: 10, headerAlign: 'center', cellAlign: 'center' },
    { id: 'description', name: 'Description', baseWidth: 32, headerAlign: 'left', cellAlign: 'left' },
    { id: 'size', name: 'Size', baseWidth: 50, headerAlign: 'left', cellAlign: 'left' },
    { id: 'ply', name: 'Ply', baseWidth: 14, headerAlign: 'center', cellAlign: 'center' },
    { id: 'qty', name: 'Qty', baseWidth: 18, headerAlign: 'center', cellAlign: 'center' },
    { id: 'gsmBf', name: 'GSM/BF', baseWidth: 22, headerAlign: 'center', cellAlign: 'center' },
    { id: 'rate', name: 'Rate', baseWidth: 20, headerAlign: 'center', cellAlign: 'center' },
    { id: 'dieCost', name: 'Die Cost', baseWidth: 20, headerAlign: 'center', cellAlign: 'center' },
  ];

  const handleOpenQuotationModal = (fileName) => {
    const calcs = groupedByFile[fileName] || [];
    if (calcs.length === 0) return;

    const items = calcs.map(calc => {
      const details = parseCustomerNameDetails(calc.customer_name);
      const pricing = getCalcPricingDetails(calc);

      let refLabel = getCalculationTypeLabel(calc);
      if (calc.company_reference && calc.company_reference.trim() && calc.company_reference.trim() !== 'Ungrouped') {
        refLabel = calc.company_reference.trim();
      }

      const formattedSize = details.pairMeta
        ? `P1: ${details.pairMeta.p1Label} | P2: ${details.pairMeta.p2Label}`
        : (calc.size_label || 'Custom');

      const plyStr = `${calc.ply_type} Ply`;
      const qtyStr = `${calc.quantity_of_boxes} Nos`;

      // Requirement 3: Display ONLY P GSM and BF (e.g. 150 / 16 or 230 / 18)
      const pGsmVal = calc.gsm_paper || calc.gsm || 150;
      const bfVal = calc.bf || 16;
      const gsmBfStr = `${pGsmVal} / ${bfVal}`;

      let rateNum = 0;
      if (pricing.isDuplex) {
        const kraftP = Number(pricing.kraftSingleBoxPrice || 0);
        const dupP = Number(pricing.duplexSingleBoxPrice || 0);
        const lamP = details.isLaminated ? details.laminationPrice : 0;
        const printP = details.isPrintingCharge ? details.printingPrice : 0;
        const inkP = details.isInkCost ? details.inkPrice : 0;
        const screenP = details.isScreenPrinting ? details.screenPrintingPrice : 0;
        const callicoP = details.isCallicoCost ? details.callicoPrice : 0;
        rateNum = kraftP + dupP + lamP + printP + inkP + screenP + callicoP;
      } else {
        const baseP = pricing.perPiecePrice !== null ? pricing.perPiecePrice : Number(calc.single_box_price || 0);
        const lamP = details.isLaminated ? details.laminationPrice : 0;
        const printP = details.isPrintingCharge ? details.printingPrice : 0;
        const inkP = details.isInkCost ? details.inkPrice : 0;
        const screenP = details.isScreenPrinting ? details.screenPrintingPrice : 0;
        const callicoP = details.isCallicoCost ? details.callicoPrice : 0;
        rateNum = baseP + lamP + printP + inkP + screenP + callicoP;
      }

      return {
        id: calc.id,
        selected: true,
        description: refLabel,
        size: formattedSize,
        ply: plyStr,
        qty: qtyStr,
        gsmBf: gsmBfStr,
        rateNum: Number(rateNum.toFixed(2)),
        dieCost: '',
        originalCalc: calc
      };
    });

    setQuotationItems(items);
    setCalculationGroups([]);
    setGroupModalOpen(false);
    setEditingGroupId(null);

    const firstCalc = calcs[0] || {};
    const companyName = firstCalc.company_name || 'Valued Customer';
    const companyRef = firstCalc.company_reference || '';

    const defaultNo = `SVP/Q-${new Date().getFullYear()}/${String(Date.now()).slice(-5)}`;

    setQuotationHeader({
      quotationNo: defaultNo,
      date: new Date().toLocaleDateString('en-GB'),
      selectedKeyword: '',
      toCompany: `M/s.${companyName}`,
      toAddress: companyRef && companyRef !== 'Ungrouped' ? companyRef : '',
      dearSir: 'Dear Sir,',
      kindAttn: 'Mr. Karuppiah Subramanian',
      subject: 'Quotation for Corrugated boxes \u2013 Reg.',
      introText: 'With References to the subject, as per sample we mentioned below the best quote for our carton box as per your requirement.',
      techSpec1: 'The above box is using top 230 GSM white board and packing & flute using 180/18 BF.',
      techSpec2: 'The rate is including Rapper sheets, printing and Glass lamination charges.',
      term1: 'Delivery : 7 Days from the date of your confirmed Purchase Order',
      term2: 'Transport : Additional cost',
      term3: 'Payment : 15 days',
      term4: 'Tax : GST 18% Extra',
      signatory: 'M.MUTHUKUMAR',
    });

    setProfileSearchTerm('');
    setIsProfileDropdownOpen(false);
    fetchToAddressProfiles();

    setVisibleColumns({
      sNo: true,
      description: true,
      size: true,
      ply: true,
      qty: true,
      gsmBf: true,
      rate: true,
      dieCost: false,
    });
    setShowTechSpecs(true);
    setShowTerms(true);

    setQuotationFolder(fileName);
    setIsQuotationModalOpen(true);
  };

  const getEffectiveQuotationItems = (items = quotationItems, groups = calculationGroups) => {
    if (!groups || groups.length === 0) {
      return items;
    }

    const itemToGroupMap = {};
    groups.forEach(g => {
      if (g.calcIds && Array.isArray(g.calcIds)) {
        g.calcIds.forEach(id => {
          itemToGroupMap[id] = g;
        });
      }
    });

    const result = [];
    const processedGroupIds = new Set();

    items.forEach((item) => {
      const group = itemToGroupMap[item.id];
      if (!group) {
        result.push(item);
      } else {
        const isRepresentative = item.id === group.representativeId ||
          (!group.calcIds.includes(group.representativeId) && group.calcIds[0] === item.id);

        if (isRepresentative && !processedGroupIds.has(group.id)) {
          processedGroupIds.add(group.id);

          const groupItems = items.filter(i => group.calcIds.includes(i.id));
          const repItem = groupItems.find(i => i.id === group.representativeId) || item;
          const calculatedRate = groupItems.reduce((sum, i) => sum + (Number(i.rateNum) || 0), 0);
          const finalRate = (group.customRate !== undefined && group.customRate !== null && group.customRate !== '')
            ? Number(group.customRate)
            : calculatedRate;

          const groupedRow = {
            ...repItem,
            id: `group-row-${group.id}`,
            groupId: group.id,
            groupName: group.name,
            selected: true,
            rateNum: Number(finalRate.toFixed(2)),
            isGroupRow: true,
            groupedCount: groupItems.length,
          };

          result.push(groupedRow);
        }
      }
    });

    return result;
  };

  const handleOpenCreateGroup = () => {
    const existingGroupCount = calculationGroups.length;
    setGroupFormName(`Group ${existingGroupCount + 1}`);
    setGroupFormCalcIds([]);
    setGroupFormRepId(null);
    setEditingGroupId(null);
    setGroupModalOpen(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroupId(group.id);
    setGroupFormName(group.name);
    setGroupFormCalcIds([...group.calcIds]);
    setGroupFormRepId(group.representativeId);
    setGroupModalOpen(true);
  };

  const handleDeleteGroup = (groupId) => {
    setCalculationGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleSaveGroup = () => {
    if (!groupFormName || !groupFormName.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }
    if (groupFormCalcIds.length === 0) {
      showToast('Please select at least one calculation for the group.', 'error');
      return;
    }
    if (!groupFormRepId || !groupFormCalcIds.includes(groupFormRepId)) {
      showToast('Please choose a representative calculation for the group.', 'error');
      return;
    }

    if (editingGroupId) {
      setCalculationGroups(prev => prev.map(g => {
        if (g.id === editingGroupId) {
          return {
            ...g,
            name: groupFormName.trim(),
            calcIds: groupFormCalcIds,
            representativeId: groupFormRepId
          };
        }
        return g;
      }));
    } else {
      const newGroup = {
        id: `group-${Date.now()}`,
        name: groupFormName.trim(),
        calcIds: groupFormCalcIds,
        representativeId: groupFormRepId
      };
      setCalculationGroups(prev => [...prev, newGroup]);
    }

    setGroupModalOpen(false);
    setEditingGroupId(null);
  };

  const handleGenerateQuotationPDF = () => {
    const effectiveItems = getEffectiveQuotationItems(quotationItems, calculationGroups);
    const selectedItems = effectiveItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showToast('Please select at least one calculation to include in the quotation.', 'error');
      return;
    }

    const activeCols = ALL_QUOTATION_COLUMNS.filter(c => visibleColumns[c.id]);
    if (activeCols.length === 0) {
      showToast('Please select at least one column to display in the quotation.', 'error');
      return;
    }

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const margin = 15;
    let y = 15;

    const img = new Image();
    img.src = '/Logos.png';

    const drawPDF = () => {
      // 1. Logo Top Left
      try {
        doc.addImage(img, 'PNG', margin, 10, 34, 19);
      } catch (e) {
        console.warn('Logo load fallback:', e);
      }

      // 2. Header Centered
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.setTextColor(15, 23, 42);
      doc.text("SRI VARI PACKS", pageWidth / 2, 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text("SF.No.49/2C, Megarali Street, Eduyarpalayam,", pageWidth / 2, 21.5, { align: "center" });
      doc.text("Vellalore, Coimbatore \u2013 641 111", pageWidth / 2, 26, { align: "center" });
      doc.text("GST No. 33ACIFS8236M1ZN", pageWidth / 2, 30.5, { align: "center" });

      // 3. Date Top Right (positioned at y=30.5 above the separator line at y=34)
      const displayDate = quotationHeader.date || new Date().toLocaleDateString('en-GB');
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(displayDate, pageWidth - margin, 30.5, { align: "right" });

      // 4. Separator Line (drawn cleanly below Date & GST No)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.line(margin, 34, pageWidth - margin, 34);

      y = 41;

      // 5. To Section
      const indentX = margin + 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("To,", margin, y);
      y += 4.5;

      if (quotationHeader.toCompany) {
        doc.setFont("helvetica", "bold");
        doc.text(quotationHeader.toCompany, indentX, y);
        y += 4.8;
      }

      doc.setFont("helvetica", "normal");
      if (quotationHeader.toAddress) {
        const addrLines = doc.splitTextToSize(quotationHeader.toAddress, 110);
        doc.text(addrLines, indentX, y);
        y += (addrLines.length * 4.2) + 2.5;
      } else {
        y += 2;
      }

      // 6. Dear Sir & Kind Attn
      y += 1.5;
      doc.setFont("helvetica", "normal");
      doc.text(quotationHeader.dearSir || "Dear Sir,", indentX, y);
      y += 4.8;

      if (quotationHeader.kindAttn) {
        doc.setFont("helvetica", "bold");
        const kindAttnText = quotationHeader.kindAttn.startsWith('Kind Attn')
          ? quotationHeader.kindAttn
          : `Kind Attn \u2013 ${quotationHeader.kindAttn}`;
        doc.text(kindAttnText, indentX + 16, y);
        y += 5.2;
      } else {
        y += 2;
      }

      // 7. Subject
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Sub:", margin, y);
      const subStr = quotationHeader.subject || 'Quotation for Corrugated boxes \u2013 Reg.';
      doc.text(subStr, margin + 10, y);
      const subWidth = doc.getTextWidth(subStr);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y + 0.8, margin + 10 + subWidth, y + 0.8);
      y += 6.8;

      // 8. Introductory Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const introText = quotationHeader.introText || 'With References to the subject, as per sample we mentioned below the best quote for our carton box as per your requirement.';
      const introLines = doc.splitTextToSize(introText, pageWidth - (margin * 2));
      doc.text(introLines, margin, y);
      y += (introLines.length * 4.2) + 4.5;

      // 9. Dynamic Quotation Table
      const totalBaseWidth = activeCols.reduce((sum, c) => sum + c.baseWidth, 0);
      const tableWidth = pageWidth - (margin * 2); // 180mm
      let currentX = margin;
      const colDefs = activeCols.map(c => {
        const colW = (c.baseWidth / totalBaseWidth) * tableWidth;
        const startX = currentX;
        const centerX = startX + (colW / 2);
        currentX += colW;
        return { ...c, colW, startX, centerX };
      });

      const headerH = 8;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, tableWidth, headerH, 'F');
      doc.rect(margin, y, tableWidth, headerH, 'S');

      for (let i = 1; i < colDefs.length; i++) {
        doc.line(colDefs[i].startX, y, colDefs[i].startX, y + headerH);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      colDefs.forEach(c => {
        if (c.headerAlign === 'center') {
          doc.text(c.name, c.centerX, y + 5.2, { align: 'center' });
        } else if (c.headerAlign === 'right') {
          doc.text(c.name, c.startX + c.colW - 2, y + 5.2, { align: 'right' });
        } else {
          doc.text(c.name, c.startX + 2, y + 5.2);
        }
      });

      y += headerH;

      selectedItems.forEach((item, index) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);

        const cellData = colDefs.map(c => {
          let val = '';
          if (c.id === 'sNo') val = String(index + 1);
          else if (c.id === 'description') val = item.description || '';
          else if (c.id === 'size') val = item.size || '';
          else if (c.id === 'ply') val = item.ply || '';
          else if (c.id === 'qty') val = item.qty || '';
          else if (c.id === 'gsmBf') val = item.gsmBf || '';
          else if (c.id === 'rate') val = Number(item.rateNum || 0).toFixed(2);
          else if (c.id === 'dieCost') val = item.dieCost || '';

          const printableWidth = c.colW - 2.5;
          const lines = doc.splitTextToSize(String(val), printableWidth);
          return { col: c, lines };
        });

        const maxLines = Math.max(1, ...cellData.map(cd => cd.lines.length));
        const lineHeight = 3.6;
        const rowH = Math.max(8, (maxLines * lineHeight) + 3);

        if (y + rowH > 278) {
          doc.addPage();
          y = 18;

          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, tableWidth, headerH, 'F');
          doc.rect(margin, y, tableWidth, headerH, 'S');

          for (let i = 1; i < colDefs.length; i++) {
            doc.line(colDefs[i].startX, y, colDefs[i].startX, y + headerH);
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          colDefs.forEach(c => {
            if (c.headerAlign === 'center') {
              doc.text(c.name, c.centerX, y + 5.2, { align: 'center' });
            } else if (c.headerAlign === 'right') {
              doc.text(c.name, c.startX + c.colW - 2, y + 5.2, { align: 'right' });
            } else {
              doc.text(c.name, c.startX + 2, y + 5.2);
            }
          });
          y += headerH;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
        }

        doc.rect(margin, y, tableWidth, rowH, 'S');

        for (let i = 1; i < colDefs.length; i++) {
          doc.line(colDefs[i].startX, y, colDefs[i].startX, y + rowH);
        }

        cellData.forEach(({ col: c, lines }) => {
          const totalTextH = lines.length * lineHeight;
          const startTextY = y + ((rowH - totalTextH) / 2) + (lineHeight * 0.72);

          lines.forEach((lineStr, lineIdx) => {
            const lineY = startTextY + (lineIdx * lineHeight);
            if (c.cellAlign === 'center') {
              doc.text(lineStr, c.centerX, lineY, { align: 'center' });
            } else if (c.cellAlign === 'right') {
              doc.text(lineStr, c.startX + c.colW - 2, lineY, { align: 'right' });
            } else {
              doc.text(lineStr, c.startX + 2, lineY);
            }
          });
        });

        y += rowH;
      });

      y += 5.5;

      // 10. Technical Specifications (Conditional)
      if (showTechSpecs) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text("Technical Specifications:", margin, y);
        const tsWidth = doc.getTextWidth("Technical Specifications:");
        doc.setLineWidth(0.3);
        doc.line(margin, y + 0.8, margin + tsWidth, y + 0.8);
        y += 4.8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        if (quotationHeader.techSpec1) {
          doc.text(`1.) ${quotationHeader.techSpec1}`, margin, y);
          y += 4.5;
        }
        if (quotationHeader.techSpec2) {
          doc.text(`2.) ${quotationHeader.techSpec2}`, margin, y);
          y += 4.5;
        }
        y += 2.5;
      }

      // 11. Terms & Conditions (Conditional)
      if (showTerms) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text("Terms & Conditions:", margin, y);
        const tcWidth = doc.getTextWidth("Terms & Conditions:");
        doc.line(margin, y + 0.8, margin + tcWidth, y + 0.8);
        y += 4.8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        if (quotationHeader.term1) { doc.text(`1.) ${quotationHeader.term1}`, margin, y); y += 4.5; }
        if (quotationHeader.term2) { doc.text(`2.) ${quotationHeader.term2}`, margin, y); y += 4.5; }
        if (quotationHeader.term3) { doc.text(`3.) ${quotationHeader.term3}`, margin, y); y += 4.5; }
        if (quotationHeader.term4) { doc.text(`4.) ${quotationHeader.term4}`, margin, y); y += 4.5; }
        y += 2.5;
      }

      y += 3.5;

      // Ensure footer fits safely on printable area (A4 height = 297mm)
      if (y + 16 > 282) {
        doc.addPage();
        y = 18;
      }

      // 12. Thanking You (Centered)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("Thanking You,", pageWidth / 2, y, { align: "center" });
      y += 5;

      // 13. Signature (Bottom Right)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("For Sri Vari Packs", pageWidth - margin, y, { align: "right" });
      y += 5;
      doc.text(quotationHeader.signatory || "M.MUTHUKUMAR", pageWidth - margin, y, { align: "right" });

      const safeCompName = (quotationHeader.toCompany || 'Customer').replace(/M\/s\./gi, '').replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
      const formattedDateDash = (displayDate || '').replace(/\//g, '-');
      const pdfFileName = `${safeCompName}-${formattedDateDash}.pdf`;

      // 1. Local Download to User's Device (Instant 0s response)
      doc.save(pdfFileName);
      showToast(`Quotation downloaded as ${pdfFileName}`, 'success');

      // 2. Asynchronous Background Storage to Supabase (Non-blocking event loop execution)
      setTimeout(() => {
        (async () => {
          try {
            const dataUrl = doc.output('datauristring');
            const pdfBase64 = dataUrl.split(',')[1];
            const finalNo = quotationHeader.quotationNo || `SVP/Q-${new Date().getFullYear()}/${String(Date.now()).slice(-5)}`;

            const res = await authenticatedFetch('/api/quotations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                company_name: quotationHeader.toCompany || safeCompName,
                file_id: quotationFolder || null,
                quotation_number: finalNo,
                pdf_file_name: pdfFileName,
                pdf_base64: pdfBase64
              })
            });

            const data = await res.json();
            if (res.ok) {
              showToast(`Quotation ${finalNo} saved to Quotations module.`, 'info');
            } else {
              console.warn('Quotations storage notice:', data.message);
            }
          } catch (stgErr) {
            console.error('Quotations upload error:', stgErr);
          }
        })();
      }, 0);
    };

    if (img.complete) {
      drawPDF();
    } else {
      img.onload = drawPDF;
      img.onerror = drawPDF;
    }
  };

  const handlePrintQuotation = () => {
    const effectiveItems = getEffectiveQuotationItems(quotationItems, calculationGroups);
    const selectedCalcs = effectiveItems.filter(item => item.selected);
    if (selectedCalcs.length === 0) {
      showToast('Please select at least one calculation to generate quotation.', 'error');
      return;
    }

    const activeCols = ALL_QUOTATION_COLUMNS.filter(c => visibleColumns[c.id]);
    if (activeCols.length === 0) {
      showToast('Please select at least one column to display in the quotation.', 'error');
      return;
    }

    const tableHeadersHTML = activeCols.map(c => `<th style="padding: 6px; border: 1px solid #000; text-align: ${c.headerAlign};">${c.name}</th>`).join('');

    const rows = selectedCalcs.map((item, index) => {
      const cells = activeCols.map(c => {
        let val = '';
        if (c.id === 'sNo') val = String(index + 1);
        else if (c.id === 'description') val = item.description || '';
        else if (c.id === 'size') val = item.size || '';
        else if (c.id === 'ply') val = item.ply || '';
        else if (c.id === 'qty') val = item.qty || '';
        else if (c.id === 'gsmBf') val = item.gsmBf || '';
        else if (c.id === 'rate') val = Number(item.rateNum || 0).toFixed(2);
        else if (c.id === 'dieCost') val = item.dieCost || '';

        return `<td style="padding: 6px; border: 1px solid #000; text-align: ${c.cellAlign};">${val}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const formattedDate = quotationHeader.date || new Date().toLocaleDateString('en-GB');

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - Sri Vari Packs</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 30px 45px;
            color: #000;
            background: #fff;
            line-height: 1.35;
            font-size: 13px;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            position: relative;
          }
          .header-logo {
            position: absolute;
            left: 0;
            top: 0;
            width: 140px;
          }
          .header-center {
            width: 100%;
            text-align: center;
          }
          .header-center h1 {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .header-center p {
            font-size: 11px;
            color: #334155;
            margin-bottom: 1px;
          }
          .date-top-right {
            text-align: right;
            font-size: 13px;
            margin-bottom: 4px;
          }
          .divider {
            border-bottom: 2px solid #000;
            margin-bottom: 16px;
          }
          .to-section {
            margin-bottom: 14px;
          }
          .to-company {
            font-weight: bold;
            font-size: 14px;
          }
          .sub-line {
            font-weight: bold;
            text-decoration: underline;
            margin-top: 4px;
            margin-bottom: 12px;
          }
          .intro-text {
            margin-bottom: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 12px;
          }
          th {
            background: #f8fafc;
            padding: 6px;
            font-weight: bold;
            border: 1px solid #000;
          }
          .section-title {
            font-weight: bold;
            text-decoration: underline;
            margin-top: 10px;
            margin-bottom: 4px;
            font-size: 13px;
          }
          .spec-list, .terms-list {
            margin-bottom: 12px;
            font-size: 12px;
          }
          .thank-you {
            text-align: center;
            margin-top: 24px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .signature-box {
            text-align: right;
            font-weight: bold;
            font-size: 13px;
          }
          @media print {
            body { padding: 20px 30px; }
            @page { margin: 1cm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="/Logos.png" class="header-logo" alt="SRI VARI PACKS" />
          <div class="header-center">
            <h1>SRI VARI PACKS</h1>
            <p>SF.No.49/2C, Megarali Street, Eduyarpalayam,</p>
            <p>Vellalore, Coimbatore – 641 111</p>
            <p>GST No. 33ACIFS8236M1ZN</p>
          </div>
        </div>

        <div class="date-top-right">${formattedDate}</div>
        <div class="divider"></div>

        <div class="to-section">
          <p>To,</p>
          <p class="to-company">${quotationHeader.toCompany}</p>
          <div style="white-space: pre-line;">${quotationHeader.toAddress}</div>
        </div>

        <p style="margin-bottom: 6px;">Dear Sir,</p>
        ${quotationHeader.kindAttn ? `<p style="margin-left: 20px; font-weight: bold; margin-bottom: 6px;">Kind Attn – ${quotationHeader.kindAttn}</p>` : ''}
        <p style="margin-left: 20px;" class="sub-line">Sub: ${quotationHeader.subject}</p>

        <p class="intro-text">${quotationHeader.introText}</p>

        <table>
          <thead>
            <tr>${tableHeadersHTML}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${showTechSpecs ? `
          <div class="section-title">Technical Specifications:</div>
          <div class="spec-list">
            ${quotationHeader.techSpec1 ? `<p>1.) ${quotationHeader.techSpec1}</p>` : ''}
            ${quotationHeader.techSpec2 ? `<p>2.) ${quotationHeader.techSpec2}</p>` : ''}
          </div>
        ` : ''}

        ${showTerms ? `
          <div class="section-title">Terms & Conditions:</div>
          <div class="terms-list">
            ${quotationHeader.term1 ? `<p>1.) ${quotationHeader.term1}</p>` : ''}
            ${quotationHeader.term2 ? `<p>2.) ${quotationHeader.term2}</p>` : ''}
            ${quotationHeader.term3 ? `<p>3.) ${quotationHeader.term3}</p>` : ''}
            ${quotationHeader.term4 ? `<p>4.) ${quotationHeader.term4}</p>` : ''}
          </div>
        ` : ''}

        <div class="thank-you">Thanking You,</div>

        <div class="signature-box">
          <p>For Sri Vari Packs</p>
          <p style="margin-top: 40px;">${quotationHeader.signatory || 'M.MUTHUKUMAR'}</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
    }
  };

  const handleSavePDF = (calc) => {
    const details = parseCustomerNameDetails(calc.customer_name);
    const doc = new jsPDF();

    // Header styling
    doc.setFillColor(31, 41, 55); // Dark grey theme color
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SRI VARI PACKS", 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("ESTIMATION & SPECIFICATION SHEET", 15, 28);

    // Date & File details on the right side of header
    const rightAlignX = 140;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", rightAlignX, 15);
    doc.text("Folder File:", rightAlignX, 23);
    doc.text("Record ID:", rightAlignX, 31);

    doc.setFont("helvetica", "normal");
    doc.text(new Date(calc.created_at).toLocaleDateString('en-IN'), rightAlignX + 23, 15);
    doc.text(activeTab === 'customer' ? details.cleanName : (calc.company_reference || 'Ungrouped'), rightAlignX + 23, 23);
    doc.text(String(calc.id), rightAlignX + 23, 31);

    // reset text color to dark
    doc.setTextColor(31, 41, 55);

    // Company Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Company Details", 15, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Company Name: ${calc.company_name || 'N/A'}`, 15, 63);
    doc.text(`Reference: ${getCalculationTypeLabel(calc)}`, 15, 70);

    // Specifications Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Specifications", 15, 85);

    // Grid alignment for specifications
    const col1X = 15;
    const col2X = 110;

    let y = 93;
    const specRow = (label, val, x) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(String(val), x + 42, y);
    };

    const sizeVal = details.pairMeta ? `P1: ${details.pairMeta.p1Label} | P2: ${details.pairMeta.p2Label}` : (calc.size_label || 'N/A');
    specRow("Size Label:", sizeVal, col1X);
    specRow("Ply Type:", `${calc.ply_type} Ply`, col2X);

    y += 8;
    specRow("Quantity of Boxes:", String(calc.quantity_of_boxes), col1X);
    specRow("Single Box Weight:", `${Number(calc.box_weight).toFixed(3)} kg`, col2X);

    y += 8;
    const gsmPackingVal = details.isDuplex ? 'Duplex' : (calc.gsm_packing === 0 ? 'No Packing' : `${calc.gsm_packing || 150} GSM`);
    specRow("Paper GSM (P/F/Pk):", `P:${calc.gsm_paper || calc.gsm} / F:${calc.gsm_flute === 0 ? 0 : (calc.gsm_flute || 150)} / Pk:${gsmPackingVal}`, col1X);
    specRow("Paper BF Strength:", `${calc.bf || 0} BF`, col2X);

    y += 8;
    if (details.pairMeta) {
      specRow("Reel Size:", `P1: ${Number(details.pairMeta.p1Reel).toFixed(2)} in | P2: ${Number(details.pairMeta.p2Reel).toFixed(2)} in`, col1X);
      specRow("Cut Size:", `P1: ${Number(details.pairMeta.p1Cut).toFixed(2)} in | P2: ${Number(details.pairMeta.p2Cut).toFixed(2)} in`, col2X);
    } else {
      specRow("Reel Size:", `${Number(calc.reel_size).toFixed(2)} in${Number(calc.reel_size_adjust) > 0 ? ` (+${calc.reel_size_adjust})` : ''}`, col1X);
      specRow("Cut Size:", `${Number(calc.cut_size).toFixed(2)} in${Number(calc.cut_size_adjust) > 0 ? ` (+${calc.cut_size_adjust})` : ''}`, col2X);
    }

    y += 8;
    specRow("Paper Wt / Flute Wt:", `${Number(calc.paper).toFixed(1)} / ${Number(calc.flute).toFixed(1)} GSM`, col1X);
    specRow("Price Per KG:", `Rs. ${Number(calc.price_per_kg).toFixed(2)}`, col2X);

    // Draw a divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 132, 195, 132);

    // Additional Charges & Pricing Breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Valuation & Pricing Breakdown", 15, 142);

    y = 150;
    const priceRow = (label, val, isBold = false) => {
      if (isBold) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(label, 15, y);
      doc.text(val, 150, y, { align: 'right' });
      y += 7;
    };

    priceRow("Weight Multiplier (Qty of Data):", String(calc.quantity_of_data || 1));
    priceRow("Weight Per Unit:", `${Number(calc.weight_per_unit || 0).toFixed(4)} kg`);
    priceRow("Calculated Base Cost / Box:", `Rs. ${Number(calc.single_box_price || 0).toFixed(2)}`);

    if (details.isDuplex) {
      priceRow("Duplex Extra Cost (per box):", `Rs. ${details.duplexPrice.toFixed(2)}`);
    }
    if (details.isLaminated) {
      priceRow("Lamination Extra Cost (per box):", `Rs. ${details.laminationPrice.toFixed(2)}`);
    }
    if (details.isPrintingCharge) {
      priceRow("Printing Extra Cost (per box):", `Rs. ${details.printingPrice.toFixed(2)}`);
    }
    if (details.isInkCost) {
      priceRow("Ink Extra Cost (per box):", `Rs. ${details.inkPrice.toFixed(2)}`);
    }
    if (details.isScreenPrinting) {
      priceRow("Screen Printing Extra Cost (per box):", `Rs. ${details.screenPrintingPrice.toFixed(2)}`);
    }
    if (details.isCallicoCost) {
      priceRow("Callico Extra Cost (per box):", `Rs. ${details.callicoPrice.toFixed(2)}`);
    }

    // Border line before totals
    doc.line(15, y, 195, y);
    y += 7;

    priceRow("Total Price per Box:", `Rs. ${Number(calc.total_cost).toFixed(2)}`);
    priceRow("Grand Total (Total × Box Quantity):", `Rs. ${Number(calc.grand_total).toFixed(2)}`, true);

    // Draw outer boundary border
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("System generated document. No signature required.", 15, 280);
    doc.text("Thank you for choosing SRI VARI PACKS", 195, 280, { align: 'right' });

    doc.save(`${calc.company_name || 'Calculation'}_${calc.size_label || 'Estimate'}.pdf`);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '100%', width: '100%' }} className="animate-fade">

      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
            Customers Module
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="no-print">
            View saved calculations grouped by file folders.
          </p>
        </div>
      </div>

      {/* Single Search Bar for File & Company Selection */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }} className="no-print">
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search by Company Name or File Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            style={{ width: '100%', paddingLeft: '44px', paddingTop: '12px', paddingBottom: '12px', fontSize: '0.95rem' }}
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

      {/* Grouped Folders Panel list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Loading calculations logs...</span>
        </div>
      ) : filteredCalculations.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px', gap: '16px', color: 'var(--text-muted)' }}>
          <FileText size={48} />
          <span style={{ fontSize: '1rem' }}>No records found.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {Object.entries(groupedByFile).map(([fileName, calcs]) => {
            const isFileExpanded = expandedFile === fileName;
            return (
              <div key={fileName} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>

                {/* Folder Header */}
                <div
                  onClick={() => setExpandedFile(isFileExpanded ? null : fileName)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
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
                      {calcs.length} calculation{calcs.length > 1 ? 's' : ''}
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
                        title="Rename File Folder"
                      >
                        <Edit3 size={14} />
                        Rename
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenQuotationModal(fileName); }}
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
                        title="Generate Formal Quotation PDF for this file"
                      >
                        <FileText size={14} />
                        Generate Quotation
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
                        title="Delete File Folder and all calculations"
                      >
                        <Trash2 size={14} />
                        Delete
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
                        📁 No calculation records inside file folder <strong>"{fileName}"</strong>.
                        <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                          This file folder remains saved in your database and is available in the selection dropdown. Click <strong>"Delete"</strong> above to permanently remove this file folder.
                        </div>
                      </div>
                    ) : (
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }} className="no-print"></th>
                            <th>Company</th>
                            <th>Reference</th>
                            <th>Size</th>
                            <th>Ply</th>
                            <th>Qty</th>
                            <th>GSM/BF</th>
                            <th>Box Weight</th>
                            <th>Price / Piece</th>
                            <th>Duplex</th>
                            <th>Lamination</th>
                            <th>Printing</th>
                            <th>Ink</th>
                            <th>Screen Printing</th>
                            <th>Callico</th>
                            <th>Total Cost</th>
                            <th>Grand Total</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }} className="no-print">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcs.map((calc) => {
                            const isExpanded = expandedId === calc.id;
                            const details = parseCustomerNameDetails(calc.customer_name);
                            const pricing = getCalcPricingDetails(calc);
                            return (
                              <React.Fragment key={calc.id}>
                                {/* Main Row */}
                                <tr
                                  onClick={() => toggleRow(calc.id)}
                                  style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                >
                                  <td className="no-print">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </td>
                                  <td style={{ fontWeight: '600' }}>
                                    {calc.company_name}
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>
                                    {getCalculationTypeLabel(calc)}
                                  </td>
                                  <td>
                                    {details.pairMeta ? (
                                      <div>
                                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>P1: {details.pairMeta.p1Label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', marginTop: '2px', paddingTop: '2px' }}>
                                          P2: {details.pairMeta.p2Label}
                                        </div>
                                      </div>
                                    ) : (
                                      calc.size_label
                                    )}
                                  </td>
                                  <td>{calc.ply_type} Ply</td>
                                  <td>{calc.quantity_of_boxes}</td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    P:{calc.gsm_paper || calc.gsm} F:{calc.gsm_flute === 0 ? 0 : (calc.gsm_flute || 150)} Pk:{details.isDuplex ? 'Duplex' : (calc.gsm_packing === 0 ? 'No Packing' : (calc.gsm_packing || 150))} / {calc.bf}BF
                                  </td>
                                  <td>{Number(calc.box_weight).toFixed(3)} kg</td>
                                  <td style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
                                    {pricing.isDuplex ? (
                                      <div style={{ fontSize: '0.85rem' }}>
                                        <div>Kraft: ₹{Number(pricing.kraftSingleBoxPrice || 0).toFixed(2)}</div>
                                        <div style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>
                                          Dup: ₹{Number(pricing.duplexSingleBoxPrice || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    ) : (
                                      pricing.perPiecePrice !== null ? `₹${Number(pricing.perPiecePrice).toFixed(2)}` : '-'
                                    )}
                                  </td>
                                  <td style={{ fontWeight: details.isDuplex ? '600' : 'normal', color: details.isDuplex ? 'var(--color-accent)' : 'inherit' }}>
                                    {details.isDuplex ? `₹${details.duplexPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ fontWeight: details.isLaminated ? '600' : 'normal', color: details.isLaminated ? 'var(--color-success)' : 'inherit' }}>
                                    {details.isLaminated ? `₹${details.laminationPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ fontWeight: details.isPrintingCharge ? '600' : 'normal', color: details.isPrintingCharge ? 'hsl(38, 92%, 50%)' : 'inherit' }}>
                                    {details.isPrintingCharge ? `₹${details.printingPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ fontWeight: details.isInkCost ? '600' : 'normal', color: details.isInkCost ? 'var(--color-info, #3b82f6)' : 'inherit' }}>
                                    {details.isInkCost ? `₹${details.inkPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ fontWeight: details.isScreenPrinting ? '600' : 'normal', color: details.isScreenPrinting ? 'var(--color-success)' : 'inherit' }}>
                                    {details.isScreenPrinting ? `₹${details.screenPrintingPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td style={{ fontWeight: details.isCallicoCost ? '600' : 'normal', color: details.isCallicoCost ? 'hsl(270, 70%, 60%)' : 'inherit' }}>
                                    {details.isCallicoCost ? `₹${details.callicoPrice.toFixed(2)}` : '-'}
                                  </td>
                                  <td>₹{Number(calc.total_cost).toFixed(2)}</td>
                                  <td style={{ fontWeight: '700', color: 'var(--color-accent)' }}>
                                    ₹{Number(calc.grand_total).toFixed(2)}
                                  </td>
                                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {new Date(calc.created_at).toLocaleDateString()}
                                  </td>
                                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} className="no-print">
                                    <button
                                      onClick={(e) => handleEdit(calc, e)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-accent)',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        marginRight: '4px',
                                      }}
                                      title="Edit Record"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    {activeTab !== 'customer' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSavePDF(calc);
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--color-success, #10b981)',
                                          cursor: 'pointer',
                                          padding: '6px',
                                          borderRadius: '4px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          marginRight: '4px',
                                        }}
                                        title="Save as PDF"
                                      >
                                        <FileDown size={16} />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => handleDelete(calc.id, e)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-error)',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                      className="delete-row-btn"
                                      title="Delete Record"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>

                                {/* Expandable Details Row */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={18} style={{ backgroundColor: 'var(--bg-tertiary)', padding: '24px' }}>
                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                          gap: '24px',
                                          padding: '8px',
                                        }}
                                        className="expanded-panel animate-fade"
                                      >
                                        <div>
                                          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            📏 Dimension Info
                                          </h4>
                                          {details.pairMeta ? (
                                            <>
                                              <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                                <strong>P1 Reel × Cut:</strong> {Number(details.pairMeta.p1Reel).toFixed(2)} in × {Number(details.pairMeta.p1Cut).toFixed(2)} in (Slot {details.pairMeta.p1Slots})
                                              </p>
                                              <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                                <strong>P2 Reel × Cut:</strong> {Number(details.pairMeta.p2Reel).toFixed(2)} in × {Number(details.pairMeta.p2Cut).toFixed(2)} in (Slot {details.pairMeta.p2Slots})
                                              </p>
                                              {Number(calc.reel_size_adjust || 0) !== 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                  Reel Adjust: {calc.reel_size_adjust > 0 ? `+${calc.reel_size_adjust}` : calc.reel_size_adjust} in
                                                </p>
                                              )}
                                              {Number(calc.cut_size_adjust || 0) !== 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                  Cut Adjust: {calc.cut_size_adjust > 0 ? `+${calc.cut_size_adjust}` : calc.cut_size_adjust} in
                                                </p>
                                              )}
                                            </>
                                          ) : details.flabMeta ? (
                                            <>
                                              <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                                <strong>Flab (Length):</strong> {details.flabMeta.flabL} in
                                              </p>
                                              <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                                <strong>Flab (Width):</strong> {details.flabMeta.flabW} in
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Reel Size:</strong> {Number(calc.reel_size).toFixed(2)} in {Number(calc.reel_size_adjust || 0) > 0 ? ` (+${Number(calc.reel_size_adjust).toFixed(2)} extra)` : ''}
                                              </p>
                                              <p style={{ fontSize: '0.9rem' }}>
                                                <strong>Cut Size:</strong> {Number(calc.cut_size).toFixed(2)} in {Number(calc.cut_size_adjust || 0) > 0 ? ` (+${Number(calc.cut_size_adjust).toFixed(2)} extra)` : ''}
                                              </p>
                                            </>
                                          ) : (
                                            <>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Reel Size:</strong> {Number(calc.reel_size).toFixed(2)} in {Number(calc.reel_size_adjust || 0) > 0 ? ` (+${Number(calc.reel_size_adjust).toFixed(2)} extra)` : ''}
                                              </p>
                                              <p style={{ fontSize: '0.9rem' }}>
                                                <strong>Cut Size:</strong> {Number(calc.cut_size).toFixed(2)} in {Number(calc.cut_size_adjust || 0) > 0 ? ` (+${Number(calc.cut_size_adjust).toFixed(2)} extra)` : ''}
                                              </p>
                                            </>
                                          )}
                                        </div>

                                        <div>
                                          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            📦 Ply Mechanics
                                          </h4>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>GSM (P / F / Pk):</strong> {calc.gsm_paper || calc.gsm}g / {(calc.gsm_flute === 0 ? 0 : (calc.gsm_flute || 150))}g / {(details.isDuplex || calc.gsm_packing === 0) ? 'No Packing' : `${calc.gsm_packing || 150}g`}
                                          </p>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>Paper Weight:</strong> {Number(calc.paper).toFixed(1)} GSM
                                          </p>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>Flute Weight (Extra {calc.flute_extra_percent}%):</strong> {Number(calc.flute).toFixed(1)} GSM
                                          </p>
                                          <p style={{ fontSize: '0.9rem' }}>
                                            <strong>Total Weight (P+F):</strong> {Number(calc.paper + calc.flute).toFixed(1)} GSM
                                          </p>
                                        </div>

                                        <div>
                                          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            ⚖️ Weight Breakdown
                                          </h4>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>Weight Per Unit:</strong> {Number(calc.weight_per_unit).toFixed(4)} kg
                                          </p>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>Data Multiplier:</strong> {calc.quantity_of_data}
                                          </p>
                                          <p style={{ fontSize: '0.9rem' }}>
                                            <strong>Computed Box Wt:</strong> {Number(calc.box_weight).toFixed(4)} kg
                                          </p>
                                        </div>

                                        <div>
                                          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                            💰 Value Calculation
                                          </h4>
                                          <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                            <strong>Price per KG:</strong> ₹{calc.price_per_kg}/kg
                                          </p>
                                          {pricing.isDuplex ? (
                                            <>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Kraft Box Cost (per piece):</strong> <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>₹{Number(pricing.kraftSingleBoxPrice || 0).toFixed(2)}</span>
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Kraft Subtotal ({calc.quantity_of_boxes} units):</strong> ₹{Number(pricing.kraftBoxCost || 0).toFixed(2)}
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Duplex Box Cost (per piece):</strong> <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>₹{Number(pricing.duplexSingleBoxPrice || 0).toFixed(2)}</span>
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Duplex Subtotal ({calc.quantity_of_boxes} units):</strong> ₹{Number(pricing.duplexBoxCost || 0).toFixed(2)}
                                              </p>
                                            </>
                                          ) : (
                                            pricing.perPiecePrice !== null && (
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Per-Piece Price:</strong> <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>₹{Number(pricing.perPiecePrice).toFixed(2)}</span>
                                              </p>
                                            )
                                          )}
                                          {details.isDuplex && (
                                            <>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Duplex Extra Charge (per box):</strong> ₹{details.duplexPrice.toFixed(2)}
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Duplex Extra Total (₹{details.duplexPrice.toFixed(2)} × {calc.quantity_of_boxes}):</strong>{' '}
                                                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>₹{(details.duplexPrice * calc.quantity_of_boxes).toFixed(2)}</span>
                                              </p>
                                            </>
                                          )}
                                          {details.isLaminated && (
                                            <>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Lamination Price (per box):</strong> ₹{details.laminationPrice.toFixed(2)}
                                              </p>
                                              <p style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                <strong>Lamination Box Cost (₹{details.laminationPrice.toFixed(2)} × {calc.quantity_of_boxes}):</strong>{' '}
                                                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>₹{(details.laminationPrice * calc.quantity_of_boxes).toFixed(2)}</span>
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
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

      {/* PDF Selection Modal */}
      {isPDFSelectionModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            color: 'var(--text-primary)',
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', fontWeight: '700' }}>
              Save Calculations as PDF - {pdfSelectionFolder}
            </h3>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
              Select which calculations to include in the PDF report:
            </p>

            {/* Selection Checklist Table */}
            <div style={{ overflowX: 'auto', marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>Select</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Company</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Size</th>
                    <th style={{ padding: '10px', textAlign: 'left', width: '90px' }}>Qty</th>
                    <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>Box Wt</th>
                    <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfSelectionItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const newItems = [...pdfSelectionItems];
                            newItems[idx].selected = e.target.checked;
                            setPdfSelectionItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{item.company_name}</td>
                      <td style={{ padding: '10px' }}>{item.size_label}</td>
                      <td style={{ padding: '10px' }}>{item.quantity_of_boxes}</td>
                      <td style={{ padding: '10px' }}>{Number(item.box_weight).toFixed(3)} kg</td>
                      <td style={{ padding: '10px', fontWeight: '700', color: 'var(--color-accent)' }}>
                        ₹{Number(item.grand_total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setIsPDFSelectionModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilePDFSelected}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gradient-accent)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quotation Modal via React Portal */}
      {isQuotationModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '16px',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'var(--bg-tertiary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: 'var(--radius-md, 12px)',
            width: '98vw',
            maxWidth: '1560px',
            height: '92vh',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            color: 'var(--text-primary, #f8fafc)',
            overflow: 'hidden',
          }}>
            {/* Modal Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-secondary, #0f172a)',
              flexShrink: 0,
              minHeight: '60px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: '1.35',
                  letterSpacing: '0.2px'
                }}>
                  Professional Quotation Generator — SRI VARI PACKS
                </h3>
                <p style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                  lineHeight: '1.3'
                }}>
                  File Folder: <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>{quotationFolder}</span>
                </p>
              </div>
              <button
                onClick={() => setIsQuotationModalOpen(false)}
                title="Close Quotation Modal"
                style={{
                  background: 'var(--bg-secondary, rgba(255, 255, 255, 0.1))',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                  color: 'var(--text-primary, #f8fafc)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Split View Content Body */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              padding: '16px 24px',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
            }}>
              {/* Left Column: Quotation Form & Controls (Scrollable) */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: 0,
                height: '100%',
                overflowY: 'auto',
                paddingRight: '8px',
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  ⚙️ Quotation Configuration
                </h4>

                {/* To Address Profile Searchable Selector */}
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '4px', position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--color-accent)' }}>
                    <span>To Address Profile</span>
                    {quotationHeader.selectedKeyword && (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                        ✓ {quotationHeader.selectedKeyword}
                      </span>
                    )}
                  </label>

                  {/* Search Input Box */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Type keyword to search profiles..."
                      value={profileSearchTerm}
                      onFocus={() => setIsProfileDropdownOpen(true)}
                      onChange={(e) => {
                        setProfileSearchTerm(e.target.value);
                        setIsProfileDropdownOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 30px 8px 32px',
                        borderRadius: '6px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}
                    />
                    {profileSearchTerm && (
                      <button
                        type="button"
                        onClick={() => selectProfile(null)}
                        style={{
                          position: 'absolute', right: '8px', background: 'transparent', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '4px'
                        }}
                        title="Clear profile search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options List */}
                  {isProfileDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0, right: 0,
                      background: 'var(--bg-tertiary, #1e293b)',
                      border: '1px solid var(--border-color, #334155)',
                      borderRadius: '6px',
                      marginTop: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 9999,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                      {toAddressProfiles.filter(p => {
                        if (!profileSearchTerm) return true;
                        const term = profileSearchTerm.toLowerCase();
                        return (
                          (p.keyword && p.keyword.toLowerCase().includes(term)) ||
                          (p.to_address && p.to_address.toLowerCase().includes(term)) ||
                          (p.kind_attn && p.kind_attn.toLowerCase().includes(term))
                        );
                      }).length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          No matching profiles found.
                        </div>
                      ) : (
                        toAddressProfiles.filter(p => {
                          if (!profileSearchTerm) return true;
                          const term = profileSearchTerm.toLowerCase();
                          return (
                            (p.keyword && p.keyword.toLowerCase().includes(term)) ||
                            (p.to_address && p.to_address.toLowerCase().includes(term)) ||
                            (p.kind_attn && p.kind_attn.toLowerCase().includes(term))
                          );
                        }).map(p => (
                          <div
                            key={p.id}
                            onClick={() => selectProfile(p)}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.05))',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                              background: quotationHeader.selectedKeyword === p.keyword ? 'rgba(99, 102, 241, 0.2)' : 'transparent'
                            }}
                            className="table-row-hover"
                          >
                            <div style={{ fontWeight: '700', color: 'var(--color-accent)', fontSize: '0.88rem' }}>
                              {p.keyword}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.to_address ? p.to_address.split('\n')[0] : ''} {p.kind_attn ? `| ${p.kind_attn}` : ''}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Date & Recipient Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--color-accent)' }}>Quotation No.</label>
                    <input
                      type="text"
                      value={quotationHeader.quotationNo || ''}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, quotationNo: e.target.value }))}
                      placeholder="e.g. SVP/Q-2026/001"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '700' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Date</label>
                    <input
                      type="text"
                      value={quotationHeader.date}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, date: e.target.value }))}
                      placeholder="DD/MM/YYYY"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Dear Sir</label>
                    <input
                      type="text"
                      value={quotationHeader.dearSir || 'Dear Sir,'}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, dearSir: e.target.value }))}
                      placeholder="Dear Sir,"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Kind Attn</label>
                    <input
                      type="text"
                      value={quotationHeader.kindAttn}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, kindAttn: e.target.value }))}
                      placeholder="e.g. Mr. Karuppiah Subramanian"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>To (Company Name)</label>
                    <input
                      type="text"
                      value={quotationHeader.toCompany}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, toCompany: e.target.value }))}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>To (Address)</label>
                    <textarea
                      value={quotationHeader.toAddress}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, toAddress: e.target.value }))}
                      placeholder="Street, City, Pin"
                      rows={2}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: '1.4' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--color-accent)' }}>Authorized Signatory Name (Bottom Signature)</label>
                    <input
                      type="text"
                      value={quotationHeader.signatory}
                      onChange={(e) => setQuotationHeader(prev => ({ ...prev, signatory: e.target.value }))}
                      placeholder="e.g. M.MUTHUKUMAR"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '700' }}
                    />
                  </div>
                </div>

                {/* Quotation Columns Selection Section */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Quotation Columns (Select to Include in Preview & PDF)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {ALL_QUOTATION_COLUMNS.map(col => (
                      <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.id]}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col.id]: e.target.checked }))}
                        />
                        <span>{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subject & Intro */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Subject</label>
                  <input
                    type="text"
                    value={quotationHeader.subject}
                    onChange={(e) => setQuotationHeader(prev => ({ ...prev, subject: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Introductory Text</label>
                  <textarea
                    value={quotationHeader.introText}
                    onChange={(e) => setQuotationHeader(prev => ({ ...prev, introText: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Calculations Checklist Table & Grouping Controls */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      Select Calculations & Edit Quotation Descriptions
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setQuotationItems(prev => prev.map(item => ({ ...item, selected: true })))}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setQuotationItems(prev => prev.map(item => ({ ...item, selected: false })))}
                        style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Unselect All
                      </button>
                    </div>
                  </div>

                  {/* Calculation Grouping (Optional) Control */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-accent)' }}>
                          📦 Calculation Grouping
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          (Optional: Group rates into single rows)
                        </span>
                      </div>
                      {!groupModalOpen && (
                        <button
                          type="button"
                          onClick={handleOpenCreateGroup}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            borderRadius: '4px',
                            background: 'var(--gradient-accent, #6366f1)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          + Create Group
                        </button>
                      )}
                    </div>

                    {/* Active Groups List */}
                    {calculationGroups.length > 0 && !groupModalOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                        {calculationGroups.map(group => {
                          const groupItems = quotationItems.filter(i => group.calcIds.includes(i.id));
                          const repItem = groupItems.find(i => i.id === group.representativeId) || groupItems[0];
                          const totalRate = groupItems.reduce((acc, i) => acc + (Number(i.rateNum) || 0), 0);

                          return (
                            <div key={group.id} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '5px 8px',
                              fontSize: '0.75rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>{group.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                  ({group.calcIds.length} calcs)
                                </span>
                                {repItem && (
                                  <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 4px', borderRadius: '3px', fontSize: '0.68rem' }}>
                                    ⭐ Rep: {repItem.description || `ID ${repItem.id}`}
                                  </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontWeight: '700', color: '#10b981', fontSize: '0.72rem' }}>Total Rate: ₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={group.customRate !== undefined && group.customRate !== null ? group.customRate : Number(totalRate).toFixed(2)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCalculationGroups(prev => prev.map(g => g.id === group.id ? { ...g, customRate: val === '' ? undefined : parseFloat(val) } : g));
                                    }}
                                    style={{
                                      width: '75px',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                      color: '#10b981',
                                      fontWeight: '700',
                                      fontSize: '0.72rem',
                                      textAlign: 'right'
                                    }}
                                    title="Edit Grouped Rate for current quotation"
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleEditGroup(group)}
                                  style={{ padding: '1px 5px', fontSize: '0.68rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '3px', cursor: 'pointer' }}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroup(group.id)}
                                  style={{ padding: '1px 5px', fontSize: '0.68rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '3px', cursor: 'pointer' }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline Group Creation / Editing Panel */}
                    {groupModalOpen && (
                      <div style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px dashed var(--color-accent)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        marginTop: '6px'
                      }}>
                        <div style={{ fontWeight: '700', fontSize: '0.78rem', color: 'var(--color-accent)', marginBottom: '6px' }}>
                          {editingGroupId ? 'Edit Calculation Group' : 'Create New Calculation Group'}
                        </div>

                        <div style={{ marginBottom: '6px' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', marginBottom: '2px' }}>
                            Group Name:
                          </label>
                          <input
                            type="text"
                            value={groupFormName}
                            onChange={(e) => setGroupFormName(e.target.value)}
                            placeholder="e.g. Group 1"
                            style={{
                              width: '100%',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '6px' }}>
                          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', marginBottom: '3px' }}>
                            Select Calculations & Representative (⭐):
                          </label>
                          <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', padding: '4px' }}>
                            {quotationItems.map(item => {
                              const existingOtherGroup = calculationGroups.find(g => g.id !== editingGroupId && g.calcIds.includes(item.id));
                              const isChecked = groupFormCalcIds.includes(item.id);
                              const isRep = groupFormRepId === item.id;

                              return (
                                <div key={item.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '3px 4px',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  opacity: existingOtherGroup ? 0.5 : 1,
                                  fontSize: '0.73rem'
                                }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: existingOtherGroup ? 'not-allowed' : 'pointer', flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      disabled={!!existingOtherGroup}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const newCalcIds = [...groupFormCalcIds, item.id];
                                          setGroupFormCalcIds(newCalcIds);
                                          if (!groupFormRepId || newCalcIds.length === 1) {
                                            setGroupFormRepId(item.id);
                                          }
                                        } else {
                                          const newCalcIds = groupFormCalcIds.filter(id => id !== item.id);
                                          setGroupFormCalcIds(newCalcIds);
                                          if (groupFormRepId === item.id) {
                                            setGroupFormRepId(newCalcIds[0] || null);
                                          }
                                        }
                                      }}
                                    />
                                    <span>
                                      <strong>{item.description}</strong> ({item.size}) — ₹{Number(item.rateNum || 0).toFixed(2)}
                                      {existingOtherGroup && (
                                        <span style={{ color: '#ef4444', marginLeft: '4px', fontSize: '0.68rem' }}>
                                          ({existingOtherGroup.name})
                                        </span>
                                      )}
                                    </span>
                                  </label>

                                  {isChecked && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.68rem', color: isRep ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', fontWeight: isRep ? 'bold' : 'normal' }}>
                                      <input
                                        type="radio"
                                        name="representativeCalc"
                                        checked={isRep}
                                        onChange={() => setGroupFormRepId(item.id)}
                                      />
                                      <span>{isRep ? '⭐ Rep' : 'Set Rep'}</span>
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setGroupModalOpen(false);
                              setEditingGroupId(null);
                            }}
                            style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveGroup}
                            style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: '4px', background: 'var(--gradient-accent, #6366f1)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                          >
                            Save Group
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', sticky: 'top' }}>
                          <th style={{ padding: '5px', textAlign: 'center', width: '36px' }}>Include</th>
                          <th style={{ padding: '5px', textAlign: 'left' }}>Description (Editable)</th>
                          <th style={{ padding: '5px', textAlign: 'left' }}>Size</th>
                          <th style={{ padding: '5px', textAlign: 'center', width: '45px' }}>Ply</th>
                          <th style={{ padding: '5px', textAlign: 'center', width: '55px' }}>Qty</th>
                          <th style={{ padding: '5px', textAlign: 'right', width: '75px' }}>Rate</th>
                          {visibleColumns.dieCost && (
                            <th style={{ padding: '5px', textAlign: 'left', width: '90px' }}>Die Cost</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {quotationItems.map((item, idx) => {
                          const assignedGroup = calculationGroups.find(g => g.calcIds.includes(item.id));
                          const isRep = assignedGroup && assignedGroup.representativeId === item.id;

                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: item.selected ? 1 : 0.5 }}>
                              <td style={{ padding: '5px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={(e) => {
                                    const newItems = [...quotationItems];
                                    newItems[idx].selected = e.target.checked;
                                    setQuotationItems(newItems);
                                  }}
                                />
                              </td>
                              <td style={{ padding: '3px 5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const newItems = [...quotationItems];
                                      newItems[idx].description = e.target.value;
                                      setQuotationItems(newItems);
                                    }}
                                    style={{ flex: 1, padding: '3px 5px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                  />
                                  {assignedGroup && (
                                    <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', whiteSpace: 'nowrap' }}>
                                      {assignedGroup.name}{isRep ? ' ⭐' : ''}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '5px' }}>{item.size}</td>
                              <td style={{ padding: '5px', textAlign: 'center' }}>{item.ply}</td>
                              <td style={{ padding: '5px', textAlign: 'center' }}>{item.qty}</td>
                              <td style={{ padding: '3px 5px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.rateNum !== undefined && item.rateNum !== null ? item.rateNum : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const newItems = [...quotationItems];
                                      newItems[idx].rateNum = val === '' ? 0 : parseFloat(val);
                                      setQuotationItems(newItems);
                                    }}
                                    style={{
                                      width: '75px',
                                      padding: '3px 5px',
                                      borderRadius: '4px',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--color-accent)',
                                      fontWeight: '700',
                                      fontSize: '0.78rem',
                                      textAlign: 'right'
                                    }}
                                  />
                                </div>
                              </td>
                              {visibleColumns.dieCost && (
                                <td style={{ padding: '3px 5px' }}>
                                  <input
                                    type="text"
                                    value={item.dieCost || ''}
                                    onChange={(e) => {
                                      const newItems = [...quotationItems];
                                      newItems[idx].dieCost = e.target.value;
                                      setQuotationItems(newItems);
                                    }}
                                    placeholder="e.g. ₹5,000"
                                    style={{ width: '100%', padding: '3px 5px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                                  />
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technical Specifications Section Control */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Technical Specifications</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={showTechSpecs}
                        onChange={(e) => setShowTechSpecs(e.target.checked)}
                      />
                      <span>Show Technical Specifications</span>
                    </label>
                  </div>
                  {showTechSpecs && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>1.)</span>
                        <input
                          type="text"
                          value={quotationHeader.techSpec1}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, techSpec1: e.target.value }))}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>2.)</span>
                        <input
                          type="text"
                          value={quotationHeader.techSpec2}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, techSpec2: e.target.value }))}
                          style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Terms & Conditions Section Control */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Terms & Conditions</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--color-accent)', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={showTerms}
                        onChange={(e) => setShowTerms(e.target.checked)}
                      />
                      <span>Show Terms & Conditions</span>
                    </label>
                  </div>
                  {showTerms && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>1. Delivery</label>
                        <input
                          type="text"
                          value={quotationHeader.term1}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, term1: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>2. Transport</label>
                        <input
                          type="text"
                          value={quotationHeader.term2}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, term2: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>3. Payment</label>
                        <input
                          type="text"
                          value={quotationHeader.term3}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, term3: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>4. Tax</label>
                        <input
                          type="text"
                          value={quotationHeader.term4}
                          onChange={(e) => setQuotationHeader(prev => ({ ...prev, term4: e.target.value }))}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live A4 Visual Preview */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  📄 Live A4 Portrait Quotation Preview
                </h4>

                <div style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: '20px 24px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  fontSize: '11px',
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: '1.35',
                  flex: 1,
                  minHeight: 0,
                  height: '100%',
                  overflowY: 'auto',
                }}>
                  {/* Header Container */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: '6px' }}>
                    <img src="/Logos.png" alt="SRI VARI PACKS" style={{ position: 'absolute', left: 0, top: 0, width: '85px' }} />
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <h1 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 2px 0' }}>SRI VARI PACKS</h1>
                      <p style={{ fontSize: '9px', color: '#334155', margin: '0 0 1px 0' }}>SF.No.49/2C, Megarali Street, Eduyarpalayam,</p>
                      <p style={{ fontSize: '9px', color: '#334155', margin: '0 0 1px 0' }}>Vellalore, Coimbatore – 641 111</p>
                      <p style={{ fontSize: '9px', color: '#334155', margin: '0' }}>GST No. 33ACIFS8236M1ZN</p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '9.5px', marginTop: '4px', marginBottom: '2px' }}>
                    {quotationHeader.date || new Date().toLocaleDateString('en-GB')}
                  </div>

                  <div style={{ borderBottom: '1.5px solid #000', marginBottom: '10px' }}></div>

                  {/* Customer Info */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '2px' }}>To,</div>
                    <div style={{ paddingLeft: '24px' }}>
                      {quotationHeader.toCompany && (
                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '2px' }}>
                          {quotationHeader.toCompany}
                        </div>
                      )}
                      {quotationHeader.toAddress && (
                        <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>
                          {quotationHeader.toAddress}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dear Sir & Kind Attn */}
                  <div style={{ paddingLeft: '24px', marginBottom: '8px' }}>
                    <div style={{ marginBottom: '3px' }}>{quotationHeader.dearSir || 'Dear Sir,'}</div>
                    {quotationHeader.kindAttn && (
                      <div style={{ paddingLeft: '36px', fontWeight: 'bold', marginBottom: '3px' }}>
                        {quotationHeader.kindAttn.startsWith('Kind Attn') ? quotationHeader.kindAttn : `Kind Attn – ${quotationHeader.kindAttn}`}
                      </div>
                    )}
                  </div>

                  {/* Subject */}
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    Sub: <span style={{ textDecoration: 'underline' }}>{quotationHeader.subject}</span>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    {quotationHeader.introText}
                  </div>

                  {/* Dynamic Quotation Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '9.5px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {ALL_QUOTATION_COLUMNS.filter(c => visibleColumns[c.id]).map(c => (
                          <th key={c.id} style={{ border: '1px solid #000', padding: '4px', textAlign: c.headerAlign }}>
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getEffectiveQuotationItems(quotationItems, calculationGroups).filter(i => i.selected).map((item, idx) => (
                        <tr key={item.id}>
                          {ALL_QUOTATION_COLUMNS.filter(c => visibleColumns[c.id]).map(c => {
                            let val = '';
                            if (c.id === 'sNo') val = idx + 1;
                            else if (c.id === 'description') val = item.description;
                            else if (c.id === 'size') val = item.size;
                            else if (c.id === 'ply') val = item.ply;
                            else if (c.id === 'qty') val = item.qty;
                            else if (c.id === 'gsmBf') val = item.gsmBf;
                            else if (c.id === 'rate') val = Number(item.rateNum || 0).toFixed(2);
                            else if (c.id === 'dieCost') val = item.dieCost || '';

                            return (
                              <td key={c.id} style={{ border: '1px solid #000', padding: '4px', textAlign: c.cellAlign, fontWeight: c.id === 'rate' ? 'bold' : 'normal' }}>
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Technical Specifications (Conditional) */}
                  {showTechSpecs && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Technical Specifications:</div>
                      {quotationHeader.techSpec1 && <div>1.) {quotationHeader.techSpec1}</div>}
                      {quotationHeader.techSpec2 && <div>2.) {quotationHeader.techSpec2}</div>}
                    </div>
                  )}

                  {/* Terms & Conditions (Conditional) */}
                  {showTerms && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '2px' }}>Terms & Conditions:</div>
                      {quotationHeader.term1 && <div>1.) {quotationHeader.term1}</div>}
                      {quotationHeader.term2 && <div>2.) {quotationHeader.term2}</div>}
                      {quotationHeader.term3 && <div>3.) {quotationHeader.term3}</div>}
                      {quotationHeader.term4 && <div>4.) {quotationHeader.term4}</div>}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '8px' }}>
                    Thanking You,
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    <div>For Sri Vari Packs</div>
                    <div style={{ marginTop: '8px' }}>{quotationHeader.signatory || 'M.MUTHUKUMAR'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              borderTop: '1px solid var(--border-color, #334155)',
              background: 'var(--bg-secondary, #0f172a)',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setIsQuotationModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateQuotationPDF}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  background: 'var(--gradient-accent)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                <FileDown size={18} />
                Download Quotation PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
