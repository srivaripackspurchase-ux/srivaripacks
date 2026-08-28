const supabase = require('../server/config/supabase');

async function checkUsersAndMigration() {
  console.log('--- Checking Users table ---');
  const { data: users, error: userErr } = await supabase.from('users').select('id, username').limit(5);
  console.log('Users:', users, 'Error:', userErr);

  // Attempt to drop files_name_type_key constraint if possible via query or helper
  console.log('\n--- Checking Files table constraints ---');
  const { data: filesData, error: filesErr } = await supabase.from('files').select('id, user_id, name, type').limit(5);
  console.log('Files:', filesData, 'Error:', filesErr);
}

checkUsersAndMigration().then(() => process.exit(0));
