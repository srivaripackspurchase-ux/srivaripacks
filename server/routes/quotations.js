const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Local PDF uploads directory as fail-safe storage
const UPLOADS_DIR = path.join(__dirname, '../uploads/quotations');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Notice: Local uploads folder creation skipped (serverless environment):', e.message);
}

// In-memory fallback store when Supabase is not configured
let memoryQuotations = [];

const isSupabaseConfigured = () => {
  return process.env.SUPABASE_URL && 
         !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
         process.env.SUPABASE_KEY && 
         !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');
};

// Helper: Extract authenticated user ID from JWT token
const getUserId = (req) => {
  return req.user?.userId || req.user?.id;
};

// ==========================================
// 1. SAVE/STORE GENERATED QUOTATION PDF
// ==========================================
router.post('/', auth, asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required: User ID missing from session.' });
  }

  const { company_name, file_id, quotation_number, pdf_file_name, pdf_base64 } = req.body;

  if (!company_name || !pdf_file_name || !pdf_base64) {
    return res.status(400).json({ message: 'company_name, pdf_file_name, and pdf_base64 are required.' });
  }

  const cleanFileName = pdf_file_name.endsWith('.pdf') ? pdf_file_name : `${pdf_file_name}.pdf`;
  const storagePath = `quotations/${userId}/${cleanFileName}`;
  const pdfBuffer = Buffer.from(pdf_base64, 'base64');

  // 1. Always save a copy to local server disk (100% fail-safe backup)
  try {
    const userLocalDir = path.join(UPLOADS_DIR, String(userId));
    if (!fs.existsSync(userLocalDir)) {
      fs.mkdirSync(userLocalDir, { recursive: true });
    }
    fs.writeFileSync(path.join(userLocalDir, cleanFileName), pdfBuffer);
  } catch (fsErr) {
    console.warn('Local disk write notice:', fsErr.message);
  }

  if (isSupabaseConfigured()) {
    try {
      // 2. Try uploading to Supabase Storage bucket 'quotations'
      const { error: uploadError } = await supabase
        .storage
        .from('quotations')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.warn('Supabase storage upload notice:', uploadError.message);
      }
    } catch (stgErr) {
      console.warn('Storage upload error caught:', stgErr.message);
    }

    // 3. Insert record into Supabase 'quotations' table (Lean payload for instant DB write)
    const recordPayload = {
      user_id: userId,
      file_id: file_id || null,
      quotation_number: quotation_number || null,
      company_name: String(company_name).trim(),
      pdf_file_name: cleanFileName,
      storage_path: storagePath
    };

    const { data: newQuotation, error: dbError } = await supabase
      .from('quotations')
      .insert([recordPayload])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase DB Insert Error for quotation:', dbError);
      return res.status(500).json({ 
        message: 'Failed to save quotation record to database.',
        error: dbError.message 
      });
    }

    return res.status(201).json({
      message: 'Quotation saved successfully.',
      quotation: newQuotation
    });
  }

  // Fallback for In-Memory Mode
  const newQuotation = {
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    file_id: file_id || null,
    quotation_number: quotation_number || null,
    company_name: String(company_name).trim(),
    pdf_file_name: cleanFileName,
    storage_path: storagePath,
    pdf_base64: pdf_base64,
    created_at: new Date().toISOString()
  };

  memoryQuotations.unshift(newQuotation);

  res.status(201).json({
    message: 'Quotation saved in memory successfully.',
    quotation: newQuotation
  });
}));

// ==========================================
// 2. GET USER-SPECIFIC QUOTATIONS LIST
// ==========================================
router.get('/', auth, asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required: User ID missing from session.' });
  }

  if (isSupabaseConfigured()) {
    const { data: userQuotations, error } = await supabase
      .from('quotations')
      .select('id, user_id, file_id, quotation_number, company_name, pdf_file_name, storage_path, created_at')
      .eq('user_id', userId)
      .neq('company_name', '[TO_ADDRESS_PROFILE]')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotations:', error);
      return res.status(500).json({ message: 'Failed to fetch quotations.', error: error.message });
    }

    return res.json({
      success: true,
      quotations: userQuotations || []
    });
  }

  const userQuotations = memoryQuotations
    .filter(q => q.user_id === userId)
    .map(({ pdf_base64, ...meta }) => meta); // Exclude large base64 payload from list query

  res.json({
    success: true,
    quotations: userQuotations
  });
}));

// ==========================================
// 3. DOWNLOAD SPECIFIC QUOTATION PDF BY ID
// ==========================================
router.get('/download/:id', auth, asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  let quotationRecord = null;

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // STRICT USER OWNERSHIP ENFORCEMENT
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ message: 'Quotation not found or access denied.' });
    }
    quotationRecord = data;
  } else {
    quotationRecord = memoryQuotations.find(q => q.id === id && q.user_id === userId);
    if (!quotationRecord) {
      return res.status(404).json({ message: 'Quotation not found or access denied.' });
    }
  }

  // 1. Check local server disk storage first (Instant & Fail-safe)
  const localFilePath = path.join(UPLOADS_DIR, String(userId), quotationRecord.pdf_file_name);
  if (fs.existsSync(localFilePath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotationRecord.pdf_file_name}"`);
    return res.sendFile(localFilePath);
  }

  // 2. If base64 payload exists on record, serve directly
  if (quotationRecord.pdf_base64) {
    const fileBuffer = Buffer.from(quotationRecord.pdf_base64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quotationRecord.pdf_file_name}"`);
    return res.send(fileBuffer);
  }

  // 3. Otherwise download from Supabase Storage
  if (isSupabaseConfigured() && quotationRecord.storage_path) {
    const { data: blob, error: downloadErr } = await supabase
      .storage
      .from('quotations')
      .download(quotationRecord.storage_path);

    if (!downloadErr && blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${quotationRecord.pdf_file_name}"`);
      return res.send(fileBuffer);
    }
  }

  res.status(404).json({ message: 'PDF file for this quotation was not found. Please click "Generate Quotation" again from Customers to create a fresh copy.' });
}));

// ==========================================
// 4. DELETE OWNED QUOTATION
// ==========================================
router.delete('/:id', auth, asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (isSupabaseConfigured()) {
    // 1. Verify ownership before deletion
    const { data: record, error: findErr } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (findErr || !record) {
      return res.status(404).json({ message: 'Quotation not found or access denied.' });
    }

    // 2. Delete storage file if path exists
    if (record.storage_path) {
      await supabase.storage.from('quotations').remove([record.storage_path]);
    }

    // 3. Delete database record
    const { error: deleteErr } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteErr) {
      return res.status(500).json({ message: 'Failed to delete quotation.', error: deleteErr.message });
    }

    return res.json({ message: 'Quotation deleted successfully.' });
  }

  // Memory mode fallback
  const idx = memoryQuotations.findIndex(q => q.id === id && q.user_id === userId);
  if (idx === -1) {
    return res.status(404).json({ message: 'Quotation not found or access denied.' });
  }

  memoryQuotations.splice(idx, 1);
  res.json({ message: 'Quotation deleted successfully.' });
}));

const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper function to purge all user quotation records and associated PDF files in Supabase storage
async function purgeUserDataFromQuotations(userId, username) {
  const idsToMatch = [userId, username].filter(Boolean);

  if (isSupabaseConfigured()) {
    try {
      const validUserId = isUuid(userId) ? userId : null;

      if (validUserId) {
        // 1. Fetch user's quotations to extract storage_path entries
        const { data: userQuotations } = await supabase
          .from('quotations')
          .select('id, storage_path')
          .eq('user_id', validUserId);

        if (userQuotations && userQuotations.length > 0) {
          const storagePaths = userQuotations.map(q => q.storage_path).filter(Boolean);
          if (storagePaths.length > 0) {
            await supabase.storage.from('quotations').remove(storagePaths);
          }
        }

        // Also clean up storage folder under quotations/${validUserId}
        try {
          const { data: folderFiles } = await supabase.storage.from('quotations').list(validUserId);
          if (folderFiles && folderFiles.length > 0) {
            const filePaths = folderFiles.map(f => `${validUserId}/${f.name}`);
            await supabase.storage.from('quotations').remove(filePaths);
          }
        } catch (stgErr) {}

        // 2. Delete quotations records from table for this user only
        const { error: dbDelErr } = await supabase
          .from('quotations')
          .delete()
          .eq('user_id', validUserId);

        if (dbDelErr) console.error('Error deleting user quotations from Supabase DB:', dbDelErr);
      }
    } catch (err) {
      console.error('Error purging quotations data from Supabase:', err);
    }
  }

  // Memory mode cleanup
  memoryQuotations = memoryQuotations.filter(q => !idsToMatch.includes(q.user_id));
}

router.purgeUserDataFromQuotations = purgeUserDataFromQuotations;
module.exports = router;
module.exports.purgeUserDataFromQuotations = purgeUserDataFromQuotations;

