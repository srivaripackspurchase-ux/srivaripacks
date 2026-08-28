const supabase = require('../server/config/supabase');

async function testFilesTable() {
  console.log('--- Testing Supabase Files Table Query ---');
  try {
    const { data, error } = await supabase.from('files').select('id, user_id, name, type').limit(5);
    if (error) {
      console.error('Error querying files table:', error);
    } else {
      console.log('Successfully queried files table. Data sample:', data);
    }
  } catch (err) {
    console.error('Exception querying files:', err);
  }
}

testFilesTable().then(() => process.exit(0));
