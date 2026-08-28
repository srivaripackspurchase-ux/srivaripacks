require('dotenv').config({ path: require('path').resolve(__dirname, './server/.env') });
const supabase = require('./server/config/supabase');

async function testSupabase() {
  console.log('Testing Supabase Connection...');
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Successfully fetched companies from Supabase:', companies);
    }

    const { data: sizes, error: sizesError } = await supabase
      .from('company_sizes')
      .select('*');

    if (sizesError) {
      console.error('Supabase Sizes Error:', sizesError);
    } else {
      console.log('Successfully fetched sizes from Supabase:', sizes.length, 'records');
    }
  } catch (err) {
    console.error('Catch Error:', err);
  }
}

testSupabase();
