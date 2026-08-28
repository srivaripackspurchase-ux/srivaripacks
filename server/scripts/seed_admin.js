const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

async function seedAdmin() {
  const args = process.argv.slice(2);
  const username = args[0] ? args[0].trim().toLowerCase() : '';
  const rawPassword = args[1] || '';
  const fullName = args[2] || (username ? `${username.toUpperCase()} Admin` : '');

  console.log('================================================');
  console.log('🔑 SRI VARI PACKS — Admin Account Setup Tool');
  console.log('================================================');

  if (!username || !rawPassword) {
    console.log('❌ Error: Username and password must be provided via command line arguments.');
    console.log('Usage: node scripts/seed_admin.js <username> <password> "[Full Name]"');
    console.log('Example: node scripts/seed_admin.js admin_user SecurePass123 "System Admin"');
    console.log('================================================');
    process.exit(1);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (existingUser) {
      // Update existing account
      let updatePayload = {
        password_hash: passwordHash,
        full_name: fullName,
        role: 'admin'
      };
      if (existingUser.status !== undefined) {
        updatePayload.status = 'active';
      }
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id);

      if (error) {
        console.error('❌ Error updating admin user:', error.message);
        process.exit(1);
      }
      console.log(`✅ Existing account "${username}" updated successfully!`);
    } else {
      // Try insert with status first, fallback without status if column not in DB yet
      let insertPayload = {
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'admin',
        status: 'active'
      };
      let { error } = await supabase.from('users').insert([insertPayload]);
      if (error && error.message.includes('status')) {
        delete insertPayload.status;
        const fallbackRes = await supabase.from('users').insert([insertPayload]);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('❌ Error creating admin user:', error.message);
        if (error.message.includes('row-level security policy')) {
          console.log('\n================================================');
          console.log('📌 SUPABASE RLS SECURITY POLICY FIX');
          console.log('================================================');
          console.log('Your Supabase `users` table has Row Level Security enabled.');
          console.log('Please copy & run this SQL query inside your Supabase SQL Editor:\n');
          console.log(`-- 1. Enable RLS insert policy`);
          console.log(`CREATE POLICY "Allow public insert on users" ON users FOR INSERT WITH CHECK (true);`);
          console.log(`CREATE POLICY "Allow public select on users" ON users FOR SELECT USING (true);`);
          console.log(`CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true) WITH CHECK (true);\n`);
          console.log(`-- 2. OR insert this admin user directly:`);
          console.log(`INSERT INTO users (username, password_hash, full_name, role, status)`);
          console.log(`VALUES ('${username}', '${passwordHash}', '${fullName}', 'admin', 'active');`);
          console.log('================================================\n');
        }
        process.exit(1);
      }
      console.log(`✅ New Admin account created successfully!`);
    }

    console.log('------------------------------------------------');
    console.log('📋 ADMIN CREDENTIALS DETAILS:');
    console.log(`- Login Type: Admin Login`);
    console.log(`- Username:   ${username}`);
    console.log(`- Password:   ${rawPassword}`);
    console.log(`- Full Name:  ${fullName}`);
    console.log(`- Role:       admin`);
    console.log(`- Status:     active`);
    console.log('================================================');
  } catch (err) {
    console.error('❌ Unexpected error during admin setup:', err.message);
    process.exit(1);
  }
}

seedAdmin();
