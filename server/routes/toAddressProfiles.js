const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const adminCheck = require('../middleware/adminCheck');
const asyncHandler = require('../middleware/asyncHandler');

// Check Supabase status helper
const isSupabaseConfigured = () => {
  return process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
    process.env.SUPABASE_KEY &&
    !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');
};

// In-Memory Fallback Store (used when Supabase is offline/unconfigured)
let memoryToAddressProfiles = [
  {
    id: 'prof-default-1',
    user_id: 'admin',
    keyword: 'Santhosh',
    to_address: 'M/s. MYCO INDUSTRY,\n472-C, Kamarajar Road,\nPeelamedu,\nCoimbatore - 641004',
    dear_sir: 'Dear Sir,',
    kind_attn: 'Kind Attn – Mr. Vairamuthu - reg',
    subject: 'Quotation for Corrugated boxes – Reg.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Helper to check if error is table missing (PGRST205 / schema cache)
function isTableMissingError(error) {
  if (!error) return false;
  return error.code === 'PGRST205' || (error.message && error.message.includes('in the schema cache'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/to-address-profiles — List All Address Profiles (Accessible by ALL users)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  if (!isSupabaseConfigured()) {
    const sorted = [...memoryToAddressProfiles].sort((a, b) => a.keyword.localeCompare(b.keyword));
    return res.json(sorted);
  }

  // 1. Try primary table `to_address_profiles`
  const { data, error } = await supabase
    .from('to_address_profiles')
    .select('*')
    .order('keyword', { ascending: true });

  if (!error) {
    return res.json(data || []);
  }

  // 2. Adaptive DB Fallback: if table is missing, query `quotations` table tagged records
  if (isTableMissingError(error)) {
    const { data: qData, error: qError } = await supabase
      .from('quotations')
      .select('*')
      .eq('company_name', '[TO_ADDRESS_PROFILE]')
      .order('created_at', { ascending: true });

    if (qError) {
      console.error('Supabase query error:', qError);
      return res.status(500).json({ message: 'Database error fetching address profiles.', error: qError.message });
    }

    const profiles = (qData || []).map(row => {
      let parsed = {};
      try { parsed = JSON.parse(row.pdf_base64 || '{}'); } catch (e) { }
      return {
        id: row.id,
        user_id: row.user_id,
        keyword: parsed.keyword || row.quotation_number || 'Profile',
        to_address: parsed.to_address || row.storage_path || '',
        dear_sir: parsed.dear_sir || 'Dear Sir,',
        kind_attn: parsed.kind_attn || '',
        subject: parsed.subject || 'Quotation for Corrugated boxes – Reg.',
        created_at: row.created_at,
        updated_at: row.created_at
      };
    }).sort((a, b) => a.keyword.localeCompare(b.keyword));

    return res.json(profiles);
  }

  console.error('Supabase fetch to_address_profiles error:', error);
  res.status(500).json({ message: 'Error fetching to-address profiles from database.', error: error.message });
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/to-address-profiles — Create New Profile (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, adminCheck, asyncHandler(async (req, res) => {
  const { keyword, to_address, dear_sir, kind_attn, subject } = req.body;

  if (!keyword || !keyword.trim() || !to_address || !to_address.trim()) {
    return res.status(400).json({ message: 'Keyword and To Address are required.' });
  }

  const cleanKeyword = keyword.trim();
  const cleanToAddress = to_address.trim();
  const cleanDearSir = dear_sir && dear_sir.trim() ? dear_sir.trim() : 'Dear Sir,';
  const cleanKindAttn = kind_attn ? kind_attn.trim() : '';
  const cleanSubject = subject && subject.trim() ? subject.trim() : 'Quotation for Corrugated boxes – Reg.';

  if (!isSupabaseConfigured()) {
    const isDup = memoryToAddressProfiles.some(p => p.keyword.toLowerCase() === cleanKeyword.toLowerCase());
    if (isDup) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }
    const newProfile = {
      id: `prof-${Date.now()}`,
      user_id: req.user?.userId || req.user?.id || 'admin',
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryToAddressProfiles.push(newProfile);
    return res.status(201).json({ message: 'To Address profile created successfully.', profile: newProfile });
  }

  // Try primary table first in Supabase
  const { data: existing, error: checkError } = await supabase
    .from('to_address_profiles')
    .select('id, keyword')
    .ilike('keyword', cleanKeyword);

  if (!checkError) {
    if (existing && existing.some(item => item.keyword.trim().toLowerCase() === cleanKeyword.toLowerCase())) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }

    const newProfile = {
      user_id: req.user?.userId || req.user?.id || null,
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('to_address_profiles')
      .insert([newProfile])
      .select()
      .single();

    if (!error && data) {
      return res.status(201).json({ message: 'To Address profile created successfully.', profile: data });
    }
    if (error && (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate'))) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }
  }

  // Adaptive DB Fallback: if `to_address_profiles` table is missing
  if (checkError && isTableMissingError(checkError)) {
    const { data: qExisting } = await supabase
      .from('quotations')
      .select('*')
      .eq('company_name', '[TO_ADDRESS_PROFILE]');

    const isDup = (qExisting || []).some(row => {
      try {
        const p = JSON.parse(row.pdf_base64 || '{}');
        return p.keyword && p.keyword.trim().toLowerCase() === cleanKeyword.toLowerCase();
      } catch (e) { return false; }
    });

    if (isDup) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }

    const profileData = {
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject
    };

    const qRecord = {
      user_id: req.user?.userId || req.user?.id || 'admin-system',
      company_name: '[TO_ADDRESS_PROFILE]',
      pdf_file_name: `[ToAddressProfile]_${cleanKeyword}`,
      storage_path: cleanToAddress,
      quotation_number: cleanKeyword,
      pdf_base64: JSON.stringify(profileData),
      created_at: new Date().toISOString()
    };

    const { data: savedQ, error: saveErr } = await supabase
      .from('quotations')
      .insert([qRecord])
      .select()
      .single();

    if (saveErr) {
      console.error('Insert fallback error:', saveErr);
      return res.status(500).json({ message: 'Database error saving address profile.', error: saveErr.message });
    }

    const resProfile = {
      id: savedQ.id,
      user_id: savedQ.user_id,
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      created_at: savedQ.created_at,
      updated_at: savedQ.created_at
    };

    return res.status(201).json({ message: 'To Address profile created successfully.', profile: resProfile });
  }

  res.status(500).json({ message: 'Database error saving address profile.', error: checkError?.message });
}));

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUT /api/to-address-profiles/:id — Update Existing Profile (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, adminCheck, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { keyword, to_address, dear_sir, kind_attn, subject } = req.body;

  if (!keyword || !keyword.trim() || !to_address || !to_address.trim()) {
    return res.status(400).json({ message: 'Keyword and To Address are required.' });
  }

  const cleanKeyword = keyword.trim();
  const cleanToAddress = to_address.trim();
  const cleanDearSir = dear_sir && dear_sir.trim() ? dear_sir.trim() : 'Dear Sir,';
  const cleanKindAttn = kind_attn ? kind_attn.trim() : '';
  const cleanSubject = subject && subject.trim() ? subject.trim() : 'Quotation for Corrugated boxes – Reg.';

  if (!isSupabaseConfigured()) {
    const idx = memoryToAddressProfiles.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    const isDup = memoryToAddressProfiles.some(p => p.id !== id && p.keyword.toLowerCase() === cleanKeyword.toLowerCase());
    if (isDup) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }
    memoryToAddressProfiles[idx] = {
      ...memoryToAddressProfiles[idx],
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      updated_at: new Date().toISOString()
    };
    return res.json({ message: 'To Address profile updated successfully.', profile: memoryToAddressProfiles[idx] });
  }

  // Try primary table in Supabase
  const { data: existing, error: checkError } = await supabase
    .from('to_address_profiles')
    .select('id, keyword')
    .ilike('keyword', cleanKeyword);

  if (!checkError) {
    if (existing && existing.some(item => item.id !== id && item.keyword.trim().toLowerCase() === cleanKeyword.toLowerCase())) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }

    const updatePayload = {
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('to_address_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return res.json({ message: 'To Address profile updated successfully.', profile: data });
    }
  }

  // Adaptive DB Fallback
  if (checkError && isTableMissingError(checkError)) {
    const { data: qExisting } = await supabase
      .from('quotations')
      .select('*')
      .eq('company_name', '[TO_ADDRESS_PROFILE]');

    const isDup = (qExisting || []).some(row => {
      if (row.id === id) return false;
      try {
        const p = JSON.parse(row.pdf_base64 || '{}');
        return p.keyword && p.keyword.trim().toLowerCase() === cleanKeyword.toLowerCase();
      } catch (e) { return false; }
    });

    if (isDup) {
      return res.status(400).json({ message: `Profile with Keyword '${cleanKeyword}' already exists.` });
    }

    const profileData = {
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject
    };

    const qUpdate = {
      pdf_file_name: `[ToAddressProfile]_${cleanKeyword}`,
      storage_path: cleanToAddress,
      quotation_number: cleanKeyword,
      pdf_base64: JSON.stringify(profileData)
    };

    const { data: updatedQ, error: updateErr } = await supabase
      .from('quotations')
      .update(qUpdate)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ message: 'Database error updating address profile.', error: updateErr.message });
    }

    const resProfile = {
      id: updatedQ.id,
      user_id: updatedQ.user_id,
      keyword: cleanKeyword,
      to_address: cleanToAddress,
      dear_sir: cleanDearSir,
      kind_attn: cleanKindAttn,
      subject: cleanSubject,
      created_at: updatedQ.created_at,
      updated_at: new Date().toISOString()
    };

    return res.json({ message: 'To Address profile updated successfully.', profile: resProfile });
  }

  res.status(500).json({ message: 'Database error updating address profile.', error: checkError?.message });
}));

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE /api/to-address-profiles/:id — Delete Profile (Admin Only)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, adminCheck, asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isSupabaseConfigured()) {
    memoryToAddressProfiles = memoryToAddressProfiles.filter(p => p.id !== id);
    return res.json({ message: 'To Address profile deleted successfully.' });
  }

  const { error } = await supabase
    .from('to_address_profiles')
    .delete()
    .eq('id', id);

  if (!error) {
    return res.json({ message: 'To Address profile deleted successfully.' });
  }

  if (isTableMissingError(error)) {
    const { error: qErr } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id);

    if (qErr) {
      return res.status(500).json({ message: 'Database error deleting address profile.', error: qErr.message });
    }
    return res.json({ message: 'To Address profile deleted successfully.' });
  }

  res.status(500).json({ message: 'Database error deleting address profile.', error: error.message });
}));

const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper function to purge all user address profiles
async function purgeUserDataFromAddressProfiles(userId, username) {
  if (isSupabaseConfigured()) {
    try {
      const validUserId = isUuid(userId) ? userId : null;
      if (validUserId) {
        await supabase
          .from('to_address_profiles')
          .delete()
          .eq('user_id', validUserId);
      }
    } catch (err) {
      console.error('Error purging address profiles from Supabase:', err);
    }
  }
  memoryToAddressProfiles = memoryToAddressProfiles.filter(p => p.user_id !== userId && p.user_id !== username);
}

router.purgeUserDataFromAddressProfiles = purgeUserDataFromAddressProfiles;
module.exports = router;
module.exports.purgeUserDataFromAddressProfiles = purgeUserDataFromAddressProfiles;
