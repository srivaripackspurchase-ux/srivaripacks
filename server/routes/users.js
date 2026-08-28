const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const adminCheck = require('../middleware/adminCheck');
const asyncHandler = require('../middleware/asyncHandler');

const { purgeUserDataFromCustomers } = require('./customers');
const { purgeUserDataFromQuotations } = require('./quotations');
const { purgeUserDataFromAddressProfiles } = require('./toAddressProfiles');

// Protect all /api/users routes with JWT authentication & Admin authorization
router.use(authMiddleware);
router.use(adminCheck);

// Check Supabase status helper
const isSupabaseConfigured = () => {
  return process.env.SUPABASE_URL && 
         !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
         process.env.SUPABASE_KEY && 
         !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');
};

// In-Memory Mock Store Fallback (used only if Supabase is offline)
let mockUsersStore = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/users — List All Users
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.json(mockUsersStore);
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, full_name, role, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetch users error:', error);
    return res.status(500).json({ message: 'Error fetching users from database.' });
  }

  res.json(users || []);
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/users — Create New User or Admin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', asyncHandler(async (req, res) => {
  const { username, password, full_name, role, status } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const cleanUsername = username.trim();
  const userRole = role === 'admin' ? 'admin' : 'user';
  const userStatus = status === 'inactive' ? 'inactive' : 'active';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  if (!isSupabaseConfigured()) {
    const existing = mockUsersStore.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return res.status(400).json({ message: 'Username already exists.' });
    }
    const newUser = {
      id: `mock-${Date.now()}`,
      username: cleanUsername,
      full_name: full_name ? full_name.trim() : cleanUsername,
      role: userRole,
      status: userStatus,
      created_at: new Date().toISOString()
    };
    mockUsersStore.unshift(newUser);
    return res.status(201).json(newUser);
  }

  // Check username uniqueness in Supabase
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (existingUser) {
    return res.status(400).json({ message: 'Username already exists in database.' });
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert([
      {
        username: cleanUsername,
        password_hash: passwordHash,
        full_name: full_name ? full_name.trim() : cleanUsername,
        role: userRole,
        status: userStatus
      }
    ])
    .select('id, username, full_name, role, status, created_at')
    .single();

  if (error) {
    console.error('Supabase create user error:', error);
    return res.status(500).json({ message: error.message || 'Error creating user in database.' });
  }

  res.status(201).json(newUser);
}));

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUT /api/users/:id — Edit User Details / Password
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, password, full_name, role, status } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  const cleanUsername = username.trim();
  const userRole = role === 'admin' ? 'admin' : 'user';
  const userStatus = status === 'inactive' ? 'inactive' : 'active';

  // Prevent admin from deactivating or removing admin role from their own logged in account
  if (req.user.userId === id && (userStatus === 'inactive' || userRole !== 'admin')) {
    return res.status(400).json({ message: 'You cannot deactivate or demote your own active admin account.' });
  }

  if (!isSupabaseConfigured()) {
    const userIndex = mockUsersStore.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }
    mockUsersStore[userIndex] = {
      ...mockUsersStore[userIndex],
      username: cleanUsername,
      full_name: full_name ? full_name.trim() : cleanUsername,
      role: userRole,
      status: userStatus
    };
    return res.json(mockUsersStore[userIndex]);
  }

  // Check username uniqueness if changed
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('username', cleanUsername)
    .neq('id', id)
    .maybeSingle();

  if (existingUser) {
    return res.status(400).json({ message: 'Username is already taken by another account.' });
  }

  const updateData = {
    username: cleanUsername,
    full_name: full_name ? full_name.trim() : cleanUsername,
    role: userRole,
    status: userStatus
  };

  // Optional password update
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    updateData.password_hash = await bcrypt.hash(password.trim(), salt);
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select('id, username, full_name, role, status, created_at')
    .single();

  if (error) {
    console.error('Supabase update user error:', error);
    return res.status(500).json({ message: error.message || 'Error updating user in database.' });
  }

  res.json(updatedUser);
}));

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATCH /api/users/:id/status — Toggle Active/Inactive Status
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be active or inactive.' });
  }

  if (req.user.userId === id && status === 'inactive') {
    return res.status(400).json({ message: 'You cannot deactivate your own active admin account.' });
  }

  if (!isSupabaseConfigured()) {
    const userIndex = mockUsersStore.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found.' });
    }
    mockUsersStore[userIndex].status = status;
    return res.json(mockUsersStore[userIndex]);
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', id)
    .select('id, username, full_name, role, status, created_at')
    .single();

  if (error) {
    console.error('Supabase status toggle error:', error);
    return res.status(500).json({ message: error.message || 'Error updating user status.' });
  }

  res.json(updatedUser);
}));

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /api/users/:id — Delete User Account & All Associated Data
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.userId === id) {
    return res.status(400).json({ message: 'You cannot delete your own active admin account.' });
  }

  let targetUsername = null;

  if (isSupabaseConfigured()) {
    // 1. Fetch user record to resolve username
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', id)
      .maybeSingle();

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    targetUsername = targetUser.username;

    // 2. Purge all related user data (files, calculations, production orders, quotations, storage PDFs, address profiles)
    await purgeUserDataFromCustomers(id, targetUsername);
    await purgeUserDataFromQuotations(id, targetUsername);
    await purgeUserDataFromAddressProfiles(id, targetUsername);

    // 3. Delete user record from database
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete user error:', error);
      return res.status(500).json({ message: error.message || 'Error deleting user from database.' });
    }

    return res.json({ message: `User "@${targetUsername}" and all associated files, calculations, quotations, and profiles were deleted successfully.` });
  }

  // Memory mode fallback
  const userIndex = mockUsersStore.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found.' });
  }

  targetUsername = mockUsersStore[userIndex].username;

  await purgeUserDataFromCustomers(id, targetUsername);
  await purgeUserDataFromQuotations(id, targetUsername);
  await purgeUserDataFromAddressProfiles(id, targetUsername);

  mockUsersStore.splice(userIndex, 1);
  res.json({ message: `User "@${targetUsername}" and all associated files, calculations, quotations, and profiles were deleted successfully.` });
}));


module.exports = router;
