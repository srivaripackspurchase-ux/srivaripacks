import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, 
  Ruler, 
  Edit3, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Layers, 
  ChevronRight, 
  Save, 
  ArrowLeft,
  Search,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CALC_CATEGORIES = [
  { id: 'box', name: 'Standard Box', icon: '📦', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'inch' },
  { id: 'pad', name: 'Pad', icon: '📄', dimCount: 2, labels: ['Length', 'Width'], defaultUnit: 'mm' },
  { id: 'partition', name: 'Partition', icon: '🧩', dimCount: 2, labels: ['Length', 'Height'], defaultUnit: 'mm', supportsPairs: true },
  { id: 'tray', name: 'Tray', icon: '📥', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'mm' },
  { id: 'sleave', name: 'Sleave', icon: '✉️', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'mm' },
  { id: 'coller_box', name: 'Coller Box', icon: '🔳', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'mm' },
  { id: 'top_side_tray', name: 'Top Side Tray Box', icon: '🗳️', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'mm' },
  { id: 'universal', name: 'Universal Type', icon: '🌐', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'inch' },
  { id: 'full_closing', name: 'Full Closing Box', icon: '📇', dimCount: 3, labels: ['Length', 'Width', 'Height'], defaultUnit: 'inch' }
];

export default function CompanyManagement() {
  const { authenticatedFetch } = useAuth();
  const { showToast, confirmModal } = useNotification();

  // Mode: null = Dashboard Selection, 'edit' = Edit Mode, 'add' = Add Mode
  const [activeMode, setActiveMode] = useState(null);

  // Common Data State
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Mode 1: Edit State
  const [selectedCalcCategory, setSelectedCalcCategory] = useState('box');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companySizes, setCompanySizes] = useState([]);
  const [loadingSizes, setLoadingSizes] = useState(false);

  // Rename Company Modal State
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editCompanyNameInput, setEditCompanyNameInput] = useState('');
  const [editScope, setEditScope] = useState('scoped'); // 'scoped' or 'global'
  const [renamingCompany, setRenamingCompany] = useState(false);

  // Delete Company Modal State
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);
  const [deleteScope, setDeleteScope] = useState('scoped'); // 'scoped' or 'global'
  const [deletingCompany, setDeletingCompany] = useState(false);

  // Edit Single/Paired Size Modal State
  const [editingSizeGroup, setEditingSizeGroup] = useState(null);
  const [editPartitionForm, setEditPartitionForm] = useState({
    slot1Length: '',
    slot1Height: '',
    slot1Count: 1,
    slot2Length: '',
    slot2Height: '',
    slot2Count: 1,
    unit: 'mm'
  });
  const [editSizeForm, setEditSizeForm] = useState({
    length: '',
    width: '',
    height: '',
    unit: 'mm'
  });
  const [updatingSize, setUpdatingSize] = useState(false);

  // Mode 2: Add New State
  const [addCalcCategory, setAddCalcCategory] = useState('box');
  const [addCompanyName, setAddCompanyName] = useState('');
  const [existingCompanySelect, setExistingCompanySelect] = useState('');
  const [isNewCompanyInput, setIsNewCompanyInput] = useState(true);

  // Dynamic Size Rows for Add Mode
  const [sizeRows, setSizeRows] = useState([
    { 
      id: 1, 
      partitionType: 'paired',
      slot1Length: '', 
      slot1Height: '', 
      slot1Count: 1,
      slot2Length: '', 
      slot2Height: '', 
      slot2Count: 1,
      length: '', 
      width: '', 
      height: '', 
      unit: 'inch',
      slotCount: 1
    }
  ]);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // ─── Fetch All Companies ───────────────────────────────────────────────────
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await authenticatedFetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data || []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      showToast('Failed to load companies.', 'error');
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filter companies available for selected calculation category in Edit Mode
  const filteredCompaniesForCategory = useMemo(() => {
    if (!selectedCalcCategory) return companies;
    return companies.filter(c => 
      !c.available_types || 
      c.available_types.length === 0 || 
      c.available_types.includes('all') || 
      c.available_types.includes(selectedCalcCategory)
    );
  }, [companies, selectedCalcCategory]);

  // Set default company when category changes in Edit Mode if current selection is invalid
  useEffect(() => {
    if (activeMode === 'edit') {
      if (filteredCompaniesForCategory.length > 0) {
        const isStillValid = filteredCompaniesForCategory.some(c => String(c.id) === String(selectedCompanyId));
        if (!isStillValid) {
          setSelectedCompanyId(filteredCompaniesForCategory[0].id);
        }
      } else {
        setSelectedCompanyId('');
        setCompanySizes([]);
      }
    }
  }, [selectedCalcCategory, companies, activeMode]);

  // Fetch sizes when selectedCompanyId or selectedCalcCategory changes
  const fetchCompanySizes = async (compId, cat) => {
    if (!compId) {
      setCompanySizes([]);
      return;
    }
    setLoadingSizes(true);
    try {
      const url = `/api/companies/${compId}/sizes?calc_type=${cat}`;
      const res = await authenticatedFetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanySizes(data || []);
      }
    } catch (err) {
      console.error('Error fetching company sizes:', err);
      showToast('Failed to load company sizes.', 'error');
    } finally {
      setLoadingSizes(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'edit' && selectedCompanyId && selectedCalcCategory) {
      fetchCompanySizes(selectedCompanyId, selectedCalcCategory);
    }
  }, [selectedCompanyId, selectedCalcCategory, activeMode]);

  // Selected company object
  const selectedCompObj = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // ─── Group Partition Sizes by pair_group ──────────────────────────────────
  const partitionGroupedSizes = useMemo(() => {
    if (selectedCalcCategory !== 'partition') return [];
    const groups = {};
    const singles = [];

    companySizes.forEach(s => {
      if (s.pair_group != null) {
        if (!groups[s.pair_group]) groups[s.pair_group] = [];
        groups[s.pair_group].push(s);
      } else {
        singles.push({ type: 'single', slot1: s });
      }
    });

    const grouped = [];
    Object.keys(groups).forEach(pg => {
      const pair = groups[pg];
      if (pair.length === 2) {
        pair.sort((a, b) => (a.slot_count || 1) - (b.slot_count || 1));
        grouped.push({
          type: 'paired',
          pairGroup: pg,
          slot1: pair[0],
          slot2: pair[1],
          label: `${pair[0].label} (Slot ${pair[0].slot_count || 1}) + ${pair[1].label} (Slot ${pair[1].slot_count || 1})`
        });
      } else {
        pair.forEach(s => singles.push({ type: 'single', slot1: s }));
      }
    });

    return [...grouped, ...singles];
  }, [companySizes, selectedCalcCategory]);

  // ─── Rename Company Handler (Scoped vs Global) ────────────────────────────
  const handleOpenRenameModal = () => {
    if (!selectedCompObj) return;
    setEditCompanyNameInput(selectedCompObj.name);
    setEditScope('scoped');
    setShowRenameModal(true);
  };

  const handleConfirmRenameCompany = async (e) => {
    e.preventDefault();
    if (!editCompanyNameInput.trim() || !selectedCompanyId) return;

    const categoryName = CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name || selectedCalcCategory;
    setRenamingCompany(true);

    try {
      let url = '';
      if (editScope === 'scoped') {
        url = `/api/companies/${selectedCompanyId}/calc_type/${selectedCalcCategory}`;
      } else {
        url = `/api/companies/${selectedCompanyId}`;
      }

      const res = await authenticatedFetch(url, {
        method: 'PUT',
        body: JSON.stringify({ name: editCompanyNameInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error renaming company');

      showToast(
        editScope === 'scoped'
          ? `Company renamed to "${data.name}" for ${categoryName} calculations only.`
          : `Company renamed to "${data.name}" globally across ALL calculations.`,
        'success'
      );

      setShowRenameModal(false);
      await fetchCompanies();
      setSelectedCompanyId(data.id);
    } catch (err) {
      showToast(err.message || 'Failed to rename company.', 'error');
    } finally {
      setRenamingCompany(false);
    }
  };

  // ─── Delete Company Handler (Scoped vs Global) ────────────────────────────
  const handleOpenDeleteCompanyModal = () => {
    if (!selectedCompObj) return;
    setDeleteScope('scoped');
    setShowDeleteCompanyModal(true);
  };

  const handleConfirmDeleteCompany = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    const categoryName = CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name || selectedCalcCategory;
    setDeletingCompany(true);

    try {
      let url = '';
      if (deleteScope === 'scoped') {
        url = `/api/companies/${selectedCompanyId}/calc_type/${selectedCalcCategory}`;
      } else {
        url = `/api/companies/${selectedCompanyId}`;
      }

      const res = await authenticatedFetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error deleting company');

      showToast(
        deleteScope === 'scoped'
          ? `Deleted company "${selectedCompObj?.name}" for ${categoryName} calculations.`
          : `Deleted company "${selectedCompObj?.name}" completely across ALL calculations.`,
        'success'
      );

      setShowDeleteCompanyModal(false);
      await fetchCompanies();
    } catch (err) {
      showToast(err.message || 'Failed to delete company.', 'error');
    } finally {
      setDeletingCompany(false);
    }
  };

  // ─── Open Edit Size Modal ─────────────────────────────────────────────────
  const handleOpenEditSize = (item) => {
    if (selectedCalcCategory === 'partition') {
      if (item.type === 'paired') {
        setEditingSizeGroup(item);
        setEditPartitionForm({
          slot1Length: item.slot1.length_inches || '',
          slot1Height: item.slot1.width_inches || item.slot1.height_inches || '',
          slot1Count: item.slot1.slot_count || 1,
          slot2Length: item.slot2.length_inches || '',
          slot2Height: item.slot2.width_inches || item.slot2.height_inches || '',
          slot2Count: item.slot2.slot_count || 1,
          unit: item.slot1.unit || 'mm'
        });
      } else {
        setEditingSizeGroup(item);
        setEditPartitionForm({
          slot1Length: item.slot1.length_inches || '',
          slot1Height: item.slot1.width_inches || item.slot1.height_inches || '',
          slot1Count: item.slot1.slot_count || 1,
          slot2Length: '',
          slot2Height: '',
          slot2Count: 1,
          unit: item.slot1.unit || 'mm'
        });
      }
    } else {
      const sz = item.slot1 || item;
      setEditingSizeGroup({ type: 'single', slot1: sz });
      setEditSizeForm({
        length: sz.length_inches || '',
        width: sz.width_inches || '',
        height: sz.height_inches || '',
        unit: sz.unit || 'mm'
      });
    }
  };

  // Save Edited Size Record
  const handleSaveSizeRecord = async (e) => {
    e.preventDefault();
    if (!editingSizeGroup) return;

    setUpdatingSize(true);
    try {
      if (selectedCalcCategory === 'partition') {
        const u = editPartitionForm.unit || 'mm';
        
        if (editingSizeGroup.type === 'paired') {
          const l1 = Number(editPartitionForm.slot1Length) || 0;
          const h1 = Number(editPartitionForm.slot1Height) || 0;
          const s1 = Number(editPartitionForm.slot1Count) || 1;

          const l2 = Number(editPartitionForm.slot2Length) || 0;
          const h2 = Number(editPartitionForm.slot2Height) || 0;
          const s2 = Number(editPartitionForm.slot2Count) || 1;

          const label1 = `${l1} × ${h1} (${u})`;
          const label2 = `${l2} × ${h2} (${u})`;

          // Update Slot 1
          await authenticatedFetch(`/api/companies/sizes/${editingSizeGroup.slot1.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              label: label1,
              length_inches: l1,
              width_inches: h1,
              height_inches: 0,
              unit: u,
              calc_type: 'partition',
              slot_count: s1,
              pair_group: editingSizeGroup.pairGroup
            })
          });

          // Update Slot 2
          await authenticatedFetch(`/api/companies/sizes/${editingSizeGroup.slot2.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              label: label2,
              length_inches: l2,
              width_inches: h2,
              height_inches: 0,
              unit: u,
              calc_type: 'partition',
              slot_count: s2,
              pair_group: editingSizeGroup.pairGroup
            })
          });

          showToast('Paired Partition sizes updated successfully.', 'success');
        } else {
          const l1 = Number(editPartitionForm.slot1Length) || 0;
          const h1 = Number(editPartitionForm.slot1Height) || 0;
          const s1 = Number(editPartitionForm.slot1Count) || 1;
          const label1 = `${l1} × ${h1} (${u})`;

          await authenticatedFetch(`/api/companies/sizes/${editingSizeGroup.slot1.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              label: label1,
              length_inches: l1,
              width_inches: h1,
              height_inches: 0,
              unit: u,
              calc_type: 'partition',
              slot_count: s1
            })
          });

          showToast('Partition size updated successfully.', 'success');
        }
      } else {
        const catConfig = CALC_CATEGORIES.find(c => c.id === selectedCalcCategory) || CALC_CATEGORIES[0];
        const l = Number(editSizeForm.length) || 0;
        const w = Number(editSizeForm.width) || 0;
        const h = catConfig.dimCount === 3 ? (Number(editSizeForm.height) || 0) : 0;
        const unitStr = editSizeForm.unit || 'mm';

        let formattedLabel = catConfig.dimCount === 3 ? `${l} × ${w} × ${h} (${unitStr})` : `${l} × ${w} (${unitStr})`;

        const payload = {
          label: formattedLabel,
          length_inches: l,
          width_inches: w,
          height_inches: h,
          unit: unitStr,
          calc_type: selectedCalcCategory
        };

        const res = await authenticatedFetch(`/api/companies/sizes/${editingSizeGroup.slot1.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error updating size record');

        showToast(`Size updated successfully: ${data.label}`, 'success');
      }

      setEditingSizeGroup(null);
      await fetchCompanies();
      fetchCompanySizes(selectedCompanyId, selectedCalcCategory);
    } catch (err) {
      showToast(err.message || 'Failed to update size record.', 'error');
    } finally {
      setUpdatingSize(false);
    }
  };

  // Delete Size Record
  const handleDeleteSizeGroup = (item) => {
    const isPaired = item.type === 'paired';
    const labelToDelete = isPaired ? item.label : (item.slot1 ? item.slot1.label : item.label);

    confirmModal({
      title: 'Delete Size Entry',
      message: `Are you sure you want to delete "${labelToDelete}"? This will remove it from dropdown choices in calculations.`,
      confirmText: 'Delete Size',
      isDestructive: true,
      onConfirm: async () => {
        try {
          if (isPaired) {
            await authenticatedFetch(`/api/companies/sizes/${item.slot1.id}`, { method: 'DELETE' });
            await authenticatedFetch(`/api/companies/sizes/${item.slot2.id}`, { method: 'DELETE' });
          } else {
            const targetId = item.slot1 ? item.slot1.id : item.id;
            await authenticatedFetch(`/api/companies/sizes/${targetId}`, { method: 'DELETE' });
          }
          showToast(`Deleted size "${labelToDelete}" successfully.`, 'success');
          await fetchCompanies();
          fetchCompanySizes(selectedCompanyId, selectedCalcCategory);
        } catch (err) {
          showToast(err.message || 'Failed to delete size record.', 'error');
        }
      }
    });
  };

  // ─── Mode 2: Add New Company & Sizes Handlers ──────────────────────────────
  const handleAddSizeRow = () => {
    const defaultUnit = (CALC_CATEGORIES.find(c => c.id === addCalcCategory) || {}).defaultUnit || 'mm';
    setSizeRows(prev => [
      ...prev,
      { 
        id: Date.now() + Math.random(), 
        partitionType: 'paired',
        slot1Length: '', 
        slot1Height: '', 
        slot1Count: 1,
        slot2Length: '', 
        slot2Height: '', 
        slot2Count: 1,
        length: '', 
        width: '', 
        height: '', 
        unit: defaultUnit,
        slotCount: 1
      }
    ]);
  };

  const handleRemoveSizeRow = (idToRemove) => {
    if (sizeRows.length === 1) return;
    setSizeRows(prev => prev.filter(r => r.id !== idToRemove));
  };

  const handleSizeRowChange = (id, field, value) => {
    setSizeRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Submit Add New Company & Sizes
  const handleSubmitAddCompanyAndSizes = async (e) => {
    e.preventDefault();

    let companyName = '';
    if (isNewCompanyInput) {
      if (!addCompanyName.trim()) {
        showToast('Please enter a Company Name.', 'error');
        return;
      }
      companyName = addCompanyName.trim();
    } else {
      if (!existingCompanySelect) {
        showToast('Please select an existing Company.', 'error');
        return;
      }
      const found = companies.find(c => c.id === existingCompanySelect);
      companyName = found ? found.name : '';
    }

    const catConfig = CALC_CATEGORIES.find(c => c.id === addCalcCategory) || CALC_CATEGORIES[0];
    const validSizes = [];

    if (addCalcCategory === 'partition') {
      let currentMaxPairGroup = 0;
      companySizes.forEach(s => {
        if (s.pair_group && s.pair_group > currentMaxPairGroup) {
          currentMaxPairGroup = s.pair_group;
        }
      });

      for (let i = 0; i < sizeRows.length; i++) {
        const r = sizeRows[i];
        const u = r.unit || 'mm';

        if (r.partitionType === 'paired') {
          const l1 = Number(r.slot1Length) || 0;
          const h1 = Number(r.slot1Height) || 0;
          const s1 = Number(r.slot1Count) || 1;

          const l2 = Number(r.slot2Length) || 0;
          const h2 = Number(r.slot2Height) || 0;
          const s2 = Number(r.slot2Count) || 1;

          if (l1 <= 0 || h1 <= 0 || l2 <= 0 || h2 <= 0) {
            showToast(`Please enter valid dimensions for Partition #${i + 1} (Slot 1 & Slot 2).`, 'error');
            return;
          }

          currentMaxPairGroup += 1;
          const pg = currentMaxPairGroup;

          validSizes.push({
            label: `${l1} × ${h1} (${u})`,
            length_inches: l1,
            width_inches: h1,
            height_inches: 0,
            unit: u,
            calc_type: 'partition',
            slot_count: s1,
            pair_group: pg
          });

          validSizes.push({
            label: `${l2} × ${h2} (${u})`,
            length_inches: l2,
            width_inches: h2,
            height_inches: 0,
            unit: u,
            calc_type: 'partition',
            slot_count: s2,
            pair_group: pg
          });
        } else {
          const l = Number(r.slot1Length || r.length) || 0;
          const h = Number(r.slot1Height || r.width) || 0;
          const s = Number(r.slot1Count || r.slotCount) || 1;

          if (l <= 0 || h <= 0) {
            showToast(`Please enter valid dimensions for Single Partition #${i + 1}.`, 'error');
            return;
          }

          validSizes.push({
            label: `${l} × ${h} (${u})`,
            length_inches: l,
            width_inches: h,
            height_inches: 0,
            unit: u,
            calc_type: 'partition',
            slot_count: s,
            pair_group: null
          });
        }
      }
    } else {
      for (let i = 0; i < sizeRows.length; i++) {
        const r = sizeRows[i];
        const l = Number(r.length) || 0;
        const w = Number(r.width) || 0;
        const h = catConfig.dimCount === 3 ? (Number(r.height) || 0) : 0;
        const u = r.unit || catConfig.defaultUnit;

        if (l <= 0 || w <= 0 || (catConfig.dimCount === 3 && h <= 0)) {
          showToast(`Please fill valid numeric dimensions for Size #${i + 1}.`, 'error');
          return;
        }

        let formattedLabel = catConfig.dimCount === 3 ? `${l} × ${w} × ${h} (${u})` : `${l} × ${w} (${u})`;

        validSizes.push({
          label: formattedLabel,
          length_inches: l,
          width_inches: w,
          height_inches: h,
          unit: u,
          calc_type: addCalcCategory
        });
      }
    }

    setSubmittingAdd(true);
    try {
      // Step 1: Create or get Company
      let compId = existingCompanySelect;
      if (isNewCompanyInput) {
        const compRes = await authenticatedFetch('/api/companies', {
          method: 'POST',
          body: JSON.stringify({ name: companyName })
        });
        const compData = await compRes.json();
        if (!compRes.ok) throw new Error(compData.message || 'Error creating company');
        compId = compData.id;
      }

      // Step 2: Add Size Records
      const sizesRes = await authenticatedFetch(`/api/companies/${compId}/sizes`, {
        method: 'POST',
        body: JSON.stringify({ sizes: validSizes })
      });
      const sizesData = await sizesRes.json();
      if (!sizesRes.ok) throw new Error(sizesData.message || 'Error adding company sizes');

      showToast(`Company "${companyName}" with size presets added successfully!`, 'success');
      
      // Reset form
      setAddCompanyName('');
      setSizeRows([{ 
        id: Date.now(), 
        partitionType: 'paired',
        slot1Length: '', slot1Height: '', slot1Count: 1,
        slot2Length: '', slot2Height: '', slot2Count: 1,
        length: '', width: '', height: '', unit: catConfig.defaultUnit 
      }]);
      fetchCompanies();
      setActiveMode('edit');
      setSelectedCalcCategory(addCalcCategory);
      setSelectedCompanyId(compId);
    } catch (err) {
      console.error('Error adding company & sizes:', err);
      showToast(err.message || 'Operation failed. Please try again.', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  return (
    <div className="page-container animate-fade">
      
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Building size={22} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0 }}>
              Companies Management
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Configure client companies, box dimensions, and calculation size rules synced directly with Supabase.
          </p>
        </div>

        {activeMode && (
          <button 
            onClick={() => setActiveMode(null)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 18px', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Option Cards</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* LANDING OPTION CARDS DASHBOARD (Shown when activeMode === null)        */}
      {/* ===================================================================== */}
      {!activeMode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '10px' }}>
          
          {/* Card 1: Edit Company & Company Sizes */}
          <div 
            onClick={() => setActiveMode('edit')}
            className="glass-panel"
            style={{ 
              padding: '32px', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
                backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Edit3 size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: '0 0 10px 0' }}>
                Edit Company & Company Sizes
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                Select a specific calculation category (Standard Box, Pad, Partition, etc.), pick an existing company, and edit or update dimensions, labels, and units directly in Supabase.
              </p>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              fontWeight: 700, 
              color: 'var(--color-accent)',
              fontSize: '0.95rem',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              position: 'relative',
              zIndex: 1
            }}>
              <span>Open Edit Dashboard</span>
              <ChevronRight size={20} />
            </div>
          </div>

          {/* Card 2: Add New Company & Company Sizes */}
          <div 
            onClick={() => setActiveMode('add')}
            className="glass-panel"
            style={{ 
              padding: '32px', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
                backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <PlusCircle size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: '0 0 10px 0' }}>
                Add New Company & Sizes
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                Create a new company or add custom size presets under any calculation type. Supports multi-size dynamic creation with custom dimension units (<code style={{ color: '#10b981' }}>mm</code> or <code style={{ color: '#10b981' }}>inch</code>).
              </p>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              fontWeight: 700, 
              color: '#10b981',
              fontSize: '0.95rem',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              position: 'relative',
              zIndex: 1
            }}>
              <span>Add New Company & Sizes</span>
              <ChevronRight size={20} />
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE 1: EDIT COMPANY & COMPANY SIZES DASHBOARD                        */}
      {/* ===================================================================== */}
      {activeMode === 'edit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Step 1: Select Calculation Category */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Step 1: Select Calculation Type
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {CALC_CATEGORIES.map(cat => {
                const isSelected = selectedCalcCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCalcCategory(cat.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.88rem' }}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Company & Scoped Company Actions */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 2: Select Company for "{CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}"
              </label>

              {selectedCompanyId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleOpenRenameModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
                  >
                    <Edit3 size={15} />
                    <span>Edit Company Name</span>
                  </button>

                  <button
                    onClick={handleOpenDeleteCompanyModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Company</span>
                  </button>
                </div>
              )}
            </div>

            {filteredCompaniesForCategory.length === 0 ? (
              <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', textAlign: 'center' }}>
                No companies currently have size records under <strong>{CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}</strong>. Switch category or add a new size preset.
              </div>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="form-control"
                style={{ width: '100%', fontSize: '1rem', padding: '12px 16px', fontWeight: 700 }}
              >
                {filteredCompaniesForCategory.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 3: Company Sizes List Table */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Ruler size={20} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-heading)' }}>
                  Configured Sizes ({selectedCalcCategory === 'partition' ? partitionGroupedSizes.length : companySizes.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}
              </span>
            </div>

            {loadingSizes ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading Company Sizes...
              </div>
            ) : (selectedCalcCategory === 'partition' ? partitionGroupedSizes.length === 0 : companySizes.length === 0) ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Ruler size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 4px 0' }}>No sizes found for this category</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Use "Add New Company & Sizes" mode to add size presets for this company.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '16px 20px' }}>Size Label Output</th>
                      {selectedCalcCategory === 'partition' ? (
                        <>
                          <th style={{ padding: '16px 20px' }}>Slot 1 Details (L × H)</th>
                          <th style={{ padding: '16px 20px' }}>Slot 2 Details (L × H)</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '16px 20px' }}>Length</th>
                          <th style={{ padding: '16px 20px' }}>Width</th>
                          <th style={{ padding: '16px 20px' }}>Height</th>
                        </>
                      )}
                      <th style={{ padding: '16px 20px' }}>Unit</th>
                      <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCalcCategory === 'partition' ? (
                      partitionGroupedSizes.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.label}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {item.slot1.length_inches} × {item.slot1.width_inches || item.slot1.height_inches} (Slot {item.slot1.slot_count || 1})
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {item.type === 'paired' ? `${item.slot2.length_inches} × ${item.slot2.width_inches || item.slot2.height_inches} (Slot ${item.slot2.slot_count || 1})` : '-'}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontSize: '0.78rem', fontWeight: 700 }}>
                              {item.slot1.unit || 'mm'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSize(item)}
                                style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                title="Edit Partition Group Details"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSizeGroup(item)}
                                style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#ef4444', cursor: 'pointer' }}
                                title="Delete Partition Group"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      companySizes.map((sz, idx) => (
                        <tr key={sz.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {sz.label}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {sz.length_inches}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {sz.width_inches}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                            {sz.height_inches || '-'}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)', fontSize: '0.78rem', fontWeight: 700 }}>
                              {sz.unit || 'mm'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSize({ type: 'single', slot1: sz })}
                                style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                                title="Edit Size Details"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSizeGroup({ type: 'single', slot1: sz })}
                                style={{ padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#ef4444', cursor: 'pointer' }}
                                title="Delete Size"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODE 2: ADD NEW COMPANY & COMPANY SIZES                               */}
      {/* ===================================================================== */}
      {activeMode === 'add' && (
        <form onSubmit={handleSubmitAddCompanyAndSizes} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Step 1: Select Calculation Category */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Step 1: Select Calculation Category for New Entry
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {CALC_CATEGORIES.map(cat => {
                const isSelected = addCalcCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setAddCalcCategory(cat.id);
                      setSizeRows(prev => prev.map(r => ({ ...r, unit: cat.defaultUnit })));
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid #10b981' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                      color: isSelected ? '#10b981' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.88rem' }}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Company Selection / Entry */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 2: Company Name Details
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewCompanyInput(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isNewCompanyInput ? '2px solid #10b981' : '1px solid var(--border-color)',
                    backgroundColor: isNewCompanyInput ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                    color: isNewCompanyInput ? '#10b981' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  + Create Brand New Company
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCompanyInput(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: !isNewCompanyInput ? '2px solid #10b981' : '1px solid var(--border-color)',
                    backgroundColor: !isNewCompanyInput ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                    color: !isNewCompanyInput ? '#10b981' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Select Existing Company
                </button>
              </div>
            </div>

            {isNewCompanyInput ? (
              <div>
                <input 
                  type="text"
                  placeholder="Enter New Company Name (e.g. SRI VARI PACKAGING CORP)..."
                  value={addCompanyName}
                  onChange={(e) => setAddCompanyName(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', fontSize: '1rem', padding: '12px 16px' }}
                  required={isNewCompanyInput}
                />
              </div>
            ) : (
              <div>
                <select
                  value={existingCompanySelect}
                  onChange={(e) => setExistingCompanySelect(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', fontSize: '1rem', padding: '12px 16px' }}
                  required={!isNewCompanyInput}
                >
                  <option value="">-- Choose Existing Company --</option>
                  {companies.map(comp => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 3: Dynamic Multi-Size Rows */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                  Step 3: Define Size Presets
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Category: <strong>{CALC_CATEGORIES.find(c => c.id === addCalcCategory)?.name}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddSizeRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.88rem'
                }}
              >
                <PlusCircle size={16} />
                <span>+ Add Another {addCalcCategory === 'partition' ? 'Partition Pair' : 'Size'}</span>
              </button>
            </div>

            {addCalcCategory === 'partition' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {sizeRows.map((row, idx) => (
                  <div 
                    key={row.id} 
                    style={{ 
                      padding: '20px', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>
                        Partition Group #{idx + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select
                          value={row.partitionType}
                          onChange={(e) => handleSizeRowChange(row.id, 'partitionType', e.target.value)}
                          className="form-control"
                          style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                        >
                          <option value="paired">Paired Partition (Slot 1 + Slot 2)</option>
                          <option value="single">Single Partition</option>
                        </select>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveSizeRow(row.id)}
                          disabled={sizeRows.length === 1}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: sizeRows.length === 1 ? 'var(--text-muted)' : '#ef4444',
                            cursor: sizeRows.length === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {row.partitionType === 'paired' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '20px', alignItems: 'flex-start' }}>
                        {/* Slot 1 Input Box */}
                        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '10px' }}>
                            Slot 1 Partition
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Length</label>
                              <input 
                                type="number" step="any" placeholder="e.g. 230"
                                value={row.slot1Length}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot1Length', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Height</label>
                              <input 
                                type="number" step="any" placeholder="e.g. 65"
                                value={row.slot1Height}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot1Height', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Slots</label>
                              <input 
                                type="number" min="1" placeholder="1"
                                value={row.slot1Count}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot1Count', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                          </div>
                        </div>

                        {/* Slot 2 Input Box */}
                        <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '10px' }}>
                            Slot 2 Partition
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Length</label>
                              <input 
                                type="number" step="any" placeholder="e.g. 290"
                                value={row.slot2Length}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot2Length', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Height</label>
                              <input 
                                type="number" step="any" placeholder="e.g. 110"
                                value={row.slot2Height}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot2Height', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Slots</label>
                              <input 
                                type="number" min="1" placeholder="1"
                                value={row.slot2Count}
                                onChange={(e) => handleSizeRowChange(row.id, 'slot2Count', e.target.value)}
                                className="form-control" style={{ width: '100%' }} required
                              />
                            </div>
                          </div>
                        </div>

                        {/* Unit Selector */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Unit
                          </label>
                          <select
                            value={row.unit}
                            onChange={(e) => handleSizeRowChange(row.id, 'unit', e.target.value)}
                            className="form-control"
                            style={{ width: '100%' }}
                          >
                            <option value="mm">mm</option>
                            <option value="inch">inch</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px', gap: '16px', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Length</label>
                          <input 
                            type="number" step="any" placeholder="e.g. 230"
                            value={row.slot1Length}
                            onChange={(e) => handleSizeRowChange(row.id, 'slot1Length', e.target.value)}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Height</label>
                          <input 
                            type="number" step="any" placeholder="e.g. 65"
                            value={row.slot1Height}
                            onChange={(e) => handleSizeRowChange(row.id, 'slot1Height', e.target.value)}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Slots</label>
                          <input 
                            type="number" min="1" placeholder="1"
                            value={row.slot1Count}
                            onChange={(e) => handleSizeRowChange(row.id, 'slot1Count', e.target.value)}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Unit</label>
                          <select
                            value={row.unit}
                            onChange={(e) => handleSizeRowChange(row.id, 'unit', e.target.value)}
                            className="form-control" style={{ width: '100%' }}
                          >
                            <option value="mm">mm</option>
                            <option value="inch">inch</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              (() => {
                const catConfig = CALC_CATEGORIES.find(c => c.id === addCalcCategory) || CALC_CATEGORIES[0];

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sizeRows.map((row, idx) => (
                      <div 
                        key={row.id} 
                        style={{ 
                          padding: '18px', 
                          borderRadius: 'var(--radius-md)', 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          display: 'grid',
                          gridTemplateColumns: catConfig.dimCount === 3 ? '1fr 1fr 1fr 120px auto' : '1fr 1fr 120px auto',
                          gap: '16px',
                          alignItems: 'center'
                        }}
                      >
                        {/* Length */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            {catConfig.labels[0]}
                          </label>
                          <input 
                            type="number" step="any"
                            placeholder={`e.g. ${catConfig.defaultUnit === 'inch' ? '12.5' : '350'}`}
                            value={row.length}
                            onChange={(e) => handleSizeRowChange(row.id, 'length', e.target.value)}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>

                        {/* Width */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            {catConfig.labels[1]}
                          </label>
                          <input 
                            type="number" step="any"
                            placeholder={`e.g. ${catConfig.defaultUnit === 'inch' ? '10' : '250'}`}
                            value={row.width}
                            onChange={(e) => handleSizeRowChange(row.id, 'width', e.target.value)}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>

                        {/* Height (if 3D) */}
                        {catConfig.dimCount === 3 && (
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              {catConfig.labels[2]}
                            </label>
                            <input 
                              type="number" step="any"
                              placeholder={`e.g. ${catConfig.defaultUnit === 'inch' ? '8.5' : '150'}`}
                              value={row.height}
                              onChange={(e) => handleSizeRowChange(row.id, 'height', e.target.value)}
                              className="form-control" style={{ width: '100%' }} required
                            />
                          </div>
                        )}

                        {/* Unit Selector */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Unit
                          </label>
                          <select
                            value={row.unit}
                            onChange={(e) => handleSizeRowChange(row.id, 'unit', e.target.value)}
                            className="form-control" style={{ width: '100%' }}
                          >
                            <option value="mm">mm</option>
                            <option value="inch">inch</option>
                          </select>
                        </div>

                        {/* Remove Row Button */}
                        <div style={{ paddingTop: '18px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeRow(row.id)}
                            disabled={sizeRows.length === 1}
                            style={{
                              padding: '8px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              color: sizeRows.length === 1 ? 'var(--text-muted)' : '#ef4444',
                              cursor: sizeRows.length === 1 ? 'not-allowed' : 'pointer'
                            }}
                            title="Remove Size Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>

          {/* Submit Action Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveMode(null)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAdd}
              className="btn-primary"
              style={{
                padding: '12px 32px',
                fontSize: '1rem',
                fontWeight: 700,
                backgroundColor: '#10b981',
                borderColor: '#10b981'
              }}
            >
              {submittingAdd ? 'Saving to Supabase...' : 'Save Company & Sizes to Supabase'}
            </button>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* SCOPED / GLOBAL EDIT COMPANY NAME MODAL                              */}
      {/* ===================================================================== */}
      {showRenameModal && selectedCompObj && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                  Edit Company Name ({selectedCompObj.name})
                </h3>
              </div>
              <button onClick={() => setShowRenameModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmRenameCompany} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  New Company Name
                </label>
                <input 
                  type="text"
                  value={editCompanyNameInput}
                  onChange={(e) => setEditCompanyNameInput(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', fontSize: '1rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Edit Scope Target
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
                    borderRadius: 'var(--radius-md)', border: editScope === 'scoped' ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                    backgroundColor: editScope === 'scoped' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="editScope" 
                      value="scoped"
                      checked={editScope === 'scoped'}
                      onChange={() => setEditScope('scoped')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        Edit for "{CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}" Only
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Re-associates size records for {CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name} under "{editCompanyNameInput}". Keeps other calculations under "{selectedCompObj.name}".
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
                    borderRadius: 'var(--radius-md)', border: editScope === 'global' ? '2px solid var(--color-accent)' : '1px solid var(--border-color)',
                    backgroundColor: editScope === 'global' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="editScope" 
                      value="global"
                      checked={editScope === 'global'}
                      onChange={() => setEditScope('global')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        Edit for ALL Calculations (Global Rename)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Renames company globally across all calculations in Supabase database.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renamingCompany}
                  className="btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {renamingCompany ? 'Saving...' : 'Confirm Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SCOPED / GLOBAL DELETE COMPANY MODAL                                 */}
      {/* ===================================================================== */}
      {showDeleteCompanyModal && selectedCompObj && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px'
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '520px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={18} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: '#ef4444' }}>
                  Delete Company ({selectedCompObj.name})
                </h3>
              </div>
              <button onClick={() => setShowDeleteCompanyModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteCompany} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                Select whether you want to remove company <strong>"{selectedCompObj.name}"</strong> from this specific calculation category only or purge it completely.
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Delete Scope Target
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
                    borderRadius: 'var(--radius-md)', border: deleteScope === 'scoped' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    backgroundColor: deleteScope === 'scoped' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="deleteScope" 
                      value="scoped"
                      checked={deleteScope === 'scoped'}
                      onChange={() => setDeleteScope('scoped')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        Delete for "{CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}" Only
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Removes size records for {CALC_CATEGORIES.find(c => c.id === selectedCalcCategory)?.name}. "{selectedCompObj.name}" remains active in other calculation categories.
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
                    borderRadius: 'var(--radius-md)', border: deleteScope === 'global' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    backgroundColor: deleteScope === 'global' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="deleteScope" 
                      value="global"
                      checked={deleteScope === 'global'}
                      onChange={() => setDeleteScope('global')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.92rem' }}>
                        Delete for ALL Calculations (Global Permanent Delete)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Completely deletes company "{selectedCompObj.name}" and all its size records across all calculations from Supabase.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteCompanyModal(false)}
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingCompany}
                  style={{ padding: '10px 24px', borderRadius: 'var(--radius-md)', backgroundColor: '#ef4444', border: '1px solid #ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {deletingCompany ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EDIT SIZE MODAL (Supports Standard Sizes and Partition Pairs)          */}
      {/* ===================================================================== */}
      {editingSizeGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: selectedCalcCategory === 'partition' && editingSizeGroup.type === 'paired' ? '650px' : '500px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                  {selectedCalcCategory === 'partition' ? 'Edit Partition Details & Slots' : 'Edit Size Record'}
                </h3>
              </div>
              <button 
                onClick={() => setEditingSizeGroup(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSizeRecord} style={{ padding: '24px' }}>
              {selectedCalcCategory === 'partition' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {editingSizeGroup.type === 'paired' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* Slot 1 Box */}
                      <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-accent)' }}>
                          Slot 1 Partition
                        </h4>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Length</label>
                          <input 
                            type="number" step="any" value={editPartitionForm.slot1Length}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Length: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Height</label>
                          <input 
                            type="number" step="any" value={editPartitionForm.slot1Height}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Height: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Slot Count</label>
                          <input 
                            type="number" min="1" value={editPartitionForm.slot1Count}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Count: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                      </div>

                      {/* Slot 2 Box */}
                      <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-accent)' }}>
                          Slot 2 Partition
                        </h4>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Length</label>
                          <input 
                            type="number" step="any" value={editPartitionForm.slot2Length}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot2Length: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Height</label>
                          <input 
                            type="number" step="any" value={editPartitionForm.slot2Height}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot2Height: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Slot Count</label>
                          <input 
                            type="number" min="1" value={editPartitionForm.slot2Count}
                            onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot2Count: e.target.value })}
                            className="form-control" style={{ width: '100%' }} required
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Length</label>
                        <input 
                          type="number" step="any" value={editPartitionForm.slot1Length}
                          onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Length: e.target.value })}
                          className="form-control" style={{ width: '100%' }} required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Height</label>
                        <input 
                          type="number" step="any" value={editPartitionForm.slot1Height}
                          onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Height: e.target.value })}
                          className="form-control" style={{ width: '100%' }} required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Slot Count</label>
                        <input 
                          type="number" min="1" value={editPartitionForm.slot1Count}
                          onChange={(e) => setEditPartitionForm({ ...editPartitionForm, slot1Count: e.target.value })}
                          className="form-control" style={{ width: '100%' }} required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Dimension Unit
                    </label>
                    <select
                      value={editPartitionForm.unit}
                      onChange={(e) => setEditPartitionForm({ ...editPartitionForm, unit: e.target.value })}
                      className="form-control" style={{ width: '100%' }}
                    >
                      <option value="mm">mm</option>
                      <option value="inch">inch</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Length
                    </label>
                    <input 
                      type="number" step="any"
                      value={editSizeForm.length}
                      onChange={(e) => setEditSizeForm({ ...editSizeForm, length: e.target.value })}
                      className="form-control" style={{ width: '100%' }} required
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Width
                    </label>
                    <input 
                      type="number" step="any"
                      value={editSizeForm.width}
                      onChange={(e) => setEditSizeForm({ ...editSizeForm, width: e.target.value })}
                      className="form-control" style={{ width: '100%' }} required
                    />
                  </div>

                  {(CALC_CATEGORIES.find(c => c.id === selectedCalcCategory) || {}).dimCount === 3 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Height
                      </label>
                      <input 
                        type="number" step="any"
                        value={editSizeForm.height}
                        onChange={(e) => setEditSizeForm({ ...editSizeForm, height: e.target.value })}
                        className="form-control" style={{ width: '100%' }} required
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Dimension Unit
                    </label>
                    <select
                      value={editSizeForm.unit}
                      onChange={(e) => setEditSizeForm({ ...editSizeForm, unit: e.target.value })}
                      className="form-control" style={{ width: '100%' }}
                    >
                      <option value="mm">mm</option>
                      <option value="inch">inch</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSizeGroup(null)}
                  style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSize}
                  className="btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  {updatingSize ? 'Saving...' : 'Save Size Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
