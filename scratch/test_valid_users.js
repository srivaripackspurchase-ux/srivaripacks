const supabase = require('../server/config/supabase');

async function testWithValidUsers() {
  console.log('=== TESTING FILE SCOPING WITH VALID USER IDs ===\n');

  const userA_ID = '4b736c01-4024-464c-b137-4e29440613d0'; // BALAJI
  const userB_ID = 'd8b52e36-4920-4421-bf10-fc096b70b135'; // sandy

  // Clean up any test files named 'UnitTestFile'
  await supabase.from('files').delete().ilike('name', 'UnitTestFile%');

  console.log('1. User A (BALAJI) creates "UnitTestFile" in Customers (customer_copy)...');
  const res1 = await supabase.from('files').insert({
    user_id: userA_ID,
    name: 'UnitTestFile',
    type: 'customer_copy'
  }).select().single();
  console.log('   Result 1:', res1.error ? 'ERROR: ' + res1.error.message : 'SUCCESS ID=' + res1.data.id);

  console.log('\n2. User A (BALAJI) creates "UnitTestFile" in Production History (production)...');
  const res2 = await supabase.from('files').insert({
    user_id: userA_ID,
    name: 'UnitTestFile',
    type: 'production'
  }).select().single();
  console.log('   Result 2:', res2.error ? 'ERROR: ' + res2.error.message : 'SUCCESS ID=' + res2.data.id);

  console.log('\n3. User B (sandy) creates "UnitTestFile" in Customers (customer_copy)...');
  const res3 = await supabase.from('files').insert({
    user_id: userB_ID,
    name: 'UnitTestFile',
    type: 'customer_copy'
  }).select().single();
  console.log('   Result 3:', res3.error ? 'ERROR: ' + res3.error.message : 'SUCCESS ID=' + res3.data.id);

  console.log('\n4. User B (sandy) creates "UnitTestFile" in Production History (production)...');
  const res4 = await supabase.from('files').insert({
    user_id: userB_ID,
    name: 'UnitTestFile',
    type: 'production'
  }).select().single();
  console.log('   Result 4:', res4.error ? 'ERROR: ' + res4.error.message : 'SUCCESS ID=' + res4.data.id);

  // Clean up test files created
  await supabase.from('files').delete().ilike('name', 'UnitTestFile%');
}

testWithValidUsers().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
