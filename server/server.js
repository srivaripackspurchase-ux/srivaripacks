// Server entry point - updated for multi-reel cut persistence
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local React dev compatibility
  crossOriginEmbedderPolicy: false
}));

// Rate limiter for authentication endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' }
});

// Enable CORS
app.use(cors({
  origin: '*', // For local dev, allow everything. Restrict to client domain in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers (50mb limit for PDF base64 payloads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Print active modes
console.log('------------------------------------------------');
const isSupabaseConfigured = process.env.SUPABASE_URL && 
                             !process.env.SUPABASE_URL.includes('YOUR_SUPABASE') &&
                             process.env.SUPABASE_KEY && 
                             !process.env.SUPABASE_KEY.includes('YOUR_SUPABASE');

if (isSupabaseConfigured) {
  console.log('📡 SERVER STATUS: Connected to Supabase Cloud');
} else {
  console.log('⚠️ SERVER STATUS: Running in Mock/In-Memory Mode.');
}
console.log('------------------------------------------------');

// Health Check
app.use('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: isSupabaseConfigured ? 'supabase' : 'memory',
    timestamp: new Date().toISOString()
  });
});

// Import Routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const customerRoutes = require('./routes/customers');
const userRoutes = require('./routes/users');
const quotationRoutes = require('./routes/quotations');
const toAddressRoutes = require('./routes/toAddressProfiles');

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/to-address-profiles', toAddressRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start listening when executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

module.exports = app;
