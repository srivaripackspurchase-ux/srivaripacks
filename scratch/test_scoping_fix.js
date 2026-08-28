const supabase = require('../server/config/supabase');
const customersRouter = require('../server/routes/customers');

// Extract getOrCreateFile from module or require context
async function testScoping() {
  console.log('=== STARTING USER & MODULE SCOPING TEST ===\n');

  const userA_ID = '00000000-0000-0000-0000-00000000000a';
  const userB_ID = '00000000-0000-0000-0000-00000000000b';

  // Clean up any test records from prior runs
  await supabase.from('files').delete().in('user_id', [userA_ID, userB_ID]);

  console.log('1. User A creates "Customer" in Customers (customer_copy)...');
  const fileA_Cust = await supabase.from('files').insert({
    user_id: userA_ID,
    name: 'Customer',
    type: 'customer_copy'
  }).select().single();
  console.log('   Result:', fileA_Cust.error ? 'ERROR: ' + fileA_Cust.error.message : 'SUCCESS (ID: ' + fileA_Cust.data.id + ', Name: ' + fileA_Cust.data.name + ')');

  console.log('\n2. User A creates "Customer" in Production History (production)...');
  const fileA_Prod = await supabase.from('files').insert({
    user_id: userA_ID,
    name: 'Customer',
    type: 'production'
  }).select().single();
  console.log('   Result:', fileA_Prod.error ? 'ERROR: ' + fileA_Prod.error.message : 'SUCCESS (ID: ' + fileA_Prod.data.id + ', Name: ' + fileA_Prod.data.name + ')');

  console.log('\n3. User B creates "Customer" in Customers (customer_copy)...');
  const fileB_Cust = await supabase.from('files').insert({
    user_id: userB_ID,
    name: 'Customer',
    type: 'customer_copy'
  }).select().single();
  console.log('   Result:', fileB_Cust.error ? 'ERROR: ' + fileB_Cust.error.message : 'SUCCESS (ID: ' + fileB_Cust.data.id + ', Name: ' + fileB_Cust.data.name + ')');

  console.log('\n4. User B creates "Customer" in Production History (production)...');
  const fileB_Prod = await supabase.from('files').insert({
    user_id: userB_ID,
    name: 'Customer',
    type: 'production'
  }).select().single();
  console.log('   Result:', fileB_Prod.error ? 'ERROR: ' + fileB_Prod.error.message : 'SUCCESS (ID: ' + fileB_Prod.data.id + ', Name: ' + fileB_Prod.data.name + ')');

  console.log('\n5. User A renames "Customer" to "Customer_Renamed" in Customers...');
  const { data: renameRes, error: renameErr } = await supabase
    .from('files')
    .update({ name: 'Customer_Renamed' })
    .eq('id', fileA_Cust.data.id)
    .eq('user_id', userA_ID)
    .select().single();
  console.log('   Result:', renameErr ? 'ERROR: ' + renameErr.message : 'SUCCESS (New Name: ' + renameRes.name + ')');

  console.log('\n6. Verifying isolate state of all 4 files after rename...');
  const { data: allFiles } = await supabase.from('files').select('*').in('user_id', [userA_ID, userB_ID]);
  console.log('   Active Files State:');
  allFiles.forEach(f => {
    const userLabel = f.user_id === userA_ID ? 'User A' : 'User B';
    console.log(`   - [${userLabel}] Module: ${f.type.padEnd(15)} | Name: ${f.name}`);
  });

  console.log('\n7. User A deletes "Customer_Renamed" in Customers...');
  await supabase.from('files').delete().eq('id', fileA_Cust.data.id);

  console.log('\n8. Final State Check after deletion:');
  const { data: remainingFiles } = await supabase.from('files').select('*').in('user_id', [userA_ID, userB_ID]);
  remainingFiles.forEach(f => {
    const userLabel = f.user_id === userA_ID ? 'User A' : 'User B';
    console.log(`   - [${userLabel}] Module: ${f.type.padEnd(15)} | Name: ${f.name}`);
  });

  // Cleanup test UUID records
  await supabase.from('files').delete().in('user_id', [userA_ID, userB_ID]);

  console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
}

testScoping().then(() => process.exit(0)).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
