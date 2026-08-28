const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const adminCheck = require('../middleware/adminCheck');

// In-memory fallback data stores
let MOCK_COMPANIES = [
  { id: 'mock-comp-muthukumar', name: 'Muthukumar' }
];

let MOCK_SIZES = [
  {
    id: 'mock-size-muthukumar-1',
    company_id: 'mock-comp-muthukumar',
    label: '12 × 12 × 23¾ (inch)',
    length_inches: 12.0,
    width_inches: 12.0,
    height_inches: 23.75,
    unit: 'inch',
    calc_type: 'box'
  },
  {
    id: 'mock-size-muthukumar-2',
    company_id: 'mock-comp-muthukumar',
    label: '25 × 11¼ × 12½ (inch)',
    length_inches: 25.0,
    width_inches: 11.25,
    height_inches: 12.5,
    unit: 'inch',
    calc_type: 'box'
  }
];

const isSupabaseConfigured = () => {
  return process.env.SUPABASE_URL && 
         !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
         process.env.SUPABASE_KEY && 
         !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');
};

// Helper: Normalize calculation types to consistent canonical identifiers
const normalizeCalcType = (type) => {
  if (!type || typeof type !== 'string') return 'box';
  const t = type.toLowerCase().trim();
  if (t === 'universal' || t === 'universal_type') return 'universal';
  if (t === 'top_side_tray' || t === 'top_side_tray_box' || t === 'top_side_tray_type' || t === 'top-side-tray' || t === 'u_box' || t === 'ubox') return 'top_side_tray';
  if (t === 'full_closing' || t === 'fc_box' || t === 'full_closing_box') return 'full_closing';
  if (t === 'sleave' || t === 'sleave_box' || t === 'tray_box') return 'sleave';
  if (t === 'coller' || t === 'coller_box' || t === 'collerbox') return 'coller_box';
  if (t === 'box' || t === 'standard_box' || t === '5_ply_box') return 'box';
  if (t === 'pad') return 'pad';
  if (t === 'partition') return 'partition';
  if (t === 'tray') return 'tray';
  return t;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/companies - Get list of companies
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { calc_type } = req.query;

  if (!isSupabaseConfigured()) {
    let mockList = MOCK_COMPANIES.map(c => {
      const compSizes = MOCK_SIZES.filter(s => s.company_id === c.id);
      const types = new Set(compSizes.map(s => normalizeCalcType(s.calc_type || 'box')));
      return {
        ...c,
        available_types: Array.from(types)
      };
    });

    if (calc_type) {
      const targetNorm = normalizeCalcType(calc_type);
      mockList = mockList.filter(c => c.available_types.includes(targetNorm) || c.available_types.includes('all'));
    }

    return res.json(mockList);
  }

  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        created_at,
        company_sizes (calc_type)
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    let formatted = companies.map(c => {
      const rawTypes = (c.company_sizes || []).map(s => s.calc_type).filter(Boolean);
      const normalizedTypes = new Set(rawTypes.map(t => normalizeCalcType(t)));
      const typeArr = Array.from(normalizedTypes);
      return {
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        available_types: typeArr
      };
    });

    if (calc_type) {
      const targetNorm = normalizeCalcType(calc_type);
      formatted = formatted.filter(c => c.available_types.includes(targetNorm) || c.available_types.includes('all'));
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: error.message || 'Error fetching companies' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/companies/:id/sizes - Get list of sizes for a company
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/sizes', auth, async (req, res) => {
  const companyId = req.params.id;
  const { calc_type } = req.query;

  if (!isSupabaseConfigured()) {
    let sizes = MOCK_SIZES.filter(s => s.company_id === companyId);
    if (calc_type) {
      const targetNorm = normalizeCalcType(calc_type);
      sizes = sizes.filter(s => {
        const t = normalizeCalcType(s.calc_type || 'all');
        return t === 'all' || t === targetNorm;
      });
    }
    return res.json(sizes);
  }

  try {
    const { data: sizes, error } = await supabase
      .from('company_sizes')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    let filtered = sizes || [];
    if (calc_type && filtered.length > 0) {
      const targetNorm = normalizeCalcType(calc_type);
      filtered = filtered.filter(s => {
        const t = normalizeCalcType(s.calc_type || 'all');
        return t === 'all' || t === targetNorm;
      });
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching company sizes:', error);
    res.status(500).json({ message: error.message || 'Error fetching company sizes' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/companies - Create New Company or Get Existing (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, adminCheck, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  const cleanName = name.trim();

  if (!isSupabaseConfigured()) {
    let existing = MOCK_COMPANIES.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!existing) {
      existing = {
        id: `mock-comp-${Date.now()}`,
        name: cleanName,
        created_at: new Date().toISOString()
      };
      MOCK_COMPANIES.push(existing);
    }
    return res.status(201).json(existing);
  }

  try {
    // Check if company already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      return res.status(200).json(existing);
    }

    const { data: created, error } = await supabase
      .from('companies')
      .insert({ name: cleanName })
      .select('id, name, created_at');

    if (error) throw error;
    if (!created || created.length === 0) {
      return res.status(400).json({ message: 'Error creating company in Supabase. Check RLS policies on table "companies".' });
    }

    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ message: error.message || 'Error creating company' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/companies/:id/sizes - Add Sizes to Company (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/sizes', auth, adminCheck, async (req, res) => {
  const companyId = req.params.id;
  const { sizes } = req.body;

  if (!Array.isArray(sizes) || sizes.length === 0) {
    return res.status(400).json({ message: 'Sizes array is required and cannot be empty.' });
  }

  if (!isSupabaseConfigured()) {
    const createdSizes = sizes.map((s, idx) => {
      const newSize = {
        id: `mock-size-${Date.now()}-${idx}`,
        company_id: companyId,
        label: s.label || 'Default Size',
        length_inches: Number(s.length_inches || 0),
        width_inches: Number(s.width_inches || 0),
        height_inches: Number(s.height_inches || 0),
        unit: s.unit || 'mm',
        calc_type: s.calc_type || 'box',
        slot_count: s.slot_count || null,
        pair_group: s.pair_group || null,
        created_at: new Date().toISOString()
      };
      MOCK_SIZES.push(newSize);
      return newSize;
    });
    return res.status(201).json(createdSizes);
  }

  try {
    const sizeRecords = sizes.map(s => ({
      company_id: companyId,
      label: s.label || 'Default Size',
      length_inches: Number(s.length_inches || 0),
      width_inches: Number(s.width_inches || 0),
      height_inches: Number(s.height_inches || 0),
      unit: s.unit || 'mm',
      calc_type: normalizeCalcType(s.calc_type || 'box'),
      slot_count: s.slot_count || null,
      pair_group: s.pair_group || null
    }));

    const { data: created, error } = await supabase
      .from('company_sizes')
      .insert(sizeRecords)
      .select('*');

    if (error) throw error;
    if (!created || created.length === 0) {
      return res.status(400).json({ message: 'Error adding company sizes. Check RLS policies on table "company_sizes".' });
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding company sizes:', error);
    res.status(500).json({ message: error.message || 'Error adding company sizes' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUT /api/companies/sizes/:sizeId - Edit Single Company Size (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/sizes/:sizeId', auth, adminCheck, async (req, res) => {
  const { sizeId } = req.params;
  const { label, length_inches, width_inches, height_inches, unit, calc_type, slot_count, pair_group } = req.body;

  if (!isSupabaseConfigured()) {
    const idx = MOCK_SIZES.findIndex(s => s.id === sizeId);
    if (idx === -1) return res.status(404).json({ message: 'Size record not found' });
    MOCK_SIZES[idx] = {
      ...MOCK_SIZES[idx],
      label: label || MOCK_SIZES[idx].label,
      length_inches: length_inches !== undefined ? Number(length_inches) : MOCK_SIZES[idx].length_inches,
      width_inches: width_inches !== undefined ? Number(width_inches) : MOCK_SIZES[idx].width_inches,
      height_inches: height_inches !== undefined ? Number(height_inches) : MOCK_SIZES[idx].height_inches,
      unit: unit || MOCK_SIZES[idx].unit,
      calc_type: calc_type || MOCK_SIZES[idx].calc_type,
      slot_count: slot_count !== undefined ? slot_count : MOCK_SIZES[idx].slot_count,
      pair_group: pair_group !== undefined ? pair_group : MOCK_SIZES[idx].pair_group
    };
    return res.json(MOCK_SIZES[idx]);
  }

  try {
    const updatePayload = {
      label,
      length_inches: Number(length_inches || 0),
      width_inches: Number(width_inches || 0),
      height_inches: Number(height_inches || 0),
      unit: unit || 'mm',
      calc_type: normalizeCalcType(calc_type || 'box'),
      slot_count: slot_count || null,
      pair_group: pair_group || null
    };

    const { data: updated, error } = await supabase
      .from('company_sizes')
      .update(updatePayload)
      .eq('id', sizeId)
      .select('*');

    if (error) throw error;
    if (!updated || updated.length === 0) {
      return res.status(400).json({ message: 'Could not update size in Supabase. Check RLS policies on table "company_sizes".' });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating company size:', error);
    res.status(500).json({ message: error.message || 'Error updating company size' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DELETE /api/companies/sizes/:sizeId - Delete Single Size (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/sizes/:sizeId', auth, adminCheck, async (req, res) => {
  const { sizeId } = req.params;

  if (!isSupabaseConfigured()) {
    MOCK_SIZES = MOCK_SIZES.filter(s => s.id !== sizeId);
    return res.json({ success: true, message: 'Size deleted successfully' });
  }

  try {
    const { error } = await supabase
      .from('company_sizes')
      .delete()
      .eq('id', sizeId);

    if (error) throw error;
    res.json({ success: true, message: 'Company size deleted successfully' });
  } catch (error) {
    console.error('Error deleting company size:', error);
    res.status(500).json({ message: error.message || 'Error deleting company size' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DELETE /api/companies/:id/calc_type/:calc_type — Scoped Delete for Calculation
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/calc_type/:calc_type', auth, adminCheck, async (req, res) => {
  const { id: companyId, calc_type } = req.params;

  if (!isSupabaseConfigured()) {
    MOCK_SIZES = MOCK_SIZES.filter(s => !(s.company_id === companyId && s.calc_type === calc_type));
    return res.json({ success: true, message: `Company size records for "${calc_type}" deleted successfully.` });
  }

  try {
    const { error } = await supabase
      .from('company_sizes')
      .delete()
      .eq('company_id', companyId)
      .eq('calc_type', calc_type);

    if (error) throw error;
    res.json({ success: true, message: `Company deleted for calculation "${calc_type}" successfully.` });
  } catch (error) {
    console.error('Error in scoped company delete:', error);
    res.status(500).json({ message: error.message || 'Error deleting company for calculation type.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PUT /api/companies/:id/calc_type/:calc_type — Scoped Edit Name for Calculation
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/calc_type/:calc_type', auth, adminCheck, async (req, res) => {
  const { id: companyId, calc_type } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'New company name is required' });
  }

  const cleanName = name.trim();

  if (!isSupabaseConfigured()) {
    let targetComp = MOCK_COMPANIES.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
    if (!targetComp) {
      targetComp = { id: `mock-comp-${Date.now()}`, name: cleanName, created_at: new Date().toISOString() };
      MOCK_COMPANIES.push(targetComp);
    }
    MOCK_SIZES = MOCK_SIZES.map(s => {
      if (s.company_id === companyId && s.calc_type === calc_type) {
        return { ...s, company_id: targetComp.id };
      }
      return s;
    });
    return res.json(targetComp);
  }

  try {
    // Step 1: Find or Create company with cleanName
    let targetCompId = '';
    const { data: existingComp } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingComp) {
      targetCompId = existingComp.id;
    } else {
      const { data: newComp, error: compErr } = await supabase
        .from('companies')
        .insert({ name: cleanName })
        .select('id, name')
        .single();
      if (compErr) throw compErr;
      targetCompId = newComp.id;
    }

    // Step 2: Reassign sizes for calc_type to targetCompId
    const { error: updateErr } = await supabase
      .from('company_sizes')
      .update({ company_id: targetCompId })
      .eq('company_id', companyId)
      .eq('calc_type', calc_type);

    if (updateErr) throw updateErr;

    res.json({ id: targetCompId, name: cleanName });
  } catch (error) {
    console.error('Error in scoped company rename:', error);
    res.status(500).json({ message: error.message || 'Error renaming company for calculation type.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. PUT /api/companies/:id - Global Edit Company Name (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, adminCheck, async (req, res) => {
  const companyId = req.params.id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  const cleanName = name.trim();

  if (!isSupabaseConfigured()) {
    const comp = MOCK_COMPANIES.find(c => c.id === companyId);
    if (!comp) return res.status(404).json({ message: 'Company not found' });
    comp.name = cleanName;
    return res.json(comp);
  }

  try {
    const { data: updated, error } = await supabase
      .from('companies')
      .update({ name: cleanName })
      .eq('id', companyId)
      .select('*');

    if (error) throw error;
    if (!updated || updated.length === 0) {
      return res.status(400).json({ message: 'Could not update company in Supabase. Check RLS policies on table "companies".' });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: error.message || 'Error updating company' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. DELETE /api/companies/:id - Global Delete Company & Cascade Delete Sizes (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, adminCheck, async (req, res) => {
  const companyId = req.params.id;

  if (!isSupabaseConfigured()) {
    MOCK_COMPANIES = MOCK_COMPANIES.filter(c => c.id !== companyId);
    MOCK_SIZES = MOCK_SIZES.filter(s => s.company_id !== companyId);
    return res.json({ success: true, message: 'Company deleted successfully' });
  }

  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: error.message || 'Error deleting company' });
  }
});

module.exports = router;
