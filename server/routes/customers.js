const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// In-memory store fallback when Supabase is unconfigured
let memoryCalculations = [];
let memoryProductionOrders = [];
let memoryFiles = [];

const isSupabaseConfigured = () => {
  return process.env.SUPABASE_URL && 
         !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
         process.env.SUPABASE_KEY && 
         !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');
};

const toUuidOrNull = (val) => {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean);
  return isUuid ? clean : null;
};

// Helper: Ensure company_id and size_id are valid for database constraints
// Optimized: skips redundant UUID retry when input already passes UUID validation
async function resolveValidCompanyAndSize(providedCompanyId, providedSizeId, isUpdate = false, existingRecord = null) {
  let companyId = providedCompanyId ? String(providedCompanyId).trim() : (isUpdate && existingRecord ? existingRecord.company_id : null);
  let sizeId = providedSizeId ? String(providedSizeId).trim() : (isUpdate && existingRecord ? existingRecord.size_id : null);

  if (isSupabaseConfigured()) {
    let validCompanyId = null;
    let validSizeId = null;

    if (companyId) {
      // Use the cleaned UUID directly if the raw input is already valid UUID format
      const companyUuid = toUuidOrNull(companyId);
      const queryId = companyUuid || companyId;
      try {
        const { data: comp } = await supabase
          .from('companies')
          .select('id')
          .eq('id', queryId)
          .maybeSingle();
        if (comp && comp.id) {
          validCompanyId = comp.id;
        } else if (!companyUuid && toUuidOrNull(companyId)) {
          // Only retry with cleaned UUID if the original wasn't already a clean UUID
          const { data: compUuid } = await supabase.from('companies').select('id').eq('id', toUuidOrNull(companyId)).maybeSingle();
          if (compUuid && compUuid.id) validCompanyId = compUuid.id;
        }
      } catch (err) {
        if (companyUuid) {
          const { data: compUuid } = await supabase.from('companies').select('id').eq('id', companyUuid).maybeSingle();
          if (compUuid && compUuid.id) validCompanyId = compUuid.id;
        }
      }
    }

    if (validCompanyId && sizeId) {
      // Use the cleaned UUID directly if the raw input is already valid UUID format
      const sizeUuid = toUuidOrNull(sizeId);
      const queryId = sizeUuid || sizeId;
      try {
        const { data: sz } = await supabase
          .from('company_sizes')
          .select('id')
          .eq('id', queryId)
          .eq('company_id', validCompanyId)
          .maybeSingle();
        if (sz && sz.id) {
          validSizeId = sz.id;
        } else if (!sizeUuid && toUuidOrNull(sizeId)) {
          // Only retry with cleaned UUID if the original wasn't already a clean UUID
          const { data: szUuid } = await supabase
            .from('company_sizes')
            .select('id')
            .eq('id', toUuidOrNull(sizeId))
            .eq('company_id', validCompanyId)
            .maybeSingle();
          if (szUuid && szUuid.id) validSizeId = szUuid.id;
        }
      } catch (err) {
        if (sizeUuid) {
          const { data: szUuid } = await supabase
            .from('company_sizes')
            .select('id')
            .eq('id', sizeUuid)
            .eq('company_id', validCompanyId)
            .maybeSingle();
          if (szUuid && szUuid.id) validSizeId = szUuid.id;
        }
      }
    }

    return { companyId: validCompanyId, sizeId: validSizeId };
  }

  return { companyId, sizeId };
};

// Helper: Smart adaptive insert into Supabase table (automatically handles missing columns or missing select relations)
async function insertAdaptive(tableName, initialPayload, selectClause = '*, companies(name), company_sizes(*)') {
  let payload = { ...initialPayload };
  Object.keys(payload).forEach(k => {
    if (payload[k] === undefined) delete payload[k];
  });

  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select(selectClause)
      .maybeSingle();

    if (!error && data) return data;

    if (error) {
      const msg = error.message || '';
      // CRITICAL FIX: Only strip columns on explicit PGRST204 / schema cache errors
      if (error.code === 'PGRST204' || msg.includes('in the schema cache')) {
        const colMatch = msg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i) || msg.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1] && payload[colMatch[1]] !== undefined) {
          console.warn(`[Supabase Schema Adaptive] Removing unmapped column '${colMatch[1]}' from '${tableName}' insert payload`);
          delete payload[colMatch[1]];
          continue;
        }
      }

      if (msg.includes('Could not find a relationship') || msg.includes('schema cache')) {
        const { data: simpleData, error: simpleErr } = await supabase
          .from(tableName)
          .insert(payload)
          .select('*')
          .maybeSingle();
        if (!simpleErr && simpleData) return simpleData;
      }

      throw error;
    }
  }
  throw new Error(`Adaptive insert failed for ${tableName} after maximum retries`);
}

// Helper: Find or create file in files table with strict user scoping
async function getOrCreateFile(name, type, userId = null) {
  if (!name || typeof name !== 'string' || !name.trim()) return null;
  const fileName = name.trim();
  const cleanUuid = toUuidOrNull(userId);

  if (!isSupabaseConfigured()) {
    let existing = memoryFiles.find(f => 
      f.name.toLowerCase() === fileName.toLowerCase() && 
      f.type === type && 
      (!cleanUuid || !f.user_id || f.user_id === userId)
    );
    if (!existing) {
      existing = { id: 'file_' + Math.random().toString(36).substr(2, 9), name: fileName, type, user_id: userId || null };
      memoryFiles.push(existing);
    }
    return existing.id;
  }

  try {
    // 1. Search for an exact match for this user and type
    let query = supabase
      .from('files')
      .select('id, user_id')
      .ilike('name', fileName)
      .eq('type', type);

    if (cleanUuid) {
      query = query.eq('user_id', cleanUuid);
    }

    const { data: existingUserFile } = await query.maybeSingle();
    if (existingUserFile) return existingUserFile.id;

    // 2. Insert a new file record strictly with user_id and type
    const insertPayload = { name: fileName, type };
    if (cleanUuid) insertPayload.user_id = cleanUuid;

    let { data: created, error } = await supabase
      .from('files')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error) {
      // If constraint error occurred (e.g. legacy files_name_type_key before migration), lookup existing record for this user & type
      let retryQuery = supabase
        .from('files')
        .select('id')
        .ilike('name', fileName)
        .eq('type', type);
      if (cleanUuid) retryQuery = retryQuery.eq('user_id', cleanUuid);

      const { data: retry } = await retryQuery.maybeSingle();
      if (retry) return retry.id;

      // If legacy global unique constraint blocks insertion for a different user, log warning and return null (NEVER fallback to Ungrouped)
      console.warn(`[getOrCreateFile] Legacy DB constraint blocked creation for user ${cleanUuid}. Drop files_name_type_key in Supabase SQL editor.`);
      return null;
    }

    return created ? created.id : null;
  } catch (err) {
    console.error('Error in getOrCreateFile:', err);
    return null;
  }
}

// Helper: Parse tags from raw customer name string
function parseTagsAndCleanName(rawName) {
  if (!rawName) return { cleanName: 'Ungrouped', isDuplex: false, duplexPrice: 0, isLaminated: false, laminationPrice: 0, isPrinting: false, printingPrice: 0, isInk: false, inkPrice: 0, isScreenPrinting: false, screenPrintingPrice: 0, isCallico: false, callicoPrice: 0 };
  let clean = rawName;
  let isDuplex = false, duplexPrice = 0;
  let isLaminated = false, laminationPrice = 0;
  let isPrinting = false, printingPrice = 0;
  let isInk = false, inkPrice = 0;
  let isScreenPrinting = false, screenPrintingPrice = 0;
  let isCallico = false, callicoPrice = 0;

  const duplexMatch = clean.match(/\[Duplex:\s*₹?([\d.]+)\]/i);
  if (duplexMatch) { isDuplex = true; duplexPrice = parseFloat(duplexMatch[1]) || 0; clean = clean.replace(/\[Duplex:\s*₹?[\d.]+\]\s*/gi, ''); }

  const lamMatch = clean.match(/\[Laminated?:\s*₹?([\d.]+)\]/i);
  if (lamMatch) { isLaminated = true; laminationPrice = parseFloat(lamMatch[1]) || 0; clean = clean.replace(/\[Laminated?:\s*₹?[\d.]+\]\s*/gi, ''); }

  const printingMatch = clean.match(/\[Printing:\s*₹?([\d.]+)\]/i);
  if (printingMatch) { isPrinting = true; printingPrice = parseFloat(printingMatch[1]) || 0; clean = clean.replace(/\[Printing:\s*₹?[\d.]+\]\s*/gi, ''); }

  const inkMatch = clean.match(/\[Ink:\s*₹?([\d.]+)\]/i);
  if (inkMatch) { isInk = true; inkPrice = parseFloat(inkMatch[1]) || 0; clean = clean.replace(/\[Ink:\s*₹?[\d.]+\]\s*/gi, ''); }

  const screenMatch = clean.match(/\[ScreenPrinting:\s*₹?([\d.]+)\]/i);
  if (screenMatch) { isScreenPrinting = true; screenPrintingPrice = parseFloat(screenMatch[1]) || 0; clean = clean.replace(/\[ScreenPrinting:\s*₹?[\d.]+\]\s*/gi, ''); }

  const callicoMatch = clean.match(/\[Callico:\s*₹?([\d.]+)\]/i);
  if (callicoMatch) { isCallico = true; callicoPrice = parseFloat(callicoMatch[1]) || 0; clean = clean.replace(/\[Callico:\s*₹?[\d.]+\]\s*/gi, ''); }

  // Strip PairMeta, ExtraChargesMeta, and FlabMeta tags if present
  clean = clean.replace(/\[PairMeta:\s*\{.*?\}\]\s*/gi, '')
               .replace(/\[ExtraChargesMeta:\s*\{.*?\}\]\s*/gi, '')
               .replace(/\[FlabMeta:\s*\{.*?\}\]\s*/gi, '');

  clean = clean.replace(/^\[Pad\]\s*/gi, '')
               .replace(/^\[Partition\]\s*/gi, '')
               .replace(/^\[Tray\]\s*/gi, '')
               .replace(/^\[Sleave\]\s*/gi, '')
               .replace(/^\[CollerBox\]\s*/gi, '')
               .replace(/^\[TopSideTrayBox\]\s*/gi, '')
               .replace(/^\[UniversalType\]\s*/gi, '')
               .replace(/^\[FullClosingBox\]\s*/gi, '');

  return { cleanName: clean.trim() || 'Ungrouped', isDuplex, duplexPrice, isLaminated, laminationPrice, isPrinting, printingPrice, isInk, inkPrice, isScreenPrinting, screenPrintingPrice, isCallico, callicoPrice };
}

// GET /api/customers - Get all calculations & production orders formatted
router.get('/', auth, async (req, res) => {
  const userId = req.user.userId || req.user.id;

  if (!isSupabaseConfigured()) {
    const userCalcs = userId ? memoryCalculations.filter(c => c.user_id === userId) : memoryCalculations;
    const userProds = userId ? memoryProductionOrders.filter(p => p.user_id === userId) : memoryProductionOrders;
    const all = [...userCalcs, ...userProds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json(all);
  }

  try {
    const getFileName = (fileRef) => {
      if (!fileRef) return '';
      if (Array.isArray(fileRef)) return fileRef[0]?.name || '';
      return fileRef.name || '';
    };

    // Run both queries in parallel for faster response (they are independent of each other)
    let calcQuery = supabase
      .from('calculations')
      .select(`
        *,
        companies(name),
        company_sizes(*),
        customer_file:files!customer_file_id(id, name),
        company_file:files!company_file_id(id, name)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      calcQuery = calcQuery.eq('user_id', userId);
    }

    let prodQuery = supabase
      .from('production_orders')
      .select(`
        *,
        companies(name),
        company_sizes(*),
        production_file:files!production_file_id(id, name)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      prodQuery = prodQuery.eq('user_id', userId);
    }

    const [calcResult, prodResult] = await Promise.all([calcQuery, prodQuery]);
    if (calcResult.error) throw calcResult.error;
    if (prodResult.error) throw prodResult.error;
    const calcList = calcResult.data;
    const prodList = prodResult.data;

    const formatCalcRecord = (c) => {
      const custFileObjName = getFileName(c.customer_file);
      const compFileObjName = getFileName(c.company_file);

      const rawCalcType = c.company_sizes ? (c.company_sizes.calc_type || '') : (c.calc_type || '');
      const custNameRaw = c.customer_name || custFileObjName || '';
      const { cleanName, isDuplex, duplexPrice, isLaminated, laminationPrice, isPrinting, printingPrice, isInk, inkPrice, isScreenPrinting, screenPrintingPrice, isCallico, callicoPrice } = parseTagsAndCleanName(custNameRaw);

      let typePrefix = '';
      if (rawCalcType === 'pad' || /\[Pad\]/i.test(custNameRaw)) typePrefix = '[Pad] ';
      else if (rawCalcType === 'partition' || /\[Partition\]/i.test(custNameRaw)) typePrefix = '[Partition] ';
      else if (rawCalcType === 'tray' || /\[Tray\]/i.test(custNameRaw)) typePrefix = '[Tray] ';
      else if (rawCalcType === 'sleave' || /\[Sleave\]/i.test(custNameRaw)) typePrefix = '[Sleave] ';
      else if (rawCalcType === 'coller_box' || rawCalcType === 'coller' || rawCalcType === 'collerbox' || /\[CollerBox\]/i.test(custNameRaw)) typePrefix = '[CollerBox] ';
      else if (rawCalcType === 'top_side_tray_box' || rawCalcType === 'top_side_tray' || rawCalcType === 'top_side_tray_type' || rawCalcType === 'top-side-tray' || rawCalcType === 'u_box' || rawCalcType === 'ubox' || /\[TopSideTrayBox\]/i.test(custNameRaw) || /\[TopSideTray\]/i.test(custNameRaw)) typePrefix = '[TopSideTrayBox] ';
      else if (rawCalcType === 'universal' || rawCalcType === 'universal_type' || /\[UniversalType\]/i.test(custNameRaw)) typePrefix = '[UniversalType] ';
      else if (rawCalcType === 'full_closing' || rawCalcType === 'full_closing_box' || /\[FullClosingBox\]/i.test(custNameRaw)) typePrefix = '[FullClosingBox] ';

      const baseName = cleanName && cleanName !== 'Ungrouped' ? cleanName : (custFileObjName || 'Ungrouped');
      let custName = `${typePrefix}${baseName}`.trim();

      const useDup = c.is_duplex !== undefined && c.is_duplex !== null ? !!c.is_duplex : isDuplex;
      const dupP = c.duplex_price !== undefined && c.duplex_price !== null ? Number(c.duplex_price) : duplexPrice;
      const useLam = c.is_laminated !== undefined && c.is_laminated !== null ? !!c.is_laminated : isLaminated;
      const lamP = c.lamination_price !== undefined && c.lamination_price !== null ? Number(c.lamination_price) : laminationPrice;
      const usePrn = c.is_printing !== undefined && c.is_printing !== null ? !!c.is_printing : isPrinting;
      const prnP = c.printing_price !== undefined && c.printing_price !== null ? Number(c.printing_price) : printingPrice;
      const useInk = c.is_ink !== undefined && c.is_ink !== null ? !!c.is_ink : isInk;
      const inkP = c.ink_price !== undefined && c.ink_price !== null ? Number(c.ink_price) : inkPrice;
      const useScr = c.is_screen_printing !== undefined && c.is_screen_printing !== null ? !!c.is_screen_printing : isScreenPrinting;
      const scrP = c.screen_printing_price !== undefined && c.screen_printing_price !== null ? Number(c.screen_printing_price) : screenPrintingPrice;
      const useCal = c.is_callico !== undefined && c.is_callico !== null ? !!c.is_callico : isCallico;
      const calP = c.callico_price !== undefined && c.callico_price !== null ? Number(c.callico_price) : callicoPrice;

      if (useDup && dupP > 0) custName = `[Duplex: ₹${dupP}] ${custName}`;
      if (useLam && lamP > 0) custName = `[Laminated: ₹${lamP}] ${custName}`;
      if (usePrn && prnP > 0) custName = `[Printing: ₹${prnP}] ${custName}`;
      if (useInk && inkP > 0) custName = `[Ink: ₹${inkP}] ${custName}`;
      if (useScr && scrP > 0) custName = `[ScreenPrinting: ₹${scrP}] ${custName}`;
      if (useCal && calP > 0) custName = `[Callico: ₹${calP}] ${custName}`;

      let metaTags = '';
      const pairMatch = custNameRaw.match(/\[PairMeta:\s*\{.*?\}\]/i);
      if (pairMatch) metaTags += ` ${pairMatch[0]}`;
      const extraMatch = custNameRaw.match(/\[ExtraChargesMeta:\s*\{.*?\}\]/i);
      if (extraMatch) metaTags += ` ${extraMatch[0]}`;
      const flabMatch = custNameRaw.match(/\[FlabMeta:\s*\{.*?\}\]/i);
      if (flabMatch) metaTags += ` ${flabMatch[0]}`;

      if (metaTags) custName = `${custName}${metaTags}`;

      const compRef = (c.company_reference && c.company_reference.trim()) ? c.company_reference.trim() : (compFileObjName || '');

      return {
        ...c,
        customer_name: custName,
        company_reference: compRef,
        company_name: c.companies ? c.companies.name : 'Unknown',
        size_label: c.company_sizes ? c.company_sizes.label : 'Unknown'
      };
    };

    const formattedCalcs = (calcList || []).map(formatCalcRecord);

    const formattedProds = (prodList || []).map(p => {
      const prodFileObjName = getFileName(p.production_file) || 'Ungrouped';
      let rawRef = p.ref_name || 'Production Order';
      let finishDate = '';
      let lengthReelCut = '';
      let widthReelCut = '';
      let topReelCut = '';
      let bottomReelCut = '';
      let flabL = 0;
      let flabW = 0;

      try {
        let jsonStr = p.customer_name || '';
        if (!jsonStr && p.ref_name && p.ref_name.includes('[Meta:')) {
          const matchMeta = p.ref_name.match(/\[Meta:(.*?)\]\s*(.*)/s);
          if (matchMeta) {
            jsonStr = matchMeta[1];
            rawRef = matchMeta[2] || rawRef;
          }
        }
        if (jsonStr) {
          const pCust = JSON.parse(jsonStr);
          if (pCust) {
            if (pCust.dateOfFinish) finishDate = pCust.dateOfFinish;
            if (pCust.lengthReelCut) lengthReelCut = pCust.lengthReelCut;
            if (pCust.widthReelCut) widthReelCut = pCust.widthReelCut;
            if (pCust.topReelCut) topReelCut = pCust.topReelCut;
            if (pCust.bottomReelCut) bottomReelCut = pCust.bottomReelCut;
            if (pCust.flabL) flabL = pCust.flabL;
            if (pCust.flabW) flabW = pCust.flabW;
          }
        }
      } catch (e) {}

      if (!finishDate && rawRef.includes('[FinishDate:')) {
        const match = rawRef.match(/\[FinishDate:(.*?)\]/);
        if (match) finishDate = match[1];
      }
      if (!finishDate && p.date_of_finish) {
        finishDate = p.date_of_finish;
      }

      const cleanRef = rawRef.replace(/\[FinishDate:.*?\]/g, '').trim() || 'Production Order';

      const payloadObj = {
        pOption: p.p_option || 'N',
        lOption: p.l_option || 'N',
        ref: cleanRef,
        reelMultiplier: p.reel_multiplier || 1,
        cutMultiplier: p.cut_multiplier || 1,
        sizeMultiplier: p.size_multiplier || 1,
        productionFile: prodFileObjName,
        isPad: p.is_pad,
        isPartition: p.is_partition,
        isTray: p.is_tray,
        isSleave: p.is_sleave,
        isCollerBox: p.is_coller_box,
        isTopSideTrayBox: p.is_top_side_tray_box,
        isUniversalType: p.is_universal_type,
        isFullClosingBox: p.is_full_closing_box,
        dateOfFinish: finishDate,
        lengthReelCut,
        widthReelCut,
        topReelCut,
        bottomReelCut,
        flabL,
        flabW,
        isPaired: p.is_paired || false,
        p1ReelCut: p.p1_reel_cut || '',
        p2ReelCut: p.p2_reel_cut || '',
        p1Packing: p.p1_packing !== null && p.p1_packing !== undefined ? p.p1_packing : 0,
        p2Packing: p.p2_packing !== null && p.p2_packing !== undefined ? p.p2_packing : 0,
        p1Liner: p.p1_liner !== null && p.p1_liner !== undefined ? p.p1_liner : 0,
        p2Liner: p.p2_liner !== null && p.p2_liner !== undefined ? p.p2_liner : 0,
        p1DefaultPacking: p.p1_default_packing !== null && p.p1_default_packing !== undefined ? p.p1_default_packing : 0,
        p2DefaultPacking: p.p2_default_packing !== null && p.p2_default_packing !== undefined ? p.p2_default_packing : 0,
        p1DefaultLiner: p.p1_default_liner !== null && p.p1_default_liner !== undefined ? p.p1_default_liner : 0,
        p2DefaultLiner: p.p2_default_liner !== null && p.p2_default_liner !== undefined ? p.p2_default_liner : 0,
        p1SizeMM: p.p1_size_mm || '',
        p2SizeMM: p.p2_size_mm || '',
        p1SizeInch: p.p1_size_inch || '',
        p2SizeInch: p.p2_size_inch || ''
      };

      return {
        ...p,
        customer_name: JSON.stringify(payloadObj),
        company_reference: '',
        single_box_price: 0,
        total_cost: 0,
        gst_amount: 0,
        grand_total: 0,
        price_per_kg: 0,
        gst_percent: 0,
        company_name: p.companies ? p.companies.name : 'Unknown',
        size_label: p.company_sizes ? p.company_sizes.label : 'Unknown'
      };
    });

    const combined = [...formattedCalcs, ...formattedProds].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(combined);
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ message: 'Error fetching calculations', error: error.message });
  }
});

// ─── STATIC FILE ROUTES (DECLARED BEFORE ANY /:id ROUTE) ───────────────────

// POST /api/customers/files/check - Fast check if a file name exists for a specific type for the authenticated user
router.post('/files/check', auth, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ message: 'name and type are required' });
  }

  const cleanName = name.trim();
  if (!cleanName) return res.json({ exists: false });
  const cleanUuid = toUuidOrNull(userId);

  if (!isSupabaseConfigured()) {
    let exists = false;
    if (type === 'customer_copy') {
      exists = memoryCalculations.some(c => (!c.user_id || c.user_id === userId) && parseTagsAndCleanName(c.customer_name).cleanName.toLowerCase() === cleanName.toLowerCase());
    } else if (type === 'company_copy') {
      exists = memoryCalculations.some(c => (!c.user_id || c.user_id === userId) && (c.company_reference || '').toLowerCase() === cleanName.toLowerCase());
    } else if (type === 'production') {
      exists = memoryProductionOrders.some(p => {
        if (p.user_id && p.user_id !== userId) return false;
        try { return JSON.parse(p.customer_name).productionFile.toLowerCase() === cleanName.toLowerCase(); } catch(e) { return false; }
      });
    }
    if (!exists) {
      exists = memoryFiles.some(f => f.type === type && (!f.user_id || f.user_id === userId) && (f.name || '').toLowerCase() === cleanName.toLowerCase());
    }
    return res.json({ exists });
  }

  try {
    // 1. Check files table directly for this user and type
    let fileCheckQuery = supabase
      .from('files')
      .select('id')
      .ilike('name', cleanName)
      .eq('type', type);
    if (cleanUuid) {
      fileCheckQuery = fileCheckQuery.eq('user_id', cleanUuid);
    }
    const { data: fileData } = await fileCheckQuery.maybeSingle();

    if (fileData) return res.json({ exists: true });

    let exists = false;

    if (type === 'customer_copy') {
      let query = supabase.from('calculations').select('customer_name');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data } = await query;
      exists = (data || []).some(c => parseTagsAndCleanName(c.customer_name).cleanName.toLowerCase() === cleanName.toLowerCase());
    } else if (type === 'company_copy') {
      let query = supabase.from('calculations').select('company_reference');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data } = await query;
      exists = (data || []).some(c => (c.company_reference || '').toLowerCase() === cleanName.toLowerCase());
    } else if (type === 'production') {
      let query = supabase.from('production_orders').select('customer_name');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data } = await query;
      exists = (data || []).some(p => {
        try { return JSON.parse(p.customer_name).productionFile.toLowerCase() === cleanName.toLowerCase(); } catch(e) { return false; }
      });
    }

    return res.json({ exists });
  } catch (err) {
    console.error('Error checking file existence:', err);
    res.status(500).json({ message: 'Error checking file', error: err.message });
  }
});

// GET /api/customers/files - Get all registered file names by type ('customer_copy' | 'company_copy' | 'production') for the authenticated user
router.get('/files', auth, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const type = req.query.type || 'customer_copy';
  const cleanUuid = toUuidOrNull(userId);

  if (!isSupabaseConfigured()) {
    let namesFromData = [];
    if (type === 'customer_copy') {
      namesFromData = memoryCalculations
        .filter(c => (!c.user_id || c.user_id === userId) && Number(c.grand_total) > 0)
        .map(c => parseTagsAndCleanName(c.customer_name).cleanName)
        .filter(n => n && n !== 'Ungrouped');
    } else if (type === 'company_copy') {
      namesFromData = memoryCalculations
        .filter(c => (!c.user_id || c.user_id === userId) && Number(c.grand_total) > 0)
        .map(c => (c.company_reference || '').trim())
        .filter(n => n && n !== 'Ungrouped');
    } else if (type === 'production') {
      namesFromData = memoryProductionOrders
        .filter(p => !p.user_id || p.user_id === userId)
        .map(p => {
          try { return JSON.parse(p.customer_name).productionFile; } catch(e) { return ''; }
        }).filter(n => n && n !== 'Ungrouped');
    }
    const namesFromFiles = memoryFiles.filter(f => f.type === type && (!f.user_id || f.user_id === userId)).map(f => f.name).filter(n => n && n !== 'Ungrouped');
    const combined = [...new Set([...namesFromData, ...namesFromFiles])].sort();
    return res.json(combined);
  }

  try {
    let namesFromData = [];

    if (type === 'customer_copy') {
      let query = supabase.from('calculations').select('customer_name, customer_file:files!customer_file_id(name)');
      if (cleanUuid) {
        query = query.eq('user_id', cleanUuid);
      }
      const { data: calcs } = await query;
      namesFromData = (calcs || [])
        .map(c => {
          const fileObjName = c.customer_file ? (Array.isArray(c.customer_file) ? c.customer_file[0]?.name : c.customer_file.name) : '';
          return fileObjName || parseTagsAndCleanName(c.customer_name).cleanName;
        })
        .filter(n => n && n !== 'Ungrouped');
    } else if (type === 'company_copy') {
      let query = supabase.from('calculations').select('company_reference, company_file:files!company_file_id(name)');
      if (cleanUuid) {
        query = query.eq('user_id', cleanUuid);
      }
      const { data: calcs } = await query;
      namesFromData = (calcs || [])
        .map(c => {
          const fileObjName = c.company_file ? (Array.isArray(c.company_file) ? c.company_file[0]?.name : c.company_file.name) : '';
          return fileObjName || (c.company_reference || '').trim();
        })
        .filter(n => n && n !== 'Ungrouped');
    } else if (type === 'production') {
      let query = supabase.from('production_orders').select('customer_name, production_file:files!production_file_id(name)');
      if (cleanUuid) {
        query = query.eq('user_id', cleanUuid);
      }
      const { data: prods } = await query;
      namesFromData = (prods || []).map(p => {
        const fileObjName = p.production_file ? (Array.isArray(p.production_file) ? p.production_file[0]?.name : p.production_file.name) : '';
        if (fileObjName) return fileObjName;
        try { return JSON.parse(p.customer_name).productionFile; } catch(e) { return ''; }
      }).filter(n => n && n !== 'Ungrouped');
    }

    // Direct query on files table for registered files of this type matching user_id
    let filesQuery = supabase.from('files').select('name').eq('type', type);
    if (cleanUuid) {
      filesQuery = filesQuery.eq('user_id', cleanUuid);
    }
    const { data: dbFiles } = await filesQuery;
    const namesFromFilesTable = (dbFiles || []).map(f => (f.name || '').trim()).filter(n => n && n !== 'Ungrouped');

    const combined = [...new Set([...namesFromData, ...namesFromFilesTable])].sort();
    res.json(combined);
  } catch (error) {
    console.error('Error fetching files list:', error);
    res.status(500).json({ message: 'Error fetching files list', error: error.message });
  }
});

function escapeRegExp(string) {
  return (string || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// PUT /api/customers/files/rename - Rename user's file folder by oldName & type
router.put('/files/rename', auth, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { oldName, newName, type } = req.body;
  if (!oldName || !newName || !type) {
    return res.status(400).json({ message: 'oldName, newName, and type are required' });
  }

  const cleanOldName = oldName.trim();
  const cleanNewName = newName.trim();
  if (!cleanNewName) return res.status(400).json({ message: 'New name cannot be empty' });
  const cleanUuid = toUuidOrNull(userId);

  if (!isSupabaseConfigured()) {
    const exists = memoryFiles.some(f => f.type === type && f.name.toLowerCase() === cleanNewName.toLowerCase() && (!cleanUuid || !f.user_id || f.user_id === userId));
    if (exists) {
      return res.status(400).json({ message: `File '${cleanNewName}' already exists` });
    }
    if (type === 'customer_copy') {
      memoryCalculations.forEach(calc => {
        if (!calc.user_id || calc.user_id === userId) {
          const details = parseTagsAndCleanName(calc.customer_name);
          if (details.cleanName.toLowerCase() === cleanOldName.toLowerCase()) {
            calc.customer_name = calc.customer_name.replace(new RegExp(escapeRegExp(details.cleanName), 'gi'), cleanNewName);
          }
        }
      });
    } else if (type === 'company_copy') {
      memoryCalculations.forEach(calc => {
        if ((!calc.user_id || calc.user_id === userId) && (calc.company_reference || '').toLowerCase() === cleanOldName.toLowerCase()) {
          calc.company_reference = cleanNewName;
        }
      });
    } else if (type === 'production') {
      memoryProductionOrders.forEach(prod => {
        if (!prod.user_id || prod.user_id === userId) {
          try {
            const parsed = JSON.parse(prod.customer_name);
            if (parsed && parsed.productionFile && parsed.productionFile.toLowerCase() === cleanOldName.toLowerCase()) {
              parsed.productionFile = cleanNewName;
              prod.customer_name = JSON.stringify(parsed);
            }
          } catch(e) {}
        }
      });
    }
    const memFile = memoryFiles.find(f => f.type === type && f.name.toLowerCase() === cleanOldName.toLowerCase() && (!f.user_id || f.user_id === userId));
    if (memFile) memFile.name = cleanNewName;
    return res.json({ success: true, newName: cleanNewName });
  }

  try {
    // Check if newName already exists in files table for this user & type
    let checkQuery = supabase.from('files').select('id').ilike('name', cleanNewName).eq('type', type);
    if (cleanUuid) checkQuery = checkQuery.eq('user_id', cleanUuid);
    const { data: existingTarget } = await checkQuery.maybeSingle();
    if (existingTarget) {
      return res.status(400).json({ message: `A file named '${cleanNewName}' already exists.` });
    }

    if (type === 'customer_copy') {
      let query = supabase.from('calculations').select('id, customer_name');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data: userCalcs } = await query;
      const renamePromises = [];
      for (const calc of (userCalcs || [])) {
        const details = parseTagsAndCleanName(calc.customer_name);
        if (details.cleanName.toLowerCase() === cleanOldName.toLowerCase()) {
          const newCustName = calc.customer_name.replace(new RegExp(escapeRegExp(details.cleanName), 'gi'), cleanNewName);
          renamePromises.push(supabase.from('calculations').update({ customer_name: newCustName }).eq('id', calc.id));
        }
      }
      if (renamePromises.length > 0) await Promise.all(renamePromises);
    } else if (type === 'company_copy') {
      let query = supabase.from('calculations').update({ company_reference: cleanNewName }).ilike('company_reference', cleanOldName);
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      await query;
    } else if (type === 'production') {
      let query = supabase.from('production_orders').select('id, customer_name');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data: userProds } = await query;
      const prodRenamePromises = [];
      for (const prod of (userProds || [])) {
        try {
          const parsed = JSON.parse(prod.customer_name);
          if (parsed && parsed.productionFile && parsed.productionFile.toLowerCase() === cleanOldName.toLowerCase()) {
            parsed.productionFile = cleanNewName;
            prodRenamePromises.push(supabase.from('production_orders').update({ customer_name: JSON.stringify(parsed) }).eq('id', prod.id));
          }
        } catch(e) {}
      }
      if (prodRenamePromises.length > 0) await Promise.all(prodRenamePromises);
    }

    let fQuery = supabase.from('files').update({ name: cleanNewName }).ilike('name', cleanOldName).eq('type', type);
    if (cleanUuid) {
      fQuery = fQuery.eq('user_id', cleanUuid);
    }
    await fQuery;

    res.json({ success: true, oldName: cleanOldName, newName: cleanNewName, type });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ message: 'Error renaming file', error: error.message });
  }
});

// DELETE /api/customers/files/delete - Delete user's file folder and handle linked calculations per type
router.delete('/files/delete', auth, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { name, type } = req.body;
  if (!name || !type) {
    return res.status(400).json({ message: 'name and type are required' });
  }

  const cleanUuid = toUuidOrNull(userId);

  if (!isSupabaseConfigured()) {
    if (type === 'customer_copy') {
      memoryCalculations.forEach(calc => {
        if (calc.user_id === userId) {
          const details = parseTagsAndCleanName(calc.customer_name);
          if (details.cleanName === name) {
            if (calc.company_reference && calc.company_reference.trim()) {
              calc.customer_name = calc.customer_name.replace(name, '').trim();
              calc.customer_file_id = null;
            } else {
              calc._delete = true;
            }
          }
        }
      });
      memoryCalculations = memoryCalculations.filter(c => !c._delete);
    } else if (type === 'company_copy') {
      memoryCalculations.forEach(calc => {
        if (calc.user_id === userId && calc.company_reference === name) {
          const details = parseTagsAndCleanName(calc.customer_name);
          if (details.cleanName && details.cleanName !== 'Ungrouped') {
            calc.company_reference = '';
            calc.company_file_id = null;
          } else {
            calc._delete = true;
          }
        }
      });
      memoryCalculations = memoryCalculations.filter(c => !c._delete);
    } else if (type === 'production') {
      memoryProductionOrders = memoryProductionOrders.filter(p => {
        if (p.user_id !== userId) return true;
        try {
          const parsed = JSON.parse(p.customer_name);
          return parsed.productionFile !== name;
        } catch(e) {
          return true;
        }
      });
    }
    memoryFiles = memoryFiles.filter(f => !(f.type === type && f.name.toLowerCase() === name.toLowerCase() && (!cleanUuid || !f.user_id || f.user_id === userId)));
    return res.json({ success: true });
  }

  try {
    if (type === 'customer_copy') {
      let query = supabase.from('calculations').select('*');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data: userCalcs } = await query;
      const deleteCalcPromises = [];
      for (const calc of (userCalcs || [])) {
        const details = parseTagsAndCleanName(calc.customer_name);
        const matchesFile = (details.cleanName || '').trim().toLowerCase() === name.trim().toLowerCase();
        if (matchesFile) {
          const hasCompanyCopy = calc.company_reference && calc.company_reference.trim() !== '' && calc.company_reference.trim() !== 'Ungrouped';
          if (hasCompanyCopy) {
            let newCustName = calc.customer_name.replace(name, '').trim();
            deleteCalcPromises.push(supabase.from('calculations').update({ customer_name: newCustName, customer_file_id: null }).eq('id', calc.id));
          } else {
            deleteCalcPromises.push(supabase.from('calculations').delete().eq('id', calc.id));
          }
        }
      }
      if (deleteCalcPromises.length > 0) await Promise.all(deleteCalcPromises);
    } else if (type === 'company_copy') {
      let query = supabase.from('calculations').select('*');
      if (cleanUuid) query = query.eq('user_id', cleanUuid);
      const { data: userCalcs } = await query;
      const deleteCompPromises = [];
      for (const calc of (userCalcs || [])) {
        const matchesFile = (calc.company_reference || '').trim().toLowerCase() === name.trim().toLowerCase();
        if (matchesFile) {
          const details = parseTagsAndCleanName(calc.customer_name);
          const hasCustomerCopy = details.cleanName && details.cleanName.trim() !== '' && details.cleanName.trim() !== 'Ungrouped';
          if (hasCustomerCopy) {
            deleteCompPromises.push(supabase.from('calculations').update({ company_reference: '', company_file_id: null }).eq('id', calc.id));
          } else {
            deleteCompPromises.push(supabase.from('calculations').delete().eq('id', calc.id));
          }
        }
      }
      if (deleteCompPromises.length > 0) await Promise.all(deleteCompPromises);
    } else if (type === 'production') {
      // 1. Fetch file ID from files table matching this name & user_id & type
      let fSelectQuery = supabase.from('files').select('id').ilike('name', name.trim()).eq('type', 'production');
      if (cleanUuid) fSelectQuery = fSelectQuery.eq('user_id', cleanUuid);
      const { data: targetFiles } = await fSelectQuery;
      const fileIds = (targetFiles || []).map(f => f.id).filter(Boolean);

      if (fileIds.length > 0) {
        await supabase.from('production_orders').delete().in('production_file_id', fileIds);
      }

      // 2. Also delete production orders matching JSON customer_name productionFile
      let pQuery = supabase.from('production_orders').select('id, customer_name');
      if (cleanUuid) pQuery = pQuery.eq('user_id', cleanUuid);
      const { data: prods } = await pQuery;
      const deleteProdPromises = [];
      for (const p of (prods || [])) {
        try {
          const parsed = JSON.parse(p.customer_name);
          if (parsed && parsed.productionFile && parsed.productionFile.trim().toLowerCase() === name.trim().toLowerCase()) {
            deleteProdPromises.push(supabase.from('production_orders').delete().eq('id', p.id));
          }
        } catch(e) {}
      }
      if (deleteProdPromises.length > 0) await Promise.all(deleteProdPromises);
    }

    // Delete file record from files table for this user & type
    let deleteFileQuery = supabase.from('files').delete().ilike('name', name.trim()).eq('type', type);
    if (cleanUuid) deleteFileQuery = deleteFileQuery.eq('user_id', cleanUuid);
    await deleteFileQuery;

    res.json({ success: true, message: `File '${name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

// ─── DYNAMIC PARAMETERIZED /:id ROUTES (DECLARED AFTER STATIC ROUTES) ─────

// GET /api/customers/:id - Get single record
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;

  if (!isSupabaseConfigured()) {
    const item = [...memoryCalculations, ...memoryProductionOrders].find(c => c.id === id);
    if (!item) return res.status(404).json({ message: 'Record not found' });
    return res.json(item);
  }

  try {
    const getFileName = (fileRef) => {
      if (!fileRef) return '';
      if (Array.isArray(fileRef)) return fileRef[0]?.name || '';
      return fileRef.name || '';
    };

    const { data: calc } = await supabase
      .from('calculations')
      .select('*, companies(name), company_sizes(*), customer_file:files!customer_file_id(id, name), company_file:files!company_file_id(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (calc) {
      const custFileObjName = getFileName(calc.customer_file);
      const compFileObjName = getFileName(calc.company_file);

      const rawCalcType = calc.company_sizes ? (calc.company_sizes.calc_type || '') : (calc.calc_type || '');
      const custNameRaw = calc.customer_name || custFileObjName || '';
      const { cleanName, isDuplex, duplexPrice, isLaminated, laminationPrice, isPrinting, printingPrice, isInk, inkPrice, isScreenPrinting, screenPrintingPrice, isCallico, callicoPrice } = parseTagsAndCleanName(custNameRaw);

      let typePrefix = '';
      if (rawCalcType === 'pad' || /\[Pad\]/i.test(custNameRaw)) typePrefix = '[Pad] ';
      else if (rawCalcType === 'partition' || /\[Partition\]/i.test(custNameRaw)) typePrefix = '[Partition] ';
      else if (rawCalcType === 'tray' || /\[Tray\]/i.test(custNameRaw)) typePrefix = '[Tray] ';
      else if (rawCalcType === 'sleave' || /\[Sleave\]/i.test(custNameRaw)) typePrefix = '[Sleave] ';
      else if (rawCalcType === 'coller_box' || rawCalcType === 'coller' || rawCalcType === 'collerbox' || /\[CollerBox\]/i.test(custNameRaw)) typePrefix = '[CollerBox] ';
      else if (rawCalcType === 'top_side_tray_box' || rawCalcType === 'top_side_tray' || rawCalcType === 'top_side_tray_type' || rawCalcType === 'top-side-tray' || rawCalcType === 'u_box' || rawCalcType === 'ubox' || /\[TopSideTrayBox\]/i.test(custNameRaw) || /\[TopSideTray\]/i.test(custNameRaw)) typePrefix = '[TopSideTrayBox] ';
      else if (rawCalcType === 'universal' || rawCalcType === 'universal_type' || /\[UniversalType\]/i.test(custNameRaw)) typePrefix = '[UniversalType] ';
      else if (rawCalcType === 'full_closing' || rawCalcType === 'full_closing_box' || /\[FullClosingBox\]/i.test(custNameRaw)) typePrefix = '[FullClosingBox] ';

      const baseName = cleanName && cleanName !== 'Ungrouped' ? cleanName : (custFileObjName || 'Ungrouped');
      let custName = `${typePrefix}${baseName}`.trim();

      const useDup = calc.is_duplex !== undefined && calc.is_duplex !== null ? !!calc.is_duplex : isDuplex;
      const dupP = calc.duplex_price !== undefined && calc.duplex_price !== null ? Number(calc.duplex_price) : duplexPrice;
      const useLam = calc.is_laminated !== undefined && calc.is_laminated !== null ? !!calc.is_laminated : isLaminated;
      const lamP = calc.lamination_price !== undefined && calc.lamination_price !== null ? Number(calc.lamination_price) : laminationPrice;
      const usePrn = calc.is_printing !== undefined && calc.is_printing !== null ? !!calc.is_printing : isPrinting;
      const prnP = calc.printing_price !== undefined && calc.printing_price !== null ? Number(calc.printing_price) : printingPrice;
      const useInk = calc.is_ink !== undefined && calc.is_ink !== null ? !!calc.is_ink : isInk;
      const inkP = calc.ink_price !== undefined && calc.ink_price !== null ? Number(calc.ink_price) : inkPrice;
      const useScr = calc.is_screen_printing !== undefined && calc.is_screen_printing !== null ? !!calc.is_screen_printing : isScreenPrinting;
      const scrP = calc.screen_printing_price !== undefined && calc.screen_printing_price !== null ? Number(calc.screen_printing_price) : screenPrintingPrice;
      const useCal = calc.is_callico !== undefined && calc.is_callico !== null ? !!calc.is_callico : isCallico;
      const calP = calc.callico_price !== undefined && calc.callico_price !== null ? Number(calc.callico_price) : callicoPrice;

      if (useDup && dupP > 0) custName = `[Duplex: ₹${dupP}] ${custName}`;
      if (useLam && lamP > 0) custName = `[Laminated: ₹${lamP}] ${custName}`;
      if (usePrn && prnP > 0) custName = `[Printing: ₹${prnP}] ${custName}`;
      if (useInk && inkP > 0) custName = `[Ink: ₹${inkP}] ${custName}`;
      if (useScr && scrP > 0) custName = `[ScreenPrinting: ₹${scrP}] ${custName}`;
      if (useCal && calP > 0) custName = `[Callico: ₹${calP}] ${custName}`;

      let metaTags = '';
      const pairMatch = custNameRaw.match(/\[PairMeta:\s*\{.*?\}\]/i);
      if (pairMatch) metaTags += ` ${pairMatch[0]}`;
      const extraMatch = custNameRaw.match(/\[ExtraChargesMeta:\s*\{.*?\}\]/i);
      if (extraMatch) metaTags += ` ${extraMatch[0]}`;
      const flabMatch = custNameRaw.match(/\[FlabMeta:\s*\{.*?\}\]/i);
      if (flabMatch) metaTags += ` ${flabMatch[0]}`;

      if (metaTags) custName = `${custName}${metaTags}`;

      const compRef = (calc.company_reference && calc.company_reference.trim()) ? calc.company_reference.trim() : (compFileObjName || '');

      return res.json({
        ...calc,
        customer_name: custName,
        company_reference: compRef,
        company_name: calc.companies ? calc.companies.name : 'Unknown',
        size_label: calc.company_sizes ? calc.company_sizes.label : 'Unknown'
      });
    }

    const { data: prod } = await supabase
      .from('production_orders')
      .select('*, companies(name), company_sizes(*), production_file:files!production_file_id(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (prod) {
      const prodFileObjName = getFileName(prod.production_file) || 'Ungrouped';
      let rawRef = prod.ref_name || 'Production Order';
      let finishDate = '';
      let lengthReelCut = '';
      let widthReelCut = '';
      let topReelCut = '';
      let bottomReelCut = '';
      let flabL = 0;
      let flabW = 0;

      try {
        let jsonStr = prod.customer_name || '';
        if (!jsonStr && prod.ref_name && prod.ref_name.includes('[Meta:')) {
          const matchMeta = prod.ref_name.match(/\[Meta:(.*?)\]\s*(.*)/s);
          if (matchMeta) {
            jsonStr = matchMeta[1];
            rawRef = matchMeta[2] || rawRef;
          }
        }
        if (jsonStr) {
          const pCust = JSON.parse(jsonStr);
          if (pCust) {
            if (pCust.dateOfFinish) finishDate = pCust.dateOfFinish;
            if (pCust.lengthReelCut) lengthReelCut = pCust.lengthReelCut;
            if (pCust.widthReelCut) widthReelCut = pCust.widthReelCut;
            if (pCust.topReelCut) topReelCut = pCust.topReelCut;
            if (pCust.bottomReelCut) bottomReelCut = pCust.bottomReelCut;
            if (pCust.flabL) flabL = pCust.flabL;
            if (pCust.flabW) flabW = pCust.flabW;
          }
        }
      } catch (e) {}

      if (!finishDate && rawRef.includes('[FinishDate:')) {
        const match = rawRef.match(/\[FinishDate:(.*?)\]/);
        if (match) finishDate = match[1];
      }
      if (!finishDate && prod.date_of_finish) {
        finishDate = prod.date_of_finish;
      }

      const cleanRef = rawRef.replace(/\[FinishDate:.*?\]/g, '').trim() || 'Production Order';

      const payloadObj = {
        pOption: prod.p_option || 'N',
        lOption: prod.l_option || 'N',
        ref: cleanRef,
        reelMultiplier: prod.reel_multiplier || 1,
        cutMultiplier: prod.cut_multiplier || 1,
        sizeMultiplier: prod.size_multiplier || 1,
        productionFile: prodFileObjName,
        isPad: prod.is_pad,
        isPartition: prod.is_partition,
        isTray: prod.is_tray,
        isSleave: prod.is_sleave,
        isCollerBox: prod.is_coller_box,
        isTopSideTrayBox: prod.is_top_side_tray_box,
        isUniversalType: prod.is_universal_type,
        isFullClosingBox: prod.is_full_closing_box,
        dateOfFinish: finishDate,
        lengthReelCut,
        widthReelCut,
        topReelCut,
        bottomReelCut,
        flabL,
        flabW,
        isPaired: prod.is_paired || false,
        p1ReelCut: prod.p1_reel_cut || '',
        p2ReelCut: prod.p2_reel_cut || '',
        p1Packing: prod.p1_packing !== null && prod.p1_packing !== undefined ? prod.p1_packing : 0,
        p2Packing: prod.p2_packing !== null && prod.p2_packing !== undefined ? prod.p2_packing : 0,
        p1Liner: prod.p1_liner !== null && prod.p1_liner !== undefined ? prod.p1_liner : 0,
        p2Liner: prod.p2_liner !== null && prod.p2_liner !== undefined ? prod.p2_liner : 0,
        p1DefaultPacking: prod.p1_default_packing !== null && prod.p1_default_packing !== undefined ? prod.p1_default_packing : 0,
        p2DefaultPacking: prod.p2_default_packing !== null && prod.p2_default_packing !== undefined ? prod.p2_default_packing : 0,
        p1DefaultLiner: prod.p1_default_liner !== null && prod.p1_default_liner !== undefined ? prod.p1_default_liner : 0,
        p2DefaultLiner: prod.p2_default_liner !== null && prod.p2_default_liner !== undefined ? prod.p2_default_liner : 0,
        p1SizeMM: prod.p1_size_mm || '',
        p2SizeMM: prod.p2_size_mm || '',
        p1SizeInch: prod.p1_size_inch || '',
        p2SizeInch: prod.p2_size_inch || ''
      };

      return res.json({
        ...prod,
        customer_name: JSON.stringify(payloadObj),
        company_reference: '',
        single_box_price: 0,
        total_cost: 0,
        gst_amount: 0,
        grand_total: 0,
        price_per_kg: 0,
        gst_percent: 0,
        company_name: prod.companies ? prod.companies.name : 'Unknown',
        size_label: prod.company_sizes ? prod.company_sizes.label : 'Unknown'
      });
    }

    res.status(404).json({ message: 'Calculation record not found' });
  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/customers - Save new calculation or production order
router.post('/', auth, async (req, res) => {
  const calculationData = req.body;
  const userId = req.user.userId;
  const grandTotal = Number(calculationData.grand_total || 0);

  if (grandTotal > 0) {
    const { cleanName, isDuplex, duplexPrice, isLaminated, laminationPrice, isPrinting, printingPrice, isInk, inkPrice, isScreenPrinting, screenPrintingPrice, isCallico, callicoPrice } = parseTagsAndCleanName(calculationData.customer_name);
    const compRef = (calculationData.company_reference || '').trim();

    // Run file creation and company/size validation in parallel (they are independent)
    const [customerFileId, { companyId: validCompanyId, sizeId: validSizeId }] = await Promise.all([
      cleanName && cleanName !== 'Ungrouped' ? getOrCreateFile(cleanName, 'customer_copy', userId) : Promise.resolve(null),
      resolveValidCompanyAndSize(calculationData.company_id, calculationData.size_id, false, null)
    ]);

    if (!validCompanyId || !validSizeId) {
      return res.status(400).json({ message: 'Valid company_id and size_id pair are required to save record.' });
    }

    const baseRecord = {
      user_id: toUuidOrNull(userId),
      company_id: validCompanyId,
      size_id: validSizeId,
      quantity_of_boxes: Number(calculationData.quantity_of_boxes || 0),
      ply_type: Number(calculationData.ply_type || 5),
      flute_extra_percent: Number(calculationData.flute_extra_percent || 45),
      price_per_kg: Number(calculationData.price_per_kg || 0),
      gsm: Number(calculationData.gsm || calculationData.gsm_paper || 150),
      gsm_paper: Number(calculationData.gsm_paper || 150),
      gsm_flute: Number(calculationData.gsm_flute || 150),
      gsm_packing: Number(calculationData.gsm_packing || 0),
      bf: Number(calculationData.bf || 18),
      quantity_of_data: Number(calculationData.quantity_of_data || 1),
      gst_percent: Number(calculationData.gst_percent || 18),
      reel_size_adjust: Number(calculationData.reel_size_adjust || 0),
      cut_size_adjust: Number(calculationData.cut_size_adjust || 0),
      reel_size: Number(calculationData.reel_size || 0),
      cut_size: Number(calculationData.cut_size || 0),
      paper: Number(calculationData.paper || 0),
      flute: Number(calculationData.flute || 0),
      weight_per_unit: Number(calculationData.weight_per_unit || 0),
      box_weight: Number(calculationData.box_weight || 0),
      single_box_price: Number(calculationData.single_box_price || 0),
      total_cost: Number(calculationData.total_cost || 0),
      gst_amount: Number(calculationData.gst_amount || 0),
      grand_total: Number(calculationData.grand_total || 0),
      is_duplex: calculationData.is_duplex !== undefined ? !!calculationData.is_duplex : isDuplex,
      duplex_price: calculationData.duplex_price !== undefined ? Number(calculationData.duplex_price || 0) : duplexPrice,
      is_laminated: calculationData.is_laminated !== undefined ? !!calculationData.is_laminated : isLaminated,
      lamination_price: calculationData.lamination_price !== undefined ? Number(calculationData.lamination_price || 0) : laminationPrice,
      is_printing: calculationData.is_printing !== undefined ? !!calculationData.is_printing : isPrinting,
      printing_price: calculationData.printing_price !== undefined ? Number(calculationData.printing_price || 0) : printingPrice,
      is_ink: calculationData.is_ink !== undefined ? !!calculationData.is_ink : isInk,
      ink_price: calculationData.ink_price !== undefined ? Number(calculationData.ink_price || 0) : inkPrice,
      is_screen_printing: calculationData.is_screen_printing !== undefined ? !!calculationData.is_screen_printing : isScreenPrinting,
      screen_printing_price: calculationData.screen_printing_price !== undefined ? Number(calculationData.screen_printing_price || 0) : screenPrintingPrice,
      is_callico: calculationData.is_callico !== undefined ? !!calculationData.is_callico : isCallico,
      callico_price: calculationData.callico_price !== undefined ? Number(calculationData.callico_price || 0) : callicoPrice,
      per_piece_price: calculationData.per_piece_price !== undefined ? (calculationData.per_piece_price !== null ? Number(calculationData.per_piece_price) : null) : null,
      kraft_box_cost: calculationData.kraft_box_cost !== undefined ? (calculationData.kraft_box_cost !== null ? Number(calculationData.kraft_box_cost) : null) : null,
      kraft_subtotal: calculationData.kraft_subtotal !== undefined ? (calculationData.kraft_subtotal !== null ? Number(calculationData.kraft_subtotal) : null) : null,
      duplex_box_cost: calculationData.duplex_box_cost !== undefined ? (calculationData.duplex_box_cost !== null ? Number(calculationData.duplex_box_cost) : null) : null,
      duplex_subtotal: calculationData.duplex_subtotal !== undefined ? (calculationData.duplex_subtotal !== null ? Number(calculationData.duplex_subtotal) : null) : null,
      created_at: new Date().toISOString()
    };

    const recordPayload = {
      ...baseRecord,
      customer_file_id: toUuidOrNull(customerFileId),
      customer_name: calculationData.customer_name,
      company_reference: compRef,
      calc_type: calculationData.calc_type || ''
    };

    if (!isSupabaseConfigured()) {
      recordPayload.id = 'calc_' + Math.random().toString(36).substr(2, 9);
      recordPayload.company_name = 'Muthukumar';
      recordPayload.size_label = '12 × 12 × 23¾';
      memoryCalculations.push(recordPayload);
      return res.status(201).json(recordPayload);
    }

    try {
      const savedRecord = await insertAdaptive('calculations', recordPayload);

      return res.status(201).json({
        ...savedRecord,
        customer_name: calculationData.customer_name,
        company_reference: '',
        company_name: savedRecord && savedRecord.companies ? savedRecord.companies.name : 'Unknown',
        size_label: savedRecord && savedRecord.company_sizes ? savedRecord.company_sizes.label : 'Unknown'
      });
    } catch (error) {
      console.error('Error saving calculation:', error);
      res.status(500).json({ message: 'Error saving calculation: ' + (error.message || 'Database error'), error: error.message });
    }
  } else {
    let parsedObj = {};
    try {
      parsedObj = JSON.parse(calculationData.customer_name);
    } catch (e) {
      parsedObj = { ref: calculationData.customer_name, productionFile: 'Ungrouped' };
    }

    const prodFileId = await getOrCreateFile(parsedObj.productionFile || 'Ungrouped', 'production', userId);
    const { companyId: validCompanyId, sizeId: validSizeId } = await resolveValidCompanyAndSize(calculationData.company_id, calculationData.size_id, false, null);

    if (!validCompanyId || !validSizeId) {
      return res.status(400).json({ message: 'Valid company_id and size_id pair are required to save production order.' });
    }

    const record = {
      user_id: toUuidOrNull(userId),
      company_id: validCompanyId,
      size_id: validSizeId,
      production_file_id: toUuidOrNull(prodFileId),
      quantity_of_boxes: Number(calculationData.quantity_of_boxes),
      ply_type: Number(calculationData.ply_type),
      flute_extra_percent: Number(calculationData.flute_extra_percent),
      gsm_paper: Number(calculationData.gsm_paper),
      gsm_flute: Number(calculationData.gsm_flute),
      gsm_packing: Number(calculationData.gsm_packing),
      bf: Number(calculationData.bf),
      quantity_of_data: Number(calculationData.quantity_of_data),
      reel_size_adjust: Number(calculationData.reel_size_adjust || 0),
      cut_size_adjust: Number(calculationData.cut_size_adjust || 0),
      reel_size: Number(calculationData.reel_size),
      cut_size: Number(calculationData.cut_size),
      paper: Number(calculationData.paper),
      flute: Number(calculationData.flute),
      weight_per_unit: Number(calculationData.weight_per_unit),
      box_weight: Number(calculationData.box_weight),
      p_option: parsedObj.pOption || 'N',
      l_option: parsedObj.lOption || 'N',
      ref_name: `[Meta:${calculationData.customer_name}] ${parsedObj.dateOfFinish ? `${parsedObj.ref || 'Production Order'} [FinishDate:${parsedObj.dateOfFinish}]` : (parsedObj.ref || 'Production Order')}`,
      reel_multiplier: parsedObj.reelMultiplier || 1,
      cut_multiplier: parsedObj.cutMultiplier || 1,
      size_multiplier: parsedObj.sizeMultiplier || 1,
      is_pad: !!parsedObj.isPad,
      is_partition: !!parsedObj.isPartition,
      is_tray: !!parsedObj.isTray,
      is_sleave: !!(parsedObj.isSleave || parsedObj.isTrayBox),
      is_coller_box: !!parsedObj.isCollerBox,
      is_top_side_tray_box: !!parsedObj.isTopSideTrayBox,
      is_universal_type: !!parsedObj.isUniversalType,
      is_full_closing_box: !!parsedObj.isFullClosingBox,
      created_at: new Date().toISOString()
    };

    // Only include paired partition fields if isPaired is true
    if (parsedObj.isPaired) {
      record.is_paired = true;
      record.p1_reel_cut = parsedObj.p1ReelCut || null;
      record.p2_reel_cut = parsedObj.p2ReelCut || null;
      record.p1_packing = parsedObj.p1Packing !== undefined ? Number(parsedObj.p1Packing) : 0;
      record.p2_packing = parsedObj.p2Packing !== undefined ? Number(parsedObj.p2Packing) : 0;
      record.p1_liner = parsedObj.p1Liner !== undefined ? Number(parsedObj.p1Liner) : 0;
      record.p2_liner = parsedObj.p2Liner !== undefined ? Number(parsedObj.p2Liner) : 0;
      record.p1_default_packing = parsedObj.p1DefaultPacking !== undefined ? Number(parsedObj.p1DefaultPacking) : 0;
      record.p2_default_packing = parsedObj.p2DefaultPacking !== undefined ? Number(parsedObj.p2DefaultPacking) : 0;
      record.p1_default_liner = parsedObj.p1DefaultLiner !== undefined ? Number(parsedObj.p1DefaultLiner) : 0;
      record.p2_default_liner = parsedObj.p2DefaultLiner !== undefined ? Number(parsedObj.p2DefaultLiner) : 0;
      record.p1_size_mm = parsedObj.p1SizeMM || null;
      record.p2_size_mm = parsedObj.p2SizeMM || null;
      record.p1_size_inch = parsedObj.p1SizeInch || null;
      record.p2_size_inch = parsedObj.p2SizeInch || null;
    }

    if (!isSupabaseConfigured()) {
      record.id = 'prod_' + Math.random().toString(36).substr(2, 9);
      record.company_name = 'Muthukumar';
      record.size_label = '12 × 12 × 23¾';
      record.customer_name = calculationData.customer_name;
      record.grand_total = 0;
      memoryProductionOrders.push(record);
      return res.status(201).json(record);
    }

    try {
      const savedRecord = await insertAdaptive('production_orders', record);
      res.status(201).json({
        ...savedRecord,
        customer_name: calculationData.customer_name,
        company_reference: '',
        grand_total: 0,
        company_name: savedRecord.companies ? savedRecord.companies.name : 'Unknown',
        size_label: savedRecord.company_sizes ? savedRecord.company_sizes.label : 'Unknown'
      });
    } catch (error) {
      console.error('Error saving production order:', error);
      res.status(500).json({ message: 'Error saving production order', error: error.message });
    }
  }
});

// PUT /api/customers/:id - Update existing calculation or production order
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const calculationData = req.body;
  const userId = req.user.userId || req.user.id;
  const grandTotal = Number(calculationData.grand_total || 0);

  let existingRecord = null;
  if (isSupabaseConfigured()) {
    try {
      const { data: cRec } = await supabase.from('calculations').select('company_id, size_id').eq('id', id).maybeSingle();
      if (cRec) existingRecord = cRec;
      else {
        const { data: pRec } = await supabase.from('production_orders').select('company_id, size_id').eq('id', id).maybeSingle();
        if (pRec) existingRecord = pRec;
      }
    } catch(e) {}
  }

  if (grandTotal > 0) {
    const { cleanName, isDuplex, duplexPrice, isLaminated, laminationPrice, isPrinting, printingPrice, isInk, inkPrice, isScreenPrinting, screenPrintingPrice, isCallico, callicoPrice } = parseTagsAndCleanName(calculationData.customer_name);
    
    // Run all 3 file/validation operations in parallel (they are independent of each other)
    const [customerFileId, companyFileId, { companyId: validCompanyId, sizeId: validSizeId }] = await Promise.all([
      getOrCreateFile(cleanName, 'customer_copy', userId),
      getOrCreateFile(calculationData.company_reference || 'Ungrouped', 'company_copy', userId),
      resolveValidCompanyAndSize(calculationData.company_id, calculationData.size_id, true, existingRecord)
    ]);

    if (!validCompanyId || !validSizeId) {
      return res.status(400).json({ message: 'Valid company_id and size_id pair are required to update record.' });
    }

    const updateFields = {
      company_id: validCompanyId,
      size_id: validSizeId,
      customer_file_id: customerFileId,
      company_file_id: companyFileId,
      customer_name: calculationData.customer_name,
      company_reference: calculationData.company_reference || '',
      calc_type: calculationData.calc_type || '',
      quantity_of_boxes: Number(calculationData.quantity_of_boxes),
      ply_type: Number(calculationData.ply_type),
      flute_extra_percent: Number(calculationData.flute_extra_percent),
      price_per_kg: Number(calculationData.price_per_kg),
      gsm: calculationData.gsm || calculationData.gsm_paper,
      gsm_paper: Number(calculationData.gsm_paper),
      gsm_flute: Number(calculationData.gsm_flute),
      gsm_packing: Number(calculationData.gsm_packing),
      bf: Number(calculationData.bf),
      quantity_of_data: Number(calculationData.quantity_of_data),
      gst_percent: Number(calculationData.gst_percent),
      reel_size_adjust: Number(calculationData.reel_size_adjust || 0),
      cut_size_adjust: Number(calculationData.cut_size_adjust || 0),
      reel_size: Number(calculationData.reel_size),
      cut_size: Number(calculationData.cut_size),
      paper: Number(calculationData.paper),
      flute: Number(calculationData.flute),
      weight_per_unit: Number(calculationData.weight_per_unit),
      box_weight: Number(calculationData.box_weight),
      single_box_price: Number(calculationData.single_box_price),
      total_cost: Number(calculationData.total_cost),
      gst_amount: Number(calculationData.gst_amount),
      grand_total: Number(calculationData.grand_total),
      is_duplex: calculationData.is_duplex !== undefined ? !!calculationData.is_duplex : isDuplex,
      duplex_price: calculationData.duplex_price !== undefined ? Number(calculationData.duplex_price) : duplexPrice,
      is_laminated: calculationData.is_laminated !== undefined ? !!calculationData.is_laminated : isLaminated,
      lamination_price: calculationData.lamination_price !== undefined ? Number(calculationData.lamination_price) : laminationPrice,
      is_printing: calculationData.is_printing !== undefined ? !!calculationData.is_printing : isPrinting,
      printing_price: calculationData.printing_price !== undefined ? Number(calculationData.printing_price) : printingPrice,
      is_ink: calculationData.is_ink !== undefined ? !!calculationData.is_ink : isInk,
      ink_price: calculationData.ink_price !== undefined ? Number(calculationData.ink_price) : inkPrice,
      is_screen_printing: calculationData.is_screen_printing !== undefined ? !!calculationData.is_screen_printing : isScreenPrinting,
      screen_printing_price: calculationData.screen_printing_price !== undefined ? Number(calculationData.screen_printing_price) : screenPrintingPrice,
      is_callico: calculationData.is_callico !== undefined ? !!calculationData.is_callico : isCallico,
      callico_price: calculationData.callico_price !== undefined ? Number(calculationData.callico_price) : callicoPrice,
      per_piece_price: calculationData.per_piece_price !== undefined ? (calculationData.per_piece_price !== null ? Number(calculationData.per_piece_price) : null) : null,
      kraft_box_cost: calculationData.kraft_box_cost !== undefined ? (calculationData.kraft_box_cost !== null ? Number(calculationData.kraft_box_cost) : null) : null,
      kraft_subtotal: calculationData.kraft_subtotal !== undefined ? (calculationData.kraft_subtotal !== null ? Number(calculationData.kraft_subtotal) : null) : null,
      duplex_box_cost: calculationData.duplex_box_cost !== undefined ? (calculationData.duplex_box_cost !== null ? Number(calculationData.duplex_box_cost) : null) : null,
      duplex_subtotal: calculationData.duplex_subtotal !== undefined ? (calculationData.duplex_subtotal !== null ? Number(calculationData.duplex_subtotal) : null) : null
    };

    if (!isSupabaseConfigured()) {
      const idx = memoryCalculations.findIndex(c => c.id === id);
      if (idx !== -1) {
        memoryCalculations[idx] = { ...memoryCalculations[idx], ...updateFields };
        return res.json(memoryCalculations[idx]);
      }
      return res.status(404).json({ message: 'Calculation not found' });
    }

    try {
      const { data: updatedRecord, error } = await supabase
        .from('calculations')
        .update(updateFields)
        .eq('id', id)
        .select('*, companies(name), company_sizes(*)')
        .single();

      if (error) throw error;
      res.json({
        ...updatedRecord,
        customer_name: calculationData.customer_name,
        company_reference: calculationData.company_reference || ''
      });
    } catch (error) {
      console.error('Error updating calculation:', error);
      res.status(500).json({ message: 'Error updating calculation', error: error.message });
    }
  } else {
    let parsedObj = {};
    try {
      parsedObj = JSON.parse(calculationData.customer_name);
    } catch (e) {
      parsedObj = { ref: calculationData.customer_name, productionFile: 'Ungrouped' };
    }

    const prodFileId = await getOrCreateFile(parsedObj.productionFile || 'Ungrouped', 'production', userId);
    const { companyId: validCompanyId, sizeId: validSizeId } = await resolveValidCompanyAndSize(calculationData.company_id, calculationData.size_id, true, existingRecord);

    if (!validCompanyId || !validSizeId) {
      return res.status(400).json({ message: 'Valid company_id and size_id pair are required to update production order.' });
    }

    const updateFields = {
      company_id: validCompanyId,
      size_id: validSizeId,
      production_file_id: prodFileId,
      quantity_of_boxes: Number(calculationData.quantity_of_boxes),
      ply_type: Number(calculationData.ply_type),
      flute_extra_percent: Number(calculationData.flute_extra_percent),
      gsm_paper: Number(calculationData.gsm_paper),
      gsm_flute: Number(calculationData.gsm_flute),
      gsm_packing: Number(calculationData.gsm_packing),
      bf: Number(calculationData.bf),
      quantity_of_data: Number(calculationData.quantity_of_data),
      reel_size_adjust: Number(calculationData.reel_size_adjust || 0),
      cut_size_adjust: Number(calculationData.cut_size_adjust || 0),
      reel_size: Number(calculationData.reel_size),
      cut_size: Number(calculationData.cut_size),
      paper: Number(calculationData.paper),
      flute: Number(calculationData.flute),
      weight_per_unit: Number(calculationData.weight_per_unit),
      box_weight: Number(calculationData.box_weight),
      p_option: parsedObj.pOption || 'N',
      l_option: parsedObj.lOption || 'N',
      ref_name: `[Meta:${calculationData.customer_name}] ${parsedObj.dateOfFinish ? `${parsedObj.ref || 'Production Order'} [FinishDate:${parsedObj.dateOfFinish}]` : (parsedObj.ref || 'Production Order')}`,
      reel_multiplier: parsedObj.reelMultiplier || 1,
      cut_multiplier: parsedObj.cutMultiplier || 1,
      size_multiplier: parsedObj.sizeMultiplier || 1,
      is_pad: !!parsedObj.isPad,
      is_partition: !!parsedObj.isPartition,
      is_tray: !!parsedObj.isTray,
      is_sleave: !!(parsedObj.isSleave || parsedObj.isTrayBox),
      is_coller_box: !!parsedObj.isCollerBox,
      is_top_side_tray_box: !!parsedObj.isTopSideTrayBox,
      is_universal_type: !!parsedObj.isUniversalType,
      is_full_closing_box: !!parsedObj.isFullClosingBox
    };

    // Only include paired partition fields if isPaired is true
    if (parsedObj.isPaired) {
      updateFields.is_paired = true;
      updateFields.p1_reel_cut = parsedObj.p1ReelCut || null;
      updateFields.p2_reel_cut = parsedObj.p2ReelCut || null;
      updateFields.p1_packing = parsedObj.p1Packing !== undefined ? Number(parsedObj.p1Packing) : 0;
      updateFields.p2_packing = parsedObj.p2Packing !== undefined ? Number(parsedObj.p2Packing) : 0;
      updateFields.p1_liner = parsedObj.p1Liner !== undefined ? Number(parsedObj.p1Liner) : 0;
      updateFields.p2_liner = parsedObj.p2Liner !== undefined ? Number(parsedObj.p2Liner) : 0;
      updateFields.p1_default_packing = parsedObj.p1DefaultPacking !== undefined ? Number(parsedObj.p1DefaultPacking) : 0;
      updateFields.p2_default_packing = parsedObj.p2DefaultPacking !== undefined ? Number(parsedObj.p2DefaultPacking) : 0;
      updateFields.p1_default_liner = parsedObj.p1DefaultLiner !== undefined ? Number(parsedObj.p1DefaultLiner) : 0;
      updateFields.p2_default_liner = parsedObj.p2DefaultLiner !== undefined ? Number(parsedObj.p2DefaultLiner) : 0;
      updateFields.p1_size_mm = parsedObj.p1SizeMM || null;
      updateFields.p2_size_mm = parsedObj.p2SizeMM || null;
      updateFields.p1_size_inch = parsedObj.p1SizeInch || null;
      updateFields.p2_size_inch = parsedObj.p2SizeInch || null;
    }

    if (!isSupabaseConfigured()) {
      const idx = memoryProductionOrders.findIndex(p => p.id === id);
      if (idx !== -1) {
        memoryProductionOrders[idx] = { ...memoryProductionOrders[idx], ...updateFields };
        return res.json(memoryProductionOrders[idx]);
      }
      return res.status(404).json({ message: 'Production order not found' });
    }

    try {
      const { data: updatedRecord, error } = await supabase
        .from('production_orders')
        .update(updateFields)
        .eq('id', id)
        .select('*, companies(name), company_sizes(*)')
        .single();

      if (error) throw error;
      res.json({
        ...updatedRecord,
        customer_name: calculationData.customer_name,
        company_reference: ''
      });
    } catch (error) {
      console.error('Error updating production order:', error);
      res.status(500).json({ message: 'Error updating production order', error: error.message });
    }
  }
});

// DELETE /api/customers/:id - Delete record from calculations or production_orders
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  if (!isSupabaseConfigured()) {
    memoryProductionOrders = memoryProductionOrders.filter(p => p.id !== id);
    memoryCalculations = memoryCalculations.filter(c => c.id !== id);
    return res.json({ success: true, message: 'Deleted successfully' });
  }

  try {
    const { data: prodRecord } = await supabase.from('production_orders').select('id').eq('id', id).maybeSingle();
    if (prodRecord) {
      await supabase.from('production_orders').delete().eq('id', id);
      return res.json({ success: true, message: 'Production order deleted successfully' });
    }

    const { error: calcErr } = await supabase.from('calculations').delete().eq('id', id);
    if (calcErr) throw calcErr;

    res.json({ success: true, message: 'Calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculation:', error);
    res.status(500).json({ message: 'Error deleting calculation', error: error.message });
  }
});

const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Helper function to purge all user calculations, production orders, and orphaned files
async function purgeUserDataFromCustomers(userId, username) {
  const idsToMatch = [userId, username].filter(Boolean);

  if (isSupabaseConfigured()) {
    try {
      const validUserId = isUuid(userId) ? userId : null;

      if (validUserId) {
        // 1. Get file IDs referenced by calculations to be deleted
        const { data: userCalcs } = await supabase
          .from('calculations')
          .select('customer_file_id, company_file_id')
          .eq('user_id', validUserId);

        const fileIdsToCheck = new Set();
        (userCalcs || []).forEach(c => {
          if (c.customer_file_id) fileIdsToCheck.add(c.customer_file_id);
          if (c.company_file_id) fileIdsToCheck.add(c.company_file_id);
        });

        // 2. Get file IDs referenced by production orders to be deleted
        const { data: userProds } = await supabase
          .from('production_orders')
          .select('production_file_id')
          .eq('user_id', validUserId);

        (userProds || []).forEach(p => {
          if (p.production_file_id) fileIdsToCheck.add(p.production_file_id);
        });

        // 3. Delete calculations for this user
        const { error: delCalcErr } = await supabase
          .from('calculations')
          .delete()
          .eq('user_id', validUserId);

        if (delCalcErr) console.error('Error deleting user calculations from Supabase:', delCalcErr);

        // 4. Delete production_orders for this user
        const { error: delProdErr } = await supabase
          .from('production_orders')
          .delete()
          .eq('user_id', validUserId);

        if (delProdErr) console.error('Error deleting user production orders from Supabase:', delProdErr);

        // 5. Clean up orphaned files in files table
        for (const fileId of fileIdsToCheck) {
          if (!fileId) continue;

          // Check if any remaining calculations use this file ID
          const { data: calcCheck } = await supabase
            .from('calculations')
            .select('id')
            .or(`customer_file_id.eq.${fileId},company_file_id.eq.${fileId}`)
            .limit(1);

          // Check if any remaining production orders use this file ID
          const { data: prodCheck } = await supabase
            .from('production_orders')
            .select('id')
            .eq('production_file_id', fileId)
            .limit(1);

          if ((!calcCheck || calcCheck.length === 0) && (!prodCheck || prodCheck.length === 0)) {
            // File has no remaining calculations or production orders -> delete it safely
            await supabase.from('files').delete().eq('id', fileId);
          }
        }
      }
    } catch (err) {
      console.error('Error purging customer data from Supabase:', err);
    }
  }

  // Memory mode cleanup
  memoryCalculations = memoryCalculations.filter(c => !idsToMatch.includes(c.user_id));
  memoryProductionOrders = memoryProductionOrders.filter(p => !idsToMatch.includes(p.user_id));

  // Clean memoryFiles if no remaining memory calculations or production orders use them
  const remainingFileNames = new Set();
  memoryCalculations.forEach(c => {
    const details = parseTagsAndCleanName(c.customer_name);
    if (details.cleanName && details.cleanName !== 'Ungrouped') remainingFileNames.add(details.cleanName);
    if (c.company_reference && c.company_reference.trim() !== 'Ungrouped') remainingFileNames.add(c.company_reference.trim());
  });
  memoryProductionOrders.forEach(p => {
    try {
      const parsed = JSON.parse(p.customer_name);
      if (parsed.productionFile && parsed.productionFile !== 'Ungrouped') remainingFileNames.add(parsed.productionFile);
    } catch(e){}
  });

  memoryFiles = memoryFiles.filter(f => remainingFileNames.has(f.name));
}

router.purgeUserDataFromCustomers = purgeUserDataFromCustomers;
module.exports = router;
module.exports.purgeUserDataFromCustomers = purgeUserDataFromCustomers;

