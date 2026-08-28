const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const asyncHandler = require('../middleware/asyncHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforboxmanufacturingapp12345!';

// ==========================================
// 1. USER LOGIN ENDPOINT
// ==========================================
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Check Supabase configuration status
  const isSupabaseConfigured = process.env.SUPABASE_URL && 
                               !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
                               process.env.SUPABASE_KEY && 
                               !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');

  if (!isSupabaseConfigured) {
    const defaultUser = process.env.APP_USER_NAME;
    const defaultPass = process.env.APP_USER_PASS;
    if (defaultUser && defaultPass && username === defaultUser && password === defaultPass) {
      const token = jwt.sign(
        { userId: 'mock-user-id', username, role: 'user', full_name: 'SRI VARI PACKS User' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        token,
        user: { id: 'mock-user-id', username, role: 'user', full_name: 'SRI VARI PACKS User' }
      });
    }
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const cleanUsername = (username || '').trim();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (error || !user) {
    return res.status(401).json({ message: 'User not found or invalid credentials' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ message: 'Your account has been deactivated. Please contact an administrator.' });
  }

  // Ensure user is not an admin attempting user login if strictly separated
  if (user.role === 'admin') {
    return res.status(401).json({ message: 'Admin credentials cannot be used in User Login. Please use Admin Login.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    }
  });
}));

// ==========================================
// 2. SEPARATE ADMIN LOGIN ENDPOINT
// ==========================================
router.post('/admin-login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Admin username and password are required' });
  }

  const isSupabaseConfigured = process.env.SUPABASE_URL && 
                               !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
                               process.env.SUPABASE_KEY && 
                               !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');

  if (!isSupabaseConfigured) {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminUser && adminPass && username === adminUser && password === adminPass) {
      const token = jwt.sign(
        { userId: 'mock-admin-id', username, role: 'admin', full_name: 'SRI VARI PACKS Administrator' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({
        token,
        user: { id: 'mock-admin-id', username, role: 'admin', full_name: 'SRI VARI PACKS Administrator' }
      });
    }
    return res.status(401).json({ message: 'Invalid admin credentials.' });
  }

  const cleanUsername = (username || '').trim();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', cleanUsername)
    .eq('role', 'admin')
    .maybeSingle();

  if (error || !user) {
    return res.status(401).json({ message: 'Admin account not found or unauthorized credentials.' });
  }

  if (user.status === 'inactive') {
    return res.status(403).json({ message: 'Your admin account has been deactivated.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid admin username or password' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: 'admin', full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: 'admin',
      full_name: user.full_name
    }
  });
}));

module.exports = router;
