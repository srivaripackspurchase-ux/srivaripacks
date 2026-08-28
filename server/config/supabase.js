const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE') || supabaseKey.includes('YOUR_SUPABASE')) {
  console.warn('⚠️ WARNING: Supabase URL or Key is not configured correctly in server/.env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
