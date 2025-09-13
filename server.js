
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
// store uploads temporarily then move into assets
const upload = multer({ dest: path.join(__dirname, 'tmp_uploads') });
const { chromium } = require('playwright');
const axios = require('axios');

// Shared Playwright browser to avoid launching per-request (speeds up scraping)
let sharedBrowser = null;
let sharedBrowserLaunching = false;

const getSharedBrowser = async () => {
  if (sharedBrowser) return sharedBrowser;
  if (sharedBrowserLaunching) {
    // wait until browser is launched
    while (sharedBrowserLaunching && !sharedBrowser) {
      await new Promise(r => setTimeout(r, 100));
    }
    return sharedBrowser;
  }

  try {
    sharedBrowserLaunching = true;
    sharedBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    sharedBrowserLaunching = false;
    return sharedBrowser;
  } catch (e) {
    sharedBrowserLaunching = false;
    throw e;
  }
};

// Helper: parse width from common URL tokens (Flipkart, Amazon, general patterns)
const getWidthFromUrl = (u) => {
  if (!u || typeof u !== 'string') return null;
  try {
    let m;
    // Flipkart style /image/800x800/
    m = u.match(/\/image\/(\d{2,5})x(\d{2,5})\//i);
    if (m) return parseInt(m[1], 10);
    // explicit WxH e.g., 800x800 in filename
    m = u.match(/(\d{2,5})x(\d{2,5})/);
    if (m) return parseInt(m[1], 10);
    // Amazon _SX800_ or _SY800_
    m = u.match(/_SX(\d{2,5})_/i);
    if (m) return parseInt(m[1], 10);
    m = u.match(/_SY(\d{2,5})_/i);
    if (m) return parseInt(m[1], 10);
    // path segments like /800/800/
    m = u.match(/\/(\d{2,5})\/(\d{2,5})\//);
    if (m) return parseInt(m[1], 10);
  } catch (e) {}
  return null;
};

// Helper: filter images by minimum width. Uses URL tokens first, then HEAD size heuristic as fallback.
const filterImagesByMinWidth = async (images, minWidth = 400) => {
  if (!Array.isArray(images) || images.length === 0) return images;

  const kept = [];
  const toHead = [];

  for (const img of images) {
    const w = getWidthFromUrl(img);
    if (w !== null) {
      if (w >= minWidth) kept.push(img);
      continue;
    }
    toHead.push(img);
  }

  // For URLs without tokens, do a fast HEAD and accept if content-length > threshold
  const headThreshold = 20 * 1024; // 20 KB
  if (toHead.length > 0) {
    const headChecks = toHead.map(async (url) => {
      try {
        const resp = await axios.head(url, { timeout: 3000, maxRedirects: 3 });
        const len = resp.headers && resp.headers['content-length'] ? parseInt(resp.headers['content-length'], 10) : 0;
        if (!isNaN(len) && len >= headThreshold) {
          kept.push(url);
        }
      } catch (e) {
        // ignore failures; do not keep the image
      }
    });

    await Promise.all(headChecks);
  }

  // If filtering stripped everything, return the original list as a fallback
  return kept.length > 0 ? kept : images;
};

// Import security middleware
const { securityHeaders } = require('./middleware/security');

// Configuration
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// In-memory recent view increments to prevent rapid duplicate increments per session/IP
// Key format: `${dealId}:${sessionIdOrIp}` -> timestamp (ms)
const recentViewIncrements = new Map();

// Parse JSON bodies
app.use(express.json());

// Development-friendly Content Security Policy to allow browser Console fetches
// (only loosened for local development). This ensures connect-src includes self so
// fetch('/api/...') from the served pages is allowed.
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Allow scripts/styles/images from self, and allow XHR/fetch to same origin
    const policy = "default-src 'self'; connect-src 'self' http://localhost:3000 ws://localhost:3000; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' data:;";
    res.setHeader('Content-Security-Policy', policy);
    next();
  });
} else {
  // Apply security headers (CSP, HSTS, etc.) only in production
  app.use(securityHeaders);
}

// Parse cookies early so middleware that relies on req.cookies works (requireSuperAdmin)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Access control middleware - check for early access cookie
app.use((req, res, next) => {
  // Skip API routes, static assets, and common web assets
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/assets/') ||
      req.path === '/favicon.ico' ||
      req.path.startsWith('/_expo/') ||
      req.path.endsWith('.js') ||
      req.path.endsWith('.css') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.jpg') ||
      req.path.endsWith('.jpeg') ||
      req.path.endsWith('.gif') ||
      req.path.endsWith('.svg') ||
      req.path.endsWith('.ico') ||
      req.path.endsWith('.map')) {
    return next();
  }

  // Check maintenance mode setting
  const settings = readSettings();
  if (!settings.maintenance_mode) {
    // Maintenance mode is OFF - serve main site directly
    if (req.path === '/' || req.path === '/index.html') {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    // For React Router paths (no file extension), serve the main app
    if (req.method === 'GET' && !req.path.includes('.')) {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    return next();
  }

  // Maintenance mode is ON - check for early access cookie
  if (req.cookies && req.cookies.sd_early === '1') {
    // User has access, serve the main app from dist/
    if (req.path === '/' || req.path === '/index.html') {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    // For React Router paths (no file extension), serve the main app
    if (req.method === 'GET' && !req.path.includes('.')) {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  } else {
    // No access cookie, serve launching page for root
    if (req.path === '/' || req.path === '/index.html') {
      return res.sendFile(path.join(__dirname, 'index.html'));
    }
    // For other paths without access, redirect to root
    if (req.method === 'GET' && !req.path.includes('.')) {
      return res.redirect('/');
    }
  }

  next();
});// Serve static assets (logos etc.) from the project assets folder at the web root
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// Also serve dist assets
app.use('/_expo', express.static(path.join(__dirname, 'dist', '_expo')));
// Serve favicon and other root assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

const SETTINGS_PATH = path.join(__dirname, 'site-settings.json');
function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const defaults = {
      logoFilename: 'sdicon.PNG',
      headerTextColor: '#0A2540',
  // optional gradient: [startColor, endColor]
  headerGradient: null,
  // animated logo flag
  animatedLogo: false,
  // site font choice (branding)
  siteFont: 'Inter',
      // Feature toggles and numeric config
      require_deal_images: false,
      enable_content_filtering: true,
      enable_location_services: true,
      enable_push_notifications: true,
      enable_social_sharing: true,
      maintenance_mode: false,
      enable_analytics: true,
      enable_error_reporting: true,
      enable_performance_monitoring: true,
      auto_delete_expired_days: 7,
      max_daily_posts_per_user: 5,
      min_reputation_to_post: 0,
      soft_delete_retention_days: 30
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH));
  } catch (err) {
    console.error('Failed to read settings, recreating defaults', err);
    const defaults = { logoFilename: 'sdicon.PNG', headerTextColor: '#0A2540' };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}
function writeSettings(obj) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2));
}

// Local early-access codes storage (fallback to file if DB not used)
const EARLY_CODES_PATH = path.join(__dirname, 'early-access-codes.json');

function loadEarlyCodes() {
  if (!fs.existsSync(EARLY_CODES_PATH)) {
    const defaults = [
      {
        id: 1,
        code: 'WELCOME2025',
        is_active: true,
        expires_at: null,
        max_uses: 0,
        uses_count: 0
      },
      {
        id: 2,
        code: 'BETA1234',
        is_active: true,
        expires_at: null,
        max_uses: 100,
        uses_count: 0
      }
    ];
    fs.writeFileSync(EARLY_CODES_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(EARLY_CODES_PATH));
  } catch (err) {
    console.error('Failed to read early-access codes, recreating defaults', err);
    const defaults = [
      {
        id: 1,
        code: 'WELCOME2025',
        is_active: true,
        expires_at: null,
        max_uses: 0,
        uses_count: 0
      }
    ];
    fs.writeFileSync(EARLY_CODES_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function saveEarlyCodes(codes) {
  fs.writeFileSync(EARLY_CODES_PATH, JSON.stringify(codes, null, 2));
}

function findValidEarlyCode(code) {
  const codes = loadEarlyCodes();
  const now = new Date();
  return codes.find(c => {
    if (!c || !c.code) return false;
    if (String(c.code).toLowerCase() !== String(code).toLowerCase()) return false;
    if (!c.is_active) return false;
    if (c.expires_at && new Date(c.expires_at) <= now) return false;
    if (c.max_uses && c.max_uses > 0 && (c.uses_count || 0) >= c.max_uses) return false;
    return true;
  });
}

function incrementEarlyCodeUse(codeObj) {
  try {
    const codes = loadEarlyCodes();
    const idx = codes.findIndex(c => c.id === codeObj.id || (c.code && codeObj.code && c.code.toLowerCase() === codeObj.code.toLowerCase()));
    if (idx === -1) return;
    codes[idx].uses_count = (codes[idx].uses_count || 0) + 1;
    codes[idx].updated_at = new Date().toISOString();
    saveEarlyCodes(codes);
  } catch (err) {
    console.error('Failed to increment early code use:', err);
  }
}

// simple middleware to require super_admin based on session cookie
async function requireSuperAdmin(req, res, next) {
  try {
    const sessionId = req.cookies && req.cookies.session_id;
    
    if (!sessionId) return res.status(403).json({ error: 'Not authenticated' });
    const { rows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [sessionId]);
    
    // accept both common variants just in case, but prefer 'superadmin'
    // Accept common privileged roles in development: 'superadmin', 'super_admin', and 'admin'
    if (!rows[0] || (rows[0].role !== 'superadmin' && rows[0].role !== 'super_admin' && rows[0].role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch (err) {
    console.error('requireSuperAdmin error', err);
    res.status(500).json({ error: err.message });
  }
}

// general middleware to require authentication
async function requireAuth(req, res, next) {
  try {
    // Check for session ID in cookies (web) or headers (React Native)
    let sessionId = req.cookies && req.cookies.session_id;
    
    // If no cookie session, check for x-session-id header (React Native)
    if (!sessionId) {
      sessionId = req.headers['x-session-id'];
    }
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { rows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [sessionId]);
    if (!rows[0]) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Attach user info to request
    req.session = { id: sessionId, userId: sessionId, role: rows[0].role };
    next();
  } catch (err) {
    console.error('requireAuth error', err);
    res.status(500).json({ error: err.message });
  }
}

// CORS configuration - allow all localhost origins for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Some clients send the literal string 'null' or 'undefined' as the Origin header — treat those as missing.
    if (!origin || origin === 'null' || origin === 'undefined') {
      return callback(null, true);
    }

    // Normalize origin hostname
    let originHost = origin;
    try {
      const u = new URL(origin);
      originHost = u.hostname;
    } catch (e) {
      originHost = origin;
    }

    if (process.env.NODE_ENV === 'production') {
      const raw = process.env.ALLOWED_ORIGINS || '';
      const fallback = ['saversdream.com', 'www.saversdream.com'];
      const allowed = raw.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        try { return new URL(s).hostname; } catch(e) { return s.replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
      });
      const allowedList = allowed.length ? allowed : fallback;

      const matched = allowedList.some(a => {
        if (!a) return false;
        if (a.startsWith('.')) {
          return originHost === a.slice(1) || originHost.endsWith(a.slice(1));
        }
        if (originHost === a) return true;
        return originHost.endsWith('.' + a);
      });

      if (matched) return callback(null, true);

      console.warn('CORS denied origin (production):', origin, 'normalized:', originHost, 'allowed:', allowedList);
      return callback(new Error('Not allowed by CORS'));
    }

    // Development: allow localhost/local IPs
    try {
      if (originHost.includes('localhost') || originHost.startsWith('127.') || originHost.startsWith('192.168.') || originHost.endsWith('.local')) {
        return callback(null, true);
      }
    } catch (e) {
      // fall through
    }

    console.warn('CORS denied origin (dev):', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'x-admin-elevation']
}));




// Role request endpoints

// Get available roles (excluding admin/superadmin)
app.get('/api/role-requests/available-roles', async (req, res) => {
  try {
    const availableRoles = ['user', 'verified', 'moderator'];
    res.json(availableRoles);
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Failed to fetch available roles' });
  }
});

// Submit role request
app.post('/api/role-requests', async (req, res) => {
  try {
    const { userId, role, reason } = req.body;

    if (!userId || !role || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already has a pending request
    const existingRequest = await pool.query(
      'SELECT id FROM verification_requests WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    // Insert new request
    const result = await pool.query(
      'INSERT INTO verification_requests (user_id, role, reason, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, role, reason, 'pending']
    );

    res.json({ message: 'Role request submitted successfully', request: result.rows[0] });
  } catch (error) {
    console.error('Error submitting role request:', error);
    res.status(500).json({ error: 'Failed to submit role request' });
  }
});

// Get all role requests (admin only)
app.get('/api/role-requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM verification_requests 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject role request (admin only)
app.put('/api/role-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminId } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get request details
    const request = await pool.query(
      'SELECT * FROM verification_requests WHERE id = $1',
      [id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestData = request.rows[0];

    // Update request status
    await pool.query(
      'UPDATE verification_requests SET status = $1 WHERE id = $2',
      [status, id]
    );

    // If approved, update user role
    if (status === 'approved') {
      await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        [requestData.role, requestData.user_id]
      );
    }

    res.json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('Error updating role request:', error);
    res.status(500).json({ error: 'Failed to update role request' });
  }
});

// Create new role (admin only)
app.post('/api/roles', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // For now, just return success as we're using predefined roles
    // In a full implementation, you'd store this in a roles table
    res.json({ message: 'Role created successfully', role: { name, description, permissions } });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Legacy endpoints for backward compatibility
app.post('/api/verification-request', async (req, res) => {
  const { user_id, role, reason } = req.body;
  if (!user_id || !role || !reason) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    await pool.query(
      'INSERT INTO verification_requests (user_id, role, reason, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [user_id, role, reason, 'pending']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting verification request:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/verification-requests', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM verification_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all banners
app.get('/api/banners', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM banners ORDER BY priority ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to check authentication status
app.get('/api/auth/status', (req, res) => {
  const sessionId = req.cookies && req.cookies.session_id;
  res.json({ 
    authenticated: !!sessionId, 
    sessionId: sessionId,
    cookies: req.cookies 
  });
});

// Get available logos (super_admin only)
app.get('/api/site/logos', requireSuperAdmin, (req, res) => {
  try {
    const assetsDir = path.join(__dirname, 'assets');
    const files = fs.readdirSync(assetsDir)
      .filter(file => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file))
      .sort();
    res.json(files);
  } catch (err) {
    console.error('Error listing logos:', err);
    res.status(500).json({ error: err.message || 'Failed to list logos' });
  }
});

// Upload a new logo (super_admin only)
app.post('/api/site/logo', upload.single('logo'), requireSuperAdmin, async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      console.error('Invalid file type:', req.file.mimetype);
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'Invalid file type. Please upload an image file.' });
    }

    // Validate file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      console.error('File too large:', req.file.size);
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }

    const ext = path.extname(req.file.originalname) || '.png';
    const filename = `site-logo${ext}`;
    const target = path.join(__dirname, 'assets', filename);

    // Backup existing logo if it exists
    if (fs.existsSync(target)) {
      const backupPath = path.join(__dirname, 'assets', `site-logo-backup-${Date.now()}${ext}`);
      try {
        fs.copyFileSync(target, backupPath);
      } catch (backupErr) {
        console.warn('Failed to backup existing logo:', backupErr);
      }
    }

    // move file into assets
    fs.renameSync(req.file.path, target);

    const settings = readSettings();
    settings.logoFilename = filename;
    writeSettings(settings);

    res.json({ message: 'Logo uploaded successfully', filename });
  } catch (err) {
    console.error('Logo upload error:', err);
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: err.message || 'Failed to upload logo' });
  }
});

// List uploaded logos (super_admin only)
app.get('/api/site/logos', requireSuperAdmin, (req, res) => {
  try {
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) return res.json([]);
    let files = fs.readdirSync(assetsDir)
      .filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
      .map(f => f);
    try {
      const settings = readSettings();
      const active = settings && settings.logoFilename ? settings.logoFilename : null;
      files = files.sort((a, b) => {
        if (active) {
          if (a === active && b !== active) return -1;
          if (b === active && a !== active) return 1;
        }
        const aSite = a.toLowerCase().startsWith('site-logo');
        const bSite = b.toLowerCase().startsWith('site-logo');
        if (aSite && !bSite) return -1;
        if (!aSite && bSite) return 1;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
    } catch (e) {
      console.warn('Failed to read settings for logo sorting', e);
    }
    res.json(files);
  } catch (err) {
    console.error('Error listing logos:', err);
    res.status(500).json({ error: 'Failed to list uploaded logos' });
  }
});

// Delete an uploaded logo (super_admin only)
app.delete('/api/site/logo/:filename', requireSuperAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'Missing filename' });

    // basic validation to avoid directory traversal
    if (!/^[a-zA-Z0-9._\-]+$/.test(filename)) return res.status(400).json({ error: 'Invalid filename' });

    const target = path.join(__dirname, 'assets', filename);
    if (!fs.existsSync(target)) return res.status(404).json({ error: 'File not found' });

    // Prevent deletion of a built-in default file
    const defaults = ['sdicon.PNG', 'icon.png'];
    if (defaults.includes(filename)) return res.status(403).json({ error: 'Cannot delete default asset' });

    // Remove the file
    try {
      fs.unlinkSync(target);
    } catch (e) {
      console.error('Failed to delete file', target, e);
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    // If deleted file was current logo in settings, reset to default
    try {
      const settings = readSettings();
      if (settings.logoFilename === filename) {
        settings.logoFilename = 'sdicon.PNG';
        writeSettings(settings);
      }
    } catch (e) {
      console.error('Failed to update settings after delete', e);
    }

    res.json({ message: 'Deleted', filename });
  } catch (err) {
    console.error('Delete logo error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete logo' });
  }
});

// Update site settings (header text color etc.) (super_admin only)
app.put('/api/site/settings', requireSuperAdmin, (req, res) => {
  try {
    const body = req.body || {};
    
    const settings = readSettings();

    // Apply branding updates (allow empty/false values)
    if (typeof body.headerTextColor !== 'undefined') {
      settings.headerTextColor = body.headerTextColor;
    }
    if (typeof body.logoFilename !== 'undefined') {
      settings.logoFilename = body.logoFilename;
    }

    // Feature toggles (booleans) and numeric values
    const keys = [
      'require_deal_images',
      'enable_content_filtering',
      'headerGradient',
      'animatedLogo',
  'siteFont',
      'enable_location_services',
      'enable_push_notifications',
      'enable_social_sharing',
      'maintenance_mode',
      'enable_analytics',
      'enable_error_reporting',
      'enable_performance_monitoring',
      'auto_delete_expired_days',
      'max_daily_posts_per_user',
      'min_reputation_to_post',
      'soft_delete_retention_days'
    ];

    keys.forEach(k => {
      if (typeof body[k] !== 'undefined') {
        settings[k] = body[k];
      }
    });

    writeSettings(settings);
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// Read current site settings
app.get('/api/site/settings', (req, res) => {
  try {
    const settings = readSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error reading site settings:', err);
    res.status(500).json({ error: err.message || 'Failed to read settings' });
  }
});

// Delete logo file (super_admin only)
app.delete('/api/site/logo/:filename', requireSuperAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const logoPath = path.join(__dirname, 'assets', filename);
    
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo file not found' });
    }
    
    // Don't allow deletion of current active logo
    const settings = readSettings();
    if (settings.logoFilename === filename) {
      return res.status(400).json({ error: 'Cannot delete currently active logo' });
    }
    
    fs.unlinkSync(logoPath);
    res.json({ message: 'Logo deleted successfully' });
  } catch (err) {
    console.error('Logo delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete logo' });
  }
});

// Development-only endpoint to write site settings without auth (safe in dev only)
if (process.env.NODE_ENV === 'development') {
  app.put('/api/site/settings/dev-write', (req, res) => {
    try {
      const body = req.body || {};
      const settings = readSettings();
      const keys = [
  'headerTextColor',
  'headerGradient',
  'animatedLogo',
  'siteFont',
        'logoFilename',
        'require_deal_images',
        'enable_content_filtering',
        'enable_location_services',
        'enable_push_notifications',
        'enable_social_sharing',
        'maintenance_mode',
        'enable_analytics',
        'enable_error_reporting',
        'enable_performance_monitoring',
        'auto_delete_expired_days',
        'max_daily_posts_per_user',
        'min_reputation_to_post',
        'soft_delete_retention_days'
      ];

      keys.forEach(k => {
        if (typeof body[k] !== 'undefined') settings[k] = body[k];
      });

      writeSettings(settings);
      res.json({ message: 'Dev: settings updated', settings });
    } catch (err) {
      console.error('Dev settings update error', err);
      res.status(500).json({ error: err.message });
    }
  });
}
// Session endpoint

app.get('/api/auth/session', async (req, res) => {
  // Check for session ID in cookies (web) or headers (React Native)
  let sessionId = req.cookies.session_id;
  
  // If no cookie session, check for x-session-id header (React Native)
  if (!sessionId) {
    sessionId = req.headers['x-session-id'];
  }
  
  if (!sessionId) {
    return res.json({ user: null, authenticated: false });
  }
  
  try {
    // Look up user by session ID (user ID)
    const { rows } = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [sessionId]
    );
    
    if (rows.length === 0) {
      return res.json({ user: null, authenticated: false });
    }
    
    const user = rows[0];
    res.json({
      user: user,
      authenticated: true,
      session: { user_id: user.id }
    });
  } catch (err) {
    console.error('Session check error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ...existing code...
// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stores ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/stores:', err);
    res.status(500).json({ error: err.message });
  }
});


// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    let query = 'SELECT * FROM categories';
    const params = [];
    if (req.query.is_active === 'true') {
      query += ' WHERE is_active = $1';
      params.push(true);
    }
    query += ' ORDER BY name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example endpoint: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { q, role, limit = 30, cursor } = req.query;
    
    let query = 'SELECT * FROM users';
    const queryParams = [];
    const conditions = [];
    
    // Add search filter
    if (q) {
      conditions.push(`(username ILIKE $${queryParams.length + 1} OR email ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${q}%`);
    }
    
    // Add role filter
    if (role) {
      conditions.push(`role = $${queryParams.length + 1}`);
      queryParams.push(role);
    }
    
    // Add cursor filter for pagination
    if (cursor) {
      conditions.push(`id > $${queryParams.length + 1}`);
      queryParams.push(cursor);
    }
    
    // Build the WHERE clause
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Add ordering and limit
    query += ' ORDER BY id ASC';
    if (limit) {
      query += ` LIMIT $${queryParams.length + 1}`;
      queryParams.push(parseInt(limit));
    }
    
    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by username
app.get('/api/users/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { rows } = await pool.query(
      'SELECT id, username, role, reputation, avatar_url, created_at, status FROM users WHERE username = $1',
      [username]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users by username prefix
app.get('/api/users/search', async (req, res) => {
  try {
    const { prefix, limit = 8 } = req.query;
    if (!prefix) {
      return res.json([]);
    }
    const { rows } = await pool.query(
      'SELECT id, username, avatar_url FROM users WHERE username ILIKE $1 ORDER BY username ASC LIMIT $2',
      [`${prefix}%`, parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get online users in channel
app.get('/api/chat/channels/:channelId/online-users', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // For now, return a mock online count since we don't have real-time tracking
    // In a real implementation, you'd track user sessions/connections
    const { rows } = await pool.query(`
      SELECT COUNT(*) as total_members
      FROM channel_members 
      WHERE channel_id = $1
    `, [channelId]);

    const totalMembers = parseInt(rows[0].total_members);
    // Mock online count as a percentage of total members
    const onlineCount = Math.max(1, Math.floor(totalMembers * 0.3)); // At least 1 online user
    
    res.json({
      count: onlineCount,
      users: [] // In a real implementation, you'd return actual online users
    });
  } catch (err) {
    console.error('Error getting online users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user status
app.put('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminId } = req.body;
    
    const { rows } = await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log admin action
    await pool.query(
      'INSERT INTO admin_actions (user_id, admin_id, action_type, reason, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [id, adminId, 'status_change', `Status changed to ${status}`]
    );
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all deals
app.get('/api/deals', async (req, res) => {
  try {
    let query = `
      SELECT d.*, 
             c.name as category_name, c.emoji as category_emoji,
             s.name as store_name, s.logo_url as store_logo,
             u.username, u.role as user_role, u.reputation, u.avatar_url
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN users u ON d.created_by = u.id
    `;
    const params = [];
    let paramCount = 1;
    
    const conditions = [];
    
    if (req.query.moderation === 'true') {
      conditions.push(`d.status IN ($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3})`);
      params.push('pending', 'flagged', 'reported', 'draft');
      paramCount += 4;
    } else if (req.query.status) {
      conditions.push(`d.status = $${paramCount}`);
      params.push(req.query.status);
      paramCount++;
    } else if (req.query.user_id) {
      conditions.push(`d.created_by = $${paramCount}`);
      params.push(req.query.user_id);
      paramCount++;
    } else if (req.query.categoryId) {
      conditions.push(`d.category_id = $${paramCount}`);
      params.push(req.query.categoryId);
      paramCount++;
      if (req.query.exclude) {
        conditions.push(`d.id != $${paramCount}`);
        params.push(req.query.exclude);
        paramCount++;
      }
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Add sorting
    if (req.query.sortBy === 'popular') {
      query += ' ORDER BY d.votes_up DESC';
    } else {
      query += ' ORDER BY d.created_at DESC';
    }
    
    // Add limit
    if (req.query.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(req.query.limit));
    }
    
    const { rows } = await pool.query(query, params);
    
    // Transform the data to match expected format
    const transformedRows = rows.map(row => ({
      ...row,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        emoji: row.category_emoji
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name,
        logo_url: row.store_logo
      } : null,
      created_by_user: row.username ? {
        id: row.created_by,
        username: row.username,
        role: row.user_role,
        reputation: row.reputation,
        avatar_url: row.avatar_url
      } : null
    }));
    
    res.json(transformedRows);
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json([]);
  }
});

// Get individual deal by ID
app.get('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    
    let query = `
      SELECT d.*, 
             c.name as category_name, c.emoji as category_emoji,
             s.name as store_name, s.logo_url as store_logo,
             u.username, u.role as user_role, u.reputation, u.avatar_url
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.id = $1
    `;
    
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    const deal = rows[0];
    
    // Get user vote if userId provided
    let userVote = null;
    if (userId) {
      const voteResult = await pool.query(
        'SELECT vote_type FROM votes WHERE deal_id = $1 AND user_id = $2',
        [id, userId]
      );
      userVote = voteResult.rows.length > 0 ? voteResult.rows[0].vote_type : null;
    }
    
    // Transform the data
    const transformedDeal = {
      ...deal,
      category: deal.category_name ? {
        id: deal.category_id,
        name: deal.category_name,
        emoji: deal.category_emoji
      } : null,
      store: deal.store_name ? {
        id: deal.store_id,
        name: deal.store_name,
        logo_url: deal.store_logo
      } : null,
      created_by_user: deal.username ? {
        id: deal.created_by,
        username: deal.username,
        role: deal.user_role,
        reputation: deal.reputation,
        avatar_url: deal.avatar_url
      } : null,
      user_vote: userVote
    };
    
    res.json(transformedDeal);
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Increment view count for a deal
app.post('/api/deals/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    // Dedupe rapid duplicate increments from the same session or IP.
    const sessionId = req.cookies && req.cookies.session_id;
    const ip = req.ip || req.connection && req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const ownerKey = `${id}:${sessionId || ip}`;

    const now = Date.now();
    const windowMs = 5000; // 5 seconds

    // Clean up old entries occasionally
    if (recentViewIncrements.size > 5000) {
      for (const [k, v] of recentViewIncrements) {
        if (now - v > 60000) recentViewIncrements.delete(k);
      }
    }

    const last = recentViewIncrements.get(ownerKey) || 0;
    if (now - last < windowMs) {
      // Treat as a duplicate rapid call; return current view_count without incrementing
      try {
        const { rows: found } = await pool.query('SELECT view_count FROM deals WHERE id = $1', [id]);
        if (found.length === 0) return res.status(404).json({ error: 'Deal not found' });
        return res.json({ view_count: found[0].view_count, deduped: true });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to read deal' });
      }
    }

    // Record this increment attempt
    recentViewIncrements.set(ownerKey, now);

    const { rows } = await pool.query(
      `UPDATE deals SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1 RETURNING view_count`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Deal not found' });

    res.json({ view_count: rows[0].view_count });
  } catch (err) {
    console.error('Error incrementing view count:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update deal
app.put('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, userId, userRole, ...dealData } = req.body;
    
    // Check permissions if not admin
    if (userRole !== 'admin' && userRole !== 'superadmin' && userId) {
      const { rows: ownerCheck } = await pool.query(
        'SELECT created_by FROM deals WHERE id = $1',
        [id]
      );
      
      if (ownerCheck.length === 0) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      
      if (ownerCheck[0].created_by !== userId) {
        return res.status(403).json({ error: 'You can only edit your own deals' });
      }
    }
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
      paramCount++;
    }
    
    // Add other fields as needed
    Object.keys(dealData).forEach(key => {
      if (dealData[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(dealData[key]);
        paramCount++;
      }
    });
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    const query = `UPDATE deals SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await pool.query(query, updateValues);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new deal
app.post('/api/deals', async (req, res) => {
  try {
    const dealData = req.body;
    
    const { rows } = await pool.query(`
      INSERT INTO deals (
        title, description, price, original_price, discount_percentage,
        deal_url, category_id, store_id, created_by, city, state, status, images, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `, [
      dealData.title,
      dealData.description,
      dealData.price,
      dealData.original_price,
      dealData.discount_percentage,
      dealData.deal_url,
      dealData.category_id,
      dealData.store_id,
      dealData.created_by,
  dealData.city || '',
  dealData.state || '',
      dealData.status || 'pending',
      dealData.images || []
    ]);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete deal
app.delete('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(
      'DELETE FROM deals WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all comments
app.get('/api/comments', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM comments');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get comments for a deal
app.get('/api/deals/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(`
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.deal_id = $1 AND c.status = 'active'
      ORDER BY c.created_at ASC
    `, [id]);
    
    // Transform to match expected format
    const comments = rows.map(row => ({
      ...row,
      users: {
        username: row.username,
        avatar_url: row.avatar_url
      }
    }));
    
    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add comment to deal
app.post('/api/deals/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, parentId } = req.body;
    
    const { rows } = await pool.query(`
      INSERT INTO comments (deal_id, user_id, content, parent_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [id, userId, content, parentId || null]);
    
    // Increment comment count on deal
    await pool.query(
      'UPDATE deals SET comment_count = comment_count + 1 WHERE id = $1',
      [id]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Vote on deal
app.post('/api/deals/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, voteType } = req.body;
    
    if (!userId || !voteType) {
      return res.status(400).json({ error: 'Missing userId or voteType' });
    }
    
    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }
    
    // Verify deal exists
    const dealCheck = await pool.query('SELECT id FROM deals WHERE id = $1', [id]);
    if (dealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Verify user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use the database function to handle voting
    await pool.query(
      'SELECT handle_vote($1::uuid, $2::uuid, $3::text)',
      [id, userId, voteType]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error voting on deal:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Get saved deals for user
app.get('/api/deals/saved', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const { rows } = await pool.query(`
      SELECT d.*, 
             c.name as category_name, c.emoji as category_emoji,
             s.name as store_name, s.logo_url as store_logo,
             u.username, u.role as user_role, u.reputation
      FROM saved_deals sd
      JOIN deals d ON sd.deal_id = d.id
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE sd.user_id = $1
      ORDER BY sd.created_at DESC
    `, [userId]);
    
    // Transform the data
    const transformedRows = rows.map(row => ({
      ...row,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        emoji: row.category_emoji
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name,
        logo_url: row.store_logo
      } : null,
      created_by_user: row.username ? {
        id: row.created_by,
        username: row.username,
        role: row.user_role,
        reputation: row.reputation
      } : null
    }));
    
    res.json(transformedRows);
  } catch (err) {
    console.error('Error fetching saved deals:', err);
    res.status(500).json({ error: err.message });
  }
});

// Scrape product data from URL
app.post('/api/scrape-product', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log('Starting scraping for URL:', url);

    try {
      // Try Playwright first
      console.log('Attempting Playwright scraping...');
      let browser = await getSharedBrowser();

      // Create a context with a realistic user agent and small anti-detection scripts
      let context;
      try {
        context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      } catch (e) {
        // If the shared browser appears closed, reset and retry once
        console.warn('Shared browser context creation failed, restarting shared browser...', e && (e.message || e));
        try {
          sharedBrowser = null;
          browser = await getSharedBrowser();
          context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 },
          });
        } catch (err) {
          throw err;
        }
      }

      // Reduce automation fingerprints
      await context.addInitScript(() => {
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        } catch (e) {}
        try {
          window.navigator.chrome = { runtime: {} };
        } catch (e) {}
        try {
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        } catch (e) {}
        try {
          Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
        } catch (e) {}
      });

      const page = await context.newPage();

      // Navigate quickly to DOMContentLoaded and then wait briefly for likely selectors
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Short targeted waits for typical product page markers (title/price/meta)
      const quickSelectors = [
        'h1',
        'title',
        'meta[property="og:title"]',
        'meta[name="description"]',
        '.a-price',
        '#priceblock_ourprice',
        '.price',
        '._30jeq3',
        'span.B_NuCI'
      ];

      try {
        await page.waitForSelector(quickSelectors.join(','), { timeout: 2500 });
      } catch (e) {
        // If no quick selector appeared, continue — some pages need longer JS
      }

      // Extract data
      const data = await page.evaluate(() => {
        const getTextContent = (selectors) => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (!element) continue;
            // If meta tag, read content
            if (element.tagName && element.tagName.toLowerCase() === 'meta') {
              const c = element.getAttribute('content');
              if (c && c.trim()) return c.trim();
            }
            if (element && element.textContent?.trim()) {
              return element.textContent.trim();
            }
          }
          return '';
        };

        // Title selectors - prioritize Amazon product title first, then others
        let title = getTextContent([
          '#productTitle', // Amazon primary
          '#title',
          'h1#title',
          'h1',
          'span.B_NuCI', // Flipkart
          'span._35KyD6',
          '[data-testid="product-title"]',
          '.product-title',
          '.product-name',
          'meta[property="og:title"]',
          'meta[name="twitter:title"]'
        ]) || document.title || '';

        // Try JSON-LD product data for title/price/description if present
        try {
          const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const s of ldScripts) {
            try {
              const json = JSON.parse(s.textContent || s.innerText || '{}');
              const product = (Array.isArray(json) ? json.find(j => j['@type'] && j['@type'].toLowerCase() === 'product') : (json['@type'] && json['@type'].toLowerCase() === 'product' ? json : null));
              if (product) {
                if (!title || title.length < 5) title = (product.name || title);
                if ((!price || price === '') && product.offers) {
                  price = (product.offers.priceCurrency ? product.offers.priceCurrency + ' ' : '') + (product.offers.price || '');
                }
                if (!description || description.length < 5) description = product.description || description;
                break;
              }
            } catch (e) {
              // ignore JSON parse errors
            }
          }
        } catch (e) {}

  // Clean up title - remove domain prefixes and helper UI text
  title = title.replace(/^(amazon\.com|www\.amazon\.com|flipkart\.com|www\.flipkart\.com|myntra\.com|www\.myntra\.com)\s*[-:]\s*/i, '');
  title = title.replace(/\s*[-|]\s*amazon\.com.*$/i, '');
  title = title.replace(/\s*[-|]\s*flipkart\.com.*$/i, '');
  title = title.replace(/\s*[-|]\s*myntra\.com.*$/i, '');
  // Remove repeated UI helper fragments such as 'Product summary presents key product information' or keyboard shortcuts
  title = title.replace(/Product summary presents key product information/gi, '');
  title = title.replace(/Keyboard shortcut[\s\S]*$/i, '');
  title = title.replace(/\s*See more product details.*$/i, '');
  title = title.replace(/\s+/g, ' ').trim();

        // Price selectors - more specific for product prices
        let price = getTextContent([
          '[data-testid="price"]',
          '.a-price .a-offscreen',
          '.a-price-whole',
          '.a-color-price',
          '#priceblock_ourprice',
          '#priceblock_dealprice',
          '.price',
          '.product-price',
          '.current-price',
          '[class*="price"]',
          'meta[property="product:price:amount"]',
          '._30jeq3', // Flipkart main price
          'div._30jeq3',
          'div._30jeq3._1_WHN1',
          '._3I9_wc', // Flipkart alternate price class
          '._25b18c',
          '._16Jk6d',
          '.\_1vC4OE'
        ]);

        // Clean up price - extract only numeric values
        const priceMatch = price.match(/[\$₹£€]?\s*[\d,]+\.?\d*/);
        price = priceMatch ? priceMatch[0].trim() : '';
        
        // Try to extract an original / list price (Amazon often shows a 'List Price' or struck-through price)
        let originalPrice = '';
        try {
          // Common Amazon selectors for list/strike price and other hosts where list price is present
          const listSelectors = [
            '#priceblock_listprice',
            '#price_feature_div .a-text-strike',
            '.a-text-strike',
            '.priceBlockStrikePriceString',
            '.priceBlockSavingsString',
            '.list-price',
            '.strike',
            '.comparison_price'
          ];
          for (const sel of listSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent && el.textContent.trim()) {
              const m = el.textContent.trim().match(/[\$₹£€]?\s*[\d,]+\.?\d*/);
              if (m) { originalPrice = m[0].trim(); break; }
            }
          }
        } catch (e) {}

        // Description selectors - prioritize structured Amazon/feature bullets and product description
        let description = '';

        // Prefer Amazon feature bullets if present
        try {
          const bullets = document.querySelectorAll('#feature-bullets .a-list-item');
          if (bullets && bullets.length > 0) {
            const parts = [];
            bullets.forEach(b => {
              const t = b.textContent && b.textContent.trim();
              if (t) parts.push(t);
            });
            if (parts.length > 0) description = parts.join('\n');
          }
        } catch (e) {}

        if (!description) {
          description = getTextContent([
            '#productDescription',
            '[data-testid="product-description"]',
            '.product-description',
            '.a-unordered-list',
            'meta[name="description"]',
            'meta[property="og:description"]',
            '.\_1mXcCf',
            '.\_2RngUh',
            '.\_2418kt',
            'div._1mXcCf',
            'div._2RngUh'
          ]);
        }

        // Clean up description - remove domain references and UI helper noise
        description = (description || '').replace(/\b(amazon|flipkart|myntra)\.com\b/gi, '');
        // Remove repeated UI helper fragments and keyboard shortcut blocks
        description = description.replace(/Product summary presents key product information/gi, '');
        description = description.replace(/Keyboard shortcut[\s\S]*?(?=About this item|$)/gi, '');
        description = description.replace(/›?\s*See more product details[\s\S]*$/i, '');
        description = description.replace(/\s+/g, ' ').trim();

        // As a last resort, try JSON-LD again for description
        try {
          const ldScripts2 = document.querySelectorAll('script[type="application/ld+json"]');
          for (const s of ldScripts2) {
            try {
              const json = JSON.parse(s.textContent || s.innerText || '{}');
              const product = (Array.isArray(json) ? json.find(j => j['@type'] && j['@type'].toLowerCase() === 'product') : (json['@type'] && json['@type'].toLowerCase() === 'product' ? json : null));
              if (product) {
                if (!description || description.length < 5) description = product.description || description;
                if ((!price || price === '') && product.offers) price = (product.offers.priceCurrency ? product.offers.priceCurrency + ' ' : '') + (product.offers.price || '');
                break;
              }
            } catch (e) {}
          }
        } catch (e) {}

        // Images - prioritize high-quality images over thumbnails
        const images = [];
        const processedUrls = new Set();

        // For Amazon product pages, prefer extracting the gallery thumbnails (main product images)
        // directly from the product gallery selectors. This avoids picking up unrelated suggestion
        // images that appear elsewhere on the page.
        try {
          const hostname = (window.location.hostname || '').toLowerCase();
          if (/amazon\./i.test(hostname)) {
            const gallerySelectors = [
              '#altImages img',
              'div#altImages img',
              '#imgTagWrapperId img',
              'img#landingImage',
              'img[data-image-index]',
              'div#mainImageContainer img',
              'div#img-canvas img'
            ];

            const galleryUrls = [];
            gallerySelectors.forEach(sel => {
              const nodes = document.querySelectorAll(sel);
              nodes.forEach(img => {
                // Try various attributes where Amazon stores larger urls
                const candidates = [];
                const dataA = img.getAttribute('data-a-dynamic-image');
                if (dataA) {
                  try {
                    const parsed = JSON.parse(dataA);
                    // parsed keys are URLs mapped to sizes
                    Object.keys(parsed || {}).forEach(k => candidates.push(k));
                  } catch (e) {}
                }
                const attrs = ['data-old-hires','data-src','data-lazy','data-lazy-src','data-old-hires','src'];
                attrs.forEach(a => {
                  const v = img.getAttribute(a);
                  if (v) candidates.push(v);
                });

                candidates.forEach(c => {
                  if (c && typeof c === 'string' && c.startsWith('http')) {
                    // convert to a probable full-size URL using existing thumbnail-to-full logic
                    let full = c.split('?')[0];
                    try {
                      if (full.includes('m.media-amazon.com/images/I/')) {
                        full = full.replace(/_AC_[A-Z0-9_]+/g, '');
                        full = full.replace(/_SX\d+_SY\d+_/, '');
                        full = full.replace(/_SX\d+_/, '');
                        full = full.replace(/_SY\d+_/, '');
                        full = full.replace(/\.\./g, '.');
                      }
                    } catch (e) {}
                    if (!galleryUrls.includes(full)) galleryUrls.push(full);
                  }
                });
              });
            });

            if (galleryUrls.length > 0) {
              galleryUrls.forEach(u => {
                processedUrls.add(u);
                images.push(u);
              });
            }
          }
        } catch (e) {
          // ignore Amazon gallery extraction errors and fall back to general logic
        }

        // Function to check if URL is likely a thumbnail
        const isThumbnail = (url) => {
          const lowerUrl = url.toLowerCase();
          return lowerUrl.includes('thumb') ||
                 lowerUrl.includes('thumbnail') ||
                 lowerUrl.includes('small') ||
                 lowerUrl.includes('tiny') ||
                 lowerUrl.includes('mini') ||
                 lowerUrl.includes('icon') ||
                 lowerUrl.includes('32x32') ||
                 lowerUrl.includes('64x64') ||
                 lowerUrl.includes('100x100') ||
                 lowerUrl.includes('150x150') ||
                 lowerUrl.includes('200x200') ||
                 // Amazon specific size parameters
                 lowerUrl.includes('_ac_us') ||
                 lowerUrl.includes('_ac_sx') ||
                 lowerUrl.includes('_ac_sy') ||
                 lowerUrl.includes('_ac_sl') ||
                 lowerUrl.includes('_sr') ||
                 // General size indicators
                 /\d+x\d+/.test(lowerUrl) && parseInt(lowerUrl.match(/(\d+)x(\d+)/)[1]) < 300;
        };

        // Function to try to get full-size URL from thumbnail
        const getFullSizeUrl = (thumbnailUrl) => {
          let fullUrl = thumbnailUrl;

          // Amazon patterns - more comprehensive handling
          if (thumbnailUrl.includes('m.media-amazon.com/images/I/')) {
            // Remove Amazon size parameters like _AC_US40_, _AC_SX466_, _AC_SY300_, etc.
            fullUrl = fullUrl.replace(/_\w+\.jpg$/, '.jpg');
            fullUrl = fullUrl.replace(/_\w+\.png$/, '.png');
            fullUrl = fullUrl.replace(/_\w+\.jpeg$/, '.jpeg');
            fullUrl = fullUrl.replace(/_\w+\.webp$/, '.webp');

            // Handle multiple size parameters (rare but possible)
            fullUrl = fullUrl.replace(/_\w+_\w+\./, '.');

            // If still has size parameters, try a more aggressive approach
            if (fullUrl.includes('_AC_') || fullUrl.includes('_SR') || fullUrl.includes('_SY') || fullUrl.includes('_SX')) {
              const parts = fullUrl.split('.');
              if (parts.length >= 2) {
                const extension = parts[parts.length - 1];
                const baseUrl = fullUrl.substring(0, fullUrl.lastIndexOf('.'));
                // Remove all size-related parameters
                const cleanBase = baseUrl.replace(/_\w+$/, '');
                fullUrl = cleanBase + '.' + extension;
              }
            }
          }

          // Flipkart patterns
          if (thumbnailUrl.includes('rukminim1.flixcart.com')) {
            fullUrl = thumbnailUrl.replace(/\/image\/\d+x\d+\//, '/image/');
          }

          // General patterns
          fullUrl = fullUrl.replace(/\/thumb\//, '/');
          fullUrl = fullUrl.replace(/\/thumbnails?\//, '/');
          fullUrl = fullUrl.replace(/_thumb\./, '.');
          fullUrl = fullUrl.replace(/_thumbnail\./, '.');
          fullUrl = fullUrl.replace(/_small\./, '.');

          return fullUrl;
        };

        // Function to extract images from srcset
        const extractFromSrcset = (srcset) => {
          if (!srcset) return [];
          const sources = srcset.split(',').map(s => s.trim().split(' ')[0]);
          return sources.filter(url => url.startsWith('http'));
        };

        // Function to get image quality score (prefer larger images)
        const getImageQualityScore = (url) => {
          let score = 0;

          // Prefer images with high resolution indicators
          if (url.includes('1000x') || url.includes('1200x') || url.includes('1500x')) score += 10;
          if (url.includes('800x') || url.includes('900x')) score += 8;
          if (url.includes('600x') || url.includes('700x')) score += 6;
          if (url.includes('400x') || url.includes('500x')) score += 4;

          // Prefer certain file extensions
          if (url.includes('.jpg') || url.includes('.jpeg')) score += 3;
          if (url.includes('.png')) score += 2;

          // Prefer images without size constraints
          if (!url.includes('w=') && !url.includes('h=')) score += 2;

          return score;
        };

        // Collect all potential images with quality scores
        const imageCandidates = [];

        // 1. Look for images with data attributes that might contain full-size versions
        const allImgs = document.querySelectorAll('img');
        allImgs.forEach(img => {
          const sources = [];

          // Check various attributes for image sources
          const src = img.getAttribute('src');
          const dataSrc = img.getAttribute('data-src');
          const dataOriginal = img.getAttribute('data-original');
          const dataLazy = img.getAttribute('data-lazy');
          const dataLazySrc = img.getAttribute('data-lazy-src');
          const dataZoom = img.getAttribute('data-zoom');
          const dataFull = img.getAttribute('data-full');
          const dataLarge = img.getAttribute('data-large');

          if (src) sources.push(src);
          if (dataSrc) sources.push(dataSrc);
          if (dataOriginal) sources.push(dataOriginal);
          if (dataLazy) sources.push(dataLazy);
          if (dataLazySrc) sources.push(dataLazySrc);
          if (dataZoom) sources.push(dataZoom);
          if (dataFull) sources.push(dataFull);
          if (dataLarge) sources.push(dataLarge);

          // Check srcset for multiple sizes
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            sources.push(...extractFromSrcset(srcset));
          }

          sources.forEach(source => {
            if (source && source.startsWith('http') && !processedUrls.has(source)) {
              processedUrls.add(source);
              const qualityScore = getImageQualityScore(source);
              imageCandidates.push({
                url: source,
                score: qualityScore,
                isThumbnail: isThumbnail(source)
              });
            }
          });
        });

        // 2. Look for images in specific selectors that are likely to be product images
        const productSelectors = [
          'img[data-image-index]',
          'img[data-old-hires]',
          '#landingImage',
          '#imgBlkFront',
          '.a-dynamic-image',
          'img[data-testid="product-image"]',
          '.product-image img',
          '.gallery img',
          '.product-gallery img',
          '.zoom img',
          '.magnify img',
          'img[alt*="product"]',
          'img[alt*="item"]',
          'img[src*="product"]',
          'img[src*="image"]',
          'img[src*="photo"]',
          // Amazon specific selectors
          '#main-image',
          '#altImages img',
          '.image img',
          '.thumbnail img',
          'img[alt*="ASUS"]',
          'img[alt*="Chromebook"]',
          'img[alt*="laptop"]',
          'img[alt*="computer"]',
          // More general product selectors
          '.product img',
          '.item img',
          '.main-image img',
          '.hero-image img',
          'img[class*="product"]',
          'img[class*="image"]',
          'img[id*="image"]',
          'img[id*="photo"]',
          // Amazon specific data attributes
          'img[data-image-url]',
          'img[data-src]',
          'img[data-lazy]',
          'img[data-lazy-src]',
          'img[data-zoom]',
          'img[data-full]',
          'img[data-large]',
          'img[data-original]'
          ,
          // Flipkart specific selectors
          '._396cs4',
          '._2r_TV6 img',
          'img[class*="_396cs4"]',
        ];

        productSelectors.forEach(selector => {
          const imgs = document.querySelectorAll(selector);
          imgs.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
            if (src && src.startsWith('http') && !processedUrls.has(src)) {
              processedUrls.add(src);
              const qualityScore = getImageQualityScore(src) + 5; // Bonus for product-specific selectors
              imageCandidates.push({
                url: src,
                score: qualityScore,
                isThumbnail: isThumbnail(src)
              });
            }
          });
        });

        // 3. Extract images from JavaScript variables and data attributes
        // Look for image data in script tags and data attributes
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          const scriptContent = script.textContent || script.innerText;
          if (scriptContent) {
            // Look for common patterns in JavaScript that contain image URLs
            const imagePatterns = [
              /"image"\s*:\s*"([^"]+)"/gi,
              /'image'\s*:\s*'([^']+)'/gi,
              /"images"\s*:\s*\[([^\]]+)\]/gi,
              /'images'\s*:\s*\[([^\]]+)\]/gi,
              /"largeImage"\s*:\s*"([^"]+)"/gi,
              /'largeImage'\s*:\s*'([^']+)'/gi,
              /"hiRes"\s*:\s*"([^"]+)"/gi,
              /'hiRes'\s*:\s*'([^']+)'/gi,
              /"mainImage"\s*:\s*"([^"]+)"/gi,
              /'mainImage'\s*:\s*'([^']+)'/gi,
              // Amazon specific patterns
              /"large"\s*:\s*"([^"]+)"/gi,
              /'large'\s*:\s*'([^']+)'/gi,
              /data-image-url="([^"]+)"/gi,
              /data-old-hires="([^"]+)"/gi,
              /data-image-index="([^"]+)"/gi
            ];

            imagePatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(scriptContent)) !== null) {
                const imageUrl = match[1];
                if (imageUrl && imageUrl.startsWith('http') && !processedUrls.has(imageUrl)) {
                  processedUrls.add(imageUrl);
                  const qualityScore = getImageQualityScore(imageUrl) + 3; // Bonus for script-extracted images
                  imageCandidates.push({
                    url: imageUrl,
                    score: qualityScore,
                    isThumbnail: isThumbnail(imageUrl)
                  });
                }
              }
            });

            // Look for image arrays in JavaScript
            const arrayPatterns = [
              /images\s*=\s*\[([^\]]+)\]/gi,
              /imageList\s*=\s*\[([^\]]+)\]/gi,
              /productImages\s*=\s*\[([^\]]+)\]/gi,
              /gallery\s*=\s*\[([^\]]+)\]/gi
            ];

            arrayPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(scriptContent)) !== null) {
                const arrayContent = match[1];
                // Extract URLs from the array
                const urlMatches = arrayContent.match(/"([^"]+)"/g) || arrayContent.match(/'([^']+)'/g);
                if (urlMatches) {
                  urlMatches.forEach(urlMatch => {
                    const imageUrl = urlMatch.slice(1, -1); // Remove quotes
                    if (imageUrl && imageUrl.startsWith('http') && !processedUrls.has(imageUrl)) {
                      processedUrls.add(imageUrl);
                      const qualityScore = getImageQualityScore(imageUrl) + 3;
                      imageCandidates.push({
                        url: imageUrl,
                        score: qualityScore,
                        isThumbnail: isThumbnail(imageUrl)
                      });
                    }
                  });
                }
              }
            });
          }
        });

        // Look for images in data attributes of any element
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          const attributes = element.attributes;
          for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            if (attr.name.startsWith('data-') && attr.value && attr.value.startsWith('http') && attr.value.includes('image')) {
              if (!processedUrls.has(attr.value)) {
                processedUrls.add(attr.value);
                const qualityScore = getImageQualityScore(attr.value) + 2;
                imageCandidates.push({
                  url: attr.value,
                  score: qualityScore,
                  isThumbnail: isThumbnail(attr.value)
                });
              }
            }
          }
        });

        // 4. Sort by quality score (highest first) and filter
        imageCandidates.sort((a, b) => b.score - a.score);

        // 4. Select the best images, preferring non-thumbnails
        const selectedImages = [];
        const maxImages = 20;

        // First, try to get non-thumbnail images
        for (const candidate of imageCandidates) {
          if (!candidate.isThumbnail && selectedImages.length < maxImages) {
            let finalUrl = candidate.url;

            // Try to get full-size version
            if (candidate.isThumbnail) {
              finalUrl = getFullSizeUrl(candidate.url);
            }

            // Clean up URL
            finalUrl = finalUrl.split('?')[0]; // Remove query parameters

            if (!images.includes(finalUrl)) {
              images.push(finalUrl);
              selectedImages.push(finalUrl);
            }
          }
        }

        // If we don't have enough images, add thumbnails as fallback
        if (selectedImages.length < maxImages) {
          for (const candidate of imageCandidates) {
            if (selectedImages.length < maxImages) {
              let finalUrl = candidate.url;

              // Try to get full-size version even for thumbnails
              finalUrl = getFullSizeUrl(candidate.url);
              finalUrl = finalUrl.split('?')[0];

              if (!images.includes(finalUrl)) {
                images.push(finalUrl);
                selectedImages.push(finalUrl);
              }
            }
          }
        }

        // Store/domain
        const domain = window.location.hostname;

        // Post-process title/price/description/images per request
        const fullTitle = title || '';

        // Shorten title to a reasonable length (e.g., 80 chars) without cutting words abruptly
        const shortenTitle = (t, maxLen = 80) => {
          if (!t) return '';
          if (t.length <= maxLen) return t;
          // Try to cut at last space before maxLen
          const cut = t.lastIndexOf(' ', maxLen);
          if (cut > 40) return t.slice(0, cut) + '...';
          return t.slice(0, maxLen - 3) + '...';
        };

        const shortTitle = shortenTitle(fullTitle, 80);

        // Ensure description contains the full title once followed by any scraped description.
        // If the scraped description already begins with the full title, remove that duplicate.
        const composedDescription = (() => {
          const t = (fullTitle || '').trim();
          let desc = (description || '').trim();
          if (t && desc) {
            // Remove any repeated occurrences of the title inside the scraped description
            try {
              const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const re = new RegExp(esc, 'gi');
              desc = desc.replace(re, '').trim();
            } catch (e) {
              // fallback: simple removal of exact prefix
              if (desc.toLowerCase().startsWith(t.toLowerCase())) desc = desc.slice(t.length).trim();
            }
          }
          // Put the full title once at the top, followed by remaining description if any
          return (t ? (t + (desc ? '\n\n' + desc : '')) : desc).trim();
        })();

        // Normalize price: remove currency words like INR and any non-numeric characters except dot and comma
        let normalizedPrice = price || '';
        if (normalizedPrice) {
          // Remove common currency words and symbols
          normalizedPrice = normalizedPrice.replace(/INR\b/gi, '');
          normalizedPrice = normalizedPrice.replace(/[₹$£€¥,\s]/g, '');
          // Keep only digits and decimal
          const m = normalizedPrice.match(/\d+(?:\.\d+)?/);
          normalizedPrice = m ? m[0] : '';
        }

        // Normalize images: prefer full-size / original image URLs only
        const normalizeImageUrl = (u) => {
          if (!u || typeof u !== 'string') return null;
          let url = u;
          try {
            // Remove query params
            url = url.split('?')[0];
            // Use getFullSizeUrl logic where possible
            // Amazon patterns
            url = url.replace(/_AC_[A-Z0-9]+_/g, '.');
            url = url.replace(/_AC_\w+/g, '');
            url = url.replace(/_SX\d+_SY\d+_/, '');
            url = url.replace(/_SX\d+_/, '');
            url = url.replace(/_SY\d+_/, '');
            url = url.replace(/_\w+\.(jpg|jpeg|png|webp)$/i, '.$1');
            // Flipkart pattern: /image/<WIDTH>x<HEIGHT>/ -> /image/
            url = url.replace(/\/image\/\d+x\d+\//, '/image/');
            // Remove common thumbnail markers
            url = url.replace(/thumb|thumbnail|_thumb|_small|_mini/gi, '');
            url = url.replace(/\/thumbnails?\//i, '/');
            url = url.replace(/\/thumb\//i, '/');
            url = url.replace(/([^:\/])\/+$/,'$1');

            // Carefully remove accidental duplicate dots in the pathname (e.g. '..jpg' -> '.jpg')
            try {
              const parsed = new URL(url);
              // Collapse runs of dots in the pathname to a single dot
              parsed.pathname = parsed.pathname.replace(/\.{2,}/g, '.');
              // Collapse duplicate slashes in the pathname
              parsed.pathname = parsed.pathname.replace(/\/\/{2,}/g, '/');
              // Rebuild the URL without query params
              url = parsed.origin + parsed.pathname + (parsed.hash || '');
            } catch (e) {
              // If URL parsing fails, apply a conservative regex that avoids touching protocol
              url = url.replace(/([^:])\.{2,}/g, '$1.');
              url = url.replace(/\/\/{2,}/g, '/');
            }
          } catch (e) {
            return u;
          }
          return url;
        };

        const uniqueImages = [];
        for (const img of images) {
          const norm = normalizeImageUrl(img);
          if (!norm) continue;
          // Filter out small/thumbnail indicators conservatively
          const lowQuality = /(?:32x32|64x64|100x100|150x150|200x200|thumb|thumbnail|small|icon)/i;
          if (lowQuality.test(norm)) continue;
          if (!uniqueImages.includes(norm)) uniqueImages.push(norm);
        }

        // If we filtered too aggressively and have no images, fall back to original list (de-duplicated)
        let finalImages = uniqueImages.length > 0 ? uniqueImages : Array.from(new Set(images.map(i => (i || '').split('?')[0])));

        // Further filter images to likely product images and limit the total returned
        const isLikelyProductImage = (u, titleText) => {
          if (!u) return false;
          const lower = u.toLowerCase();
          // Exclude obvious non-product assets
          const excludePat = /(promos?|promo|cms-rpd-img|banner|badge|logo|sprite|icon|spacer|placeholder|ads?|advert|avatar|avatar|user|google|gstatic|analytics|pixel)/i;
          if (excludePat.test(lower)) return false;

          // Prefer images on known product hosts or paths
          if (/m\.media-amazon\.com|rukminim|flac|flipkart|product|products|gallery|images\/i/.test(lower)) return true;

          // If filename is reasonably long and resembles an asset (no tiny names), accept
          const pathPart = u.split('/').pop() || '';
          if (/^[a-z0-9A-Z\-_,]+\.(jpg|jpeg|png|webp)$/i.test(pathPart) && pathPart.length > 8) return true;

            // Heuristic: require a token match from the title for non-obvious hosts
            if (titleText) {
              const tokens = titleText.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 4).slice(0, 6).map(t => t.toLowerCase());
              for (const tok of tokens) {
                if (lower.includes(tok)) return true;
              }
            }

          return false;
        };

  // Apply likely-product filter and cap results to top 6
        try {
          const filteredLikely = finalImages.filter(u => isLikelyProductImage(u, fullTitle));
          if (filteredLikely && filteredLikely.length > 0) finalImages = filteredLikely;
        } catch (e) {}

  if (Array.isArray(finalImages) && finalImages.length > 20) finalImages = finalImages.slice(0, 20);

        // Amazon-specific filtering: prefer product image hosts/paths and exclude promos/logos
        try {
          const isAmazon = domain && /(^|\.)amazon\./i.test(domain);
          if (isAmazon) {
            const amazonKeep = finalImages.filter(u => {
              if (!u) return false;
              const lower = u.toLowerCase();
              // Exclude obvious non-product assets
              const excludePat = /(promos?|promo|cms-rpd-img|banner|badge|logo|sprite|icon|spacer|placeholder|ads?|advert)/i;
              if (excludePat.test(lower)) return false;
              // Prefer Amazon product image paths (m.media-amazon.com/images/I/ or /images/I/)
              if (/m\.media-amazon\.com\/images\/i\//i.test(u) || /\/images\/i\//i.test(u)) return true;
              // Also accept images where filename looks like a product asset (alphanumeric and punctuation)
              const path = u.split('/').pop() || '';
              if (/^[a-z0-9A-Z\-_,]+\.[a-z]{3,4}$/i.test(path) && path.length > 8) return true;
              return false;
            });
            if (amazonKeep.length > 0) {
              finalImages = amazonKeep;
            }
          }
        } catch (e) {
          // ignore amazon-specific filtering errors
        }

  // Determine currency and create a displayPrice (escape $ with backslash)
        let currency = '';
        let displayPrice = normalizedPrice || '';
        try {
          if (price && /₹/.test(price)) { currency = 'INR'; displayPrice = 'INR ' + displayPrice; }
          else if (price && /\$/.test(price)) { currency = 'USD'; displayPrice = '\\$' + displayPrice; }
          else if (price && /£/.test(price)) { currency = 'GBP'; displayPrice = '£' + displayPrice; }
          else if (price && /€/.test(price)) { currency = 'EUR'; displayPrice = '€' + displayPrice; }
        } catch (e) {}

  // Note: image width filtering is intentionally performed after page.evaluate
  // in the Node-side async handler to avoid using await inside the page function.

        return {
          title: shortTitle,
          fullTitle: fullTitle,
          price: normalizedPrice,
          original_price: originalPrice || null,
          displayPrice,
          currency,
          description: composedDescription,
          images: finalImages,
          // include the broader unfiltered image candidate list so the client can optionally show them
          images_all: Array.from(new Set(images.map(i => (i || '').split('?')[0]))),
          domain
        };
      });

      await browser.close();
      console.log('Scraping completed successfully');

      // Post-process images for minimum width (>=400px) and amazon-specific filtering
      try {
        if (data && Array.isArray(data.images) && data.images.length > 0) {
          const filtered = await filterImagesByMinWidth(data.images, 400);
          if (filtered && filtered.length > 0) data.images = filtered;
          // Additional amazon filter (already applied in evaluate, but double-check)
          try {
            if (data.domain && /(^|\.)amazon\./i.test(data.domain)) {
              const amazonKeep = data.images.filter(u => {
                if (!u) return false;
                const lower = u.toLowerCase();
                const excludePat = /(promos?|promo|cms-rpd-img|banner|badge|logo|sprite|icon|spacer|placeholder|ads?|advert)/i;
                if (excludePat.test(lower)) return false;
                if (/m\.media-amazon\.com\/images\/i\//i.test(u) || /\/images\/i\//i.test(u)) return true;
                const path = u.split('/').pop() || '';
                if (/^[a-z0-9A-Z\-_,]+\.[a-z]{3,4}$/i.test(path) && path.length > 8) return true;
                return false;
              });
              if (amazonKeep.length > 0) data.images = amazonKeep;
            }
          } catch (e) {}
        }
      } catch (e) {
        console.error('Image width filtering failed:', e && (e.stack || e.message || e));
      }

      res.json(data);

    } catch (playwrightError) {
      console.error('Playwright scraping failed:', playwrightError && (playwrightError.stack || playwrightError.message || playwrightError));
      
      // Fallback: Try simple HTTP request with cheerio
      try {
        console.log('Attempting fallback scraping with cheerio...');
        const axios = require('axios');
        const cheerio = require('cheerio');
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
  let title = $('title').text().trim() || 
       $('meta[property="og:title"]').attr('content') || 
       $('h1').first().text().trim() ||
       $('#productTitle').text().trim() ||
       $('span.B_NuCI').first().text().trim() ||
       $('span._35KyD6').first().text().trim();
        
        // Clean up title - remove domain prefixes
        title = title.replace(/^(amazon\.com|www\.amazon\.com|flipkart\.com|www\.flipkart\.com|myntra\.com|www\.myntra\.com)\s*[-:]\s*/i, '');
        title = title.replace(/\s*[-|]\s*amazon\.com.*$/i, '');
        title = title.replace(/\s*[-|]\s*flipkart\.com.*$/i, '');
        title = title.replace(/\s*[-|]\s*myntra\.com.*$/i, '');
        title = title.trim();

        // Try JSON-LD parsing for product info in fallback
        try {
          const ld = $('script[type="application/ld+json"]');
          ld.each((i, el) => {
            try {
              const json = JSON.parse($(el).html() || '{}');
              const product = Array.isArray(json) ? json.find(j => j['@type'] && String(j['@type']).toLowerCase() === 'product') : (json['@type'] && String(json['@type']).toLowerCase() === 'product' ? json : null);
              if (product) {
                if ((!title || title.length < 5) && product.name) title = product.name;
                if ((!price || price === '') && product.offers) price = (product.offers.priceCurrency ? product.offers.priceCurrency + ' ' : '') + (product.offers.price || '');
                if ((!description || description.length < 5) && product.description) description = product.description;
              }
            } catch (e) {}
          });
        } catch (e) {}
        
  let price = $('.a-price .a-offscreen').text().trim() ||
       $('.a-price-whole').text().trim() ||
       $('#priceblock_ourprice').text().trim() ||
       $('#priceblock_dealprice').text().trim() ||
       $('meta[property="product:price:amount"]').attr('content') ||
       $('.price').first().text().trim() ||
       $('[class*="price"]').first().text().trim() ||
    $('._30jeq3').first().text().trim() || // Flipkart main price
    $('div._30jeq3._1_WHN1').first().text().trim() ||
    $('._3I9_wc').first().text().trim() ||
    $('._25b18c').first().text().trim() ||
    $('._16Jk6d').first().text().trim() ||
    $('._1vC4OE').first().text().trim();
        
        // Clean up price - extract only numeric values
        const priceMatch = price.match(/[\$₹£€]?\s*[\d,]+\.?\d*/);
        price = priceMatch ? priceMatch[0].trim() : '';
        
        let description = $('#productDescription').text().trim() ||
                         $('#feature-bullets').text().trim() ||
                         $('.product-description').text().trim() ||
                         $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                              $('.description').first().text().trim() ||
                              $('._1mXcCf').first().text().trim() ||
                              $('._2RngUh').first().text().trim() ||
                              $('._2418kt').first().text().trim();
        
        // Clean up description - remove domain references
        description = description.replace(/\b(amazon|flipkart|myntra)\.com\b/gi, '');
        description = description.replace(/\s+/g, ' ').trim();
        
        // Images - improved fallback scraping with quality prioritization
        const images = [];
        const processedUrls = new Set();

        // Function to check if URL is likely a thumbnail
        const isThumbnail = (url) => {
          const lowerUrl = url.toLowerCase();
          return lowerUrl.includes('thumb') ||
                 lowerUrl.includes('thumbnail') ||
                 lowerUrl.includes('small') ||
                 lowerUrl.includes('tiny') ||
                 lowerUrl.includes('mini') ||
                 lowerUrl.includes('icon') ||
                 lowerUrl.includes('32x32') ||
                 lowerUrl.includes('64x64') ||
                 lowerUrl.includes('100x100') ||
                 lowerUrl.includes('150x150') ||
                 lowerUrl.includes('200x200') ||
                 // Amazon specific size parameters
                 lowerUrl.includes('_ac_us') ||
                 lowerUrl.includes('_ac_sx') ||
                 lowerUrl.includes('_ac_sy') ||
                 lowerUrl.includes('_ac_sl') ||
                 lowerUrl.includes('_sr') ||
                 // General size indicators
                 /\d+x\d+/.test(lowerUrl) && parseInt(lowerUrl.match(/(\d+)x(\d+)/)[1]) < 300;
        };

        // Function to try to get full-size URL from thumbnail
        const getFullSizeUrl = (thumbnailUrl) => {
          let fullUrl = thumbnailUrl;

          // Amazon patterns - more comprehensive handling
          if (thumbnailUrl.includes('m.media-amazon.com/images/I/')) {
            // Remove Amazon size parameters like _AC_US40_, _AC_SX466_, _AC_SY300_, etc.
            fullUrl = fullUrl.replace(/_\w+\.jpg$/, '.jpg');
            fullUrl = fullUrl.replace(/_\w+\.png$/, '.png');
            fullUrl = fullUrl.replace(/_\w+\.jpeg$/, '.jpeg');
            fullUrl = fullUrl.replace(/_\w+\.webp$/, '.webp');

            // Handle multiple size parameters (rare but possible)
            fullUrl = fullUrl.replace(/_\w+_\w+\./, '.');

            // If still has size parameters, try a more aggressive approach
            if (fullUrl.includes('_AC_') || fullUrl.includes('_SR') || fullUrl.includes('_SY') || fullUrl.includes('_SX')) {
              const parts = fullUrl.split('.');
              if (parts.length >= 2) {
                const extension = parts[parts.length - 1];
                const baseUrl = fullUrl.substring(0, fullUrl.lastIndexOf('.'));
                // Remove all size-related parameters
                const cleanBase = baseUrl.replace(/_\w+$/, '');
                fullUrl = cleanBase + '.' + extension;
              }
            }
          }

          // Flipkart patterns
          if (thumbnailUrl.includes('rukminim1.flixcart.com')) {
            fullUrl = thumbnailUrl.replace(/\/image\/\d+x\d+\//, '/image/');
          }

          // General patterns
          fullUrl = fullUrl.replace(/\/thumb\//, '/');
          fullUrl = fullUrl.replace(/\/thumbnails?\//, '/');
          fullUrl = fullUrl.replace(/_thumb\./, '.');
          fullUrl = fullUrl.replace(/_thumbnail\./, '.');
          fullUrl = fullUrl.replace(/_small\./, '.');

          return fullUrl;
        };

        // Function to get image quality score
        const getImageQualityScore = (url) => {
          let score = 0;

          if (url.includes('1000x') || url.includes('1200x') || url.includes('1500x')) score += 10;
          if (url.includes('800x') || url.includes('900x')) score += 8;
          if (url.includes('600x') || url.includes('700x')) score += 6;
          if (url.includes('400x') || url.includes('500x')) score += 4;

          if (url.includes('.jpg') || url.includes('.jpeg')) score += 3;
          if (url.includes('.png')) score += 2;

          if (!url.includes('w=') && !url.includes('h=')) score += 2;

          return score;
        };

        // Extract images from JavaScript variables and data attributes in cheerio
        const imageCandidates = [];

        $('script').each((i, script) => {
          const scriptContent = $(script).html();
          if (scriptContent) {
            // Look for common patterns in JavaScript that contain image URLs
            const imagePatterns = [
              /"image"\s*:\s*"([^"]+)"/gi,
              /'image'\s*:\s*'([^']+)'/gi,
              /"images"\s*:\s*\[([^\]]+)\]/gi,
              /'images'\s*:\s*\[([^\]]+)\]/gi,
              /"largeImage"\s*:\s*"([^"]+)"/gi,
              /'largeImage'\s*:\s*'([^']+)'/gi,
              /"hiRes"\s*:\s*"([^"]+)"/gi,
              /'hiRes'\s*:\s*'([^']+)'/gi,
              /"mainImage"\s*:\s*"([^"]+)"/gi,
              /'mainImage'\s*:\s*'([^']+)'/gi,
              // Amazon specific patterns
              /"large"\s*:\s*"([^"]+)"/gi,
              /'large'\s*:\s*'([^']+)'/gi,
              /data-image-url="([^"]+)"/gi,
              /data-old-hires="([^"]+)"/gi,
              /data-image-index="([^"]+)"/gi
            ];

            imagePatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(scriptContent)) !== null) {
                const imageUrl = match[1];
                if (imageUrl && imageUrl.startsWith('http') && !processedUrls.has(imageUrl)) {
                  processedUrls.add(imageUrl);
                  const qualityScore = getImageQualityScore(imageUrl) + 3; // Bonus for script-extracted images
                  imageCandidates.push({
                    url: imageUrl,
                    score: qualityScore,
                    isThumbnail: isThumbnail(imageUrl)
                  });
                }
              }
            });

            // Look for image arrays in JavaScript
            const arrayPatterns = [
              /images\s*=\s*\[([^\]]+)\]/gi,
              /imageList\s*=\s*\[([^\]]+)\]/gi,
              /productImages\s*=\s*\[([^\]]+)\]/gi,
              /gallery\s*=\s*\[([^\]]+)\]/gi
            ];

            arrayPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(scriptContent)) !== null) {
                const arrayContent = match[1];
                // Extract URLs from the array
                const urlMatches = arrayContent.match(/"([^"]+)"/g) || arrayContent.match(/'([^']+)'/g);
                if (urlMatches) {
                  urlMatches.forEach(urlMatch => {
                    const imageUrl = urlMatch.slice(1, -1); // Remove quotes
                    if (imageUrl && imageUrl.startsWith('http') && !processedUrls.has(imageUrl)) {
                      processedUrls.add(imageUrl);
                      const qualityScore = getImageQualityScore(imageUrl) + 3;
                      imageCandidates.push({
                        url: imageUrl,
                        score: qualityScore,
                        isThumbnail: isThumbnail(imageUrl)
                      });
                    }
                  });
                }
              }
            });
          }
        });

        // Look for images in data attributes of any element
        $('*').each((i, element) => {
          const attrs = element.attributes;
          if (attrs) {
            for (let j = 0; j < attrs.length; j++) {
              const attr = attrs[j];
              if (attr.name && attr.name.startsWith('data-') && attr.value && attr.value.startsWith('http') && attr.value.includes('image')) {
                if (!processedUrls.has(attr.value)) {
                  processedUrls.add(attr.value);
                  const qualityScore = getImageQualityScore(attr.value) + 2;
                  imageCandidates.push({
                    url: attr.value,
                    score: qualityScore,
                    isThumbnail: isThumbnail(attr.value)
                  });
                }
              }
            }
          }
        });

        // Collect image candidates from img tags

        $('img').each((i, img) => {
          const sources = [];

          const src = $(img).attr('src');
          const dataSrc = $(img).attr('data-src');
          const dataOriginal = $(img).attr('data-original');
          const dataLazy = $(img).attr('data-lazy');
          const dataLazySrc = $(img).attr('data-lazy-src');
          const dataZoom = $(img).attr('data-zoom');
          const dataFull = $(img).attr('data-full');
          const dataLarge = $(img).attr('data-large');

          if (src) sources.push(src);
          if (dataSrc) sources.push(dataSrc);
          if (dataOriginal) sources.push(dataOriginal);
          if (dataLazy) sources.push(dataLazy);
          if (dataLazySrc) sources.push(dataLazySrc);
          if (dataZoom) sources.push(dataZoom);
          if (dataFull) sources.push(dataFull);
          if (dataLarge) sources.push(dataLarge);

          sources.forEach(source => {
            if (source && source.startsWith('http') && !processedUrls.has(source)) {
              processedUrls.add(source);
              const qualityScore = getImageQualityScore(source);
              imageCandidates.push({
                url: source,
                score: qualityScore,
                isThumbnail: isThumbnail(source)
              });
            }
          });
        });

        // Sort by quality and select best images
        imageCandidates.sort((a, b) => b.score - a.score);

        const selectedImages = [];
        const maxImages = 20;

        // Prefer non-thumbnails first
        for (const candidate of imageCandidates) {
          if (!candidate.isThumbnail && selectedImages.length < maxImages) {
            let finalUrl = candidate.url;
            if (candidate.isThumbnail) {
              finalUrl = getFullSizeUrl(candidate.url);
            }
            finalUrl = finalUrl.split('?')[0];

            if (!images.includes(finalUrl)) {
              images.push(finalUrl);
              selectedImages.push(finalUrl);
            }
          }
        }

        // Add thumbnails as fallback
        if (selectedImages.length < maxImages) {
          for (const candidate of imageCandidates) {
            if (selectedImages.length < maxImages) {
              let finalUrl = candidate.url;
              finalUrl = getFullSizeUrl(candidate.url);
              finalUrl = finalUrl.split('?')[0];

              if (!images.includes(finalUrl)) {
                images.push(finalUrl);
                selectedImages.push(finalUrl);
              }
            }
          }
        }
        
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Apply Amazon-specific filtering to fallback images as well
        try {
          const isAmazon = domain && /(^|\.)amazon\./i.test(domain);
          if (isAmazon) {
            const filtered = images.filter(u => {
              if (!u) return false;
              const lower = u.toLowerCase();
              const excludePat = /(promos?|promo|cms-rpd-img|banner|badge|logo|sprite|icon|spacer|placeholder|ads?|advert)/i;
              if (excludePat.test(lower)) return false;
              if (/m\.media-amazon\.com\/images\/i\//i.test(u) || /\/images\/i\//i.test(u)) return true;
              const path = u.split('/').pop() || '';
              if (/^[a-z0-9A-Z\-_,]+\.[a-z]{3,4}$/i.test(path) && path.length > 8) return true;
              return false;
            });
            if (filtered.length > 0) images = filtered;
          }
        } catch (e) {}

        // Normalize title/description to avoid repeating title twice
        const t = (title || '').trim();
        if (t && description) {
          if (description.toLowerCase().startsWith(t.toLowerCase())) {
            description = description.slice(t.length).trim();
          }
          if (description.toLowerCase().startsWith(t.toLowerCase())) {
            description = description.slice(t.length).trim();
          }
        }

        // Heuristic to keep likely product images and limit to top 8
        const isLikelyProductImageFallback = (u, titleText) => {
          if (!u) return false;
          const lower = u.toLowerCase();
          const excludePat = /(promos?|promo|cms-rpd-img|banner|badge|logo|sprite|icon|spacer|placeholder|ads?|advert|avatar|google|gstatic)/i;
          if (excludePat.test(lower)) return false;
          if (/m\.media-amazon\.com|rukminim|flipkart|product|products|gallery|images\//i.test(lower)) return true;
          const pathPart = u.split('/').pop() || '';
          if (/^[a-z0-9A-Z\-_,]+\.(jpg|jpeg|png|webp)$/i.test(pathPart) && pathPart.length > 8) return true;
          if (titleText) {
            const tokens = titleText.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).filter(s => s.length > 3).slice(0,6).map(s => s.toLowerCase());
            for (const tok of tokens) if (lower.includes(tok)) return true;
          }
          return false;
        };

        try {
          const likely = images.filter(u => isLikelyProductImageFallback(u, title));
          if (likely && likely.length > 0) images = likely;
        } catch (e) {}

  if (images && images.length > 20) images = images.slice(0, 20);

        // Determine currency and displayPrice for fallback
        let currencyFallback = '';
        let displayPriceFallback = price || '';
        try {
          if (price && /₹/.test(price)) { currencyFallback = 'INR'; displayPriceFallback = 'INR ' + (price || ''); }
          else if (price && /\$/.test(price)) { currencyFallback = 'USD'; displayPriceFallback = '\\\$' + (price || ''); }
          else if (price && /£/.test(price)) { currencyFallback = 'GBP'; displayPriceFallback = '£' + (price || ''); }
          else if (price && /€/.test(price)) { currencyFallback = 'EUR'; displayPriceFallback = '€' + (price || ''); }
        } catch (e) {}

  // Attempt to extract original / list price (struck-through price) from common selectors
  let originalPriceFallback = '';
        try {
          const listSelectors = [
            '#priceblock_listprice',
            '.a-text-strike',
            '.priceBlockStrikePriceString',
            '.list-price',
            '.strike',
            '.comparison_price'
          ];
          for (const sel of listSelectors) {
            try {
              const el = $(sel).first();
              if (el && el.text()) {
                const m = el.text().trim().match(/[\$₹£€]?\s*[\d,]+\.?\d*/);
                if (m) { originalPriceFallback = m[0].trim(); break; }
              }
            } catch (e) {}
          }
        } catch (e) {}

        const fallbackData = {
          title: title || 'Product Title',
          price: price || '',
          original_price: originalPriceFallback || null,
          displayPrice: displayPriceFallback,
          currency: currencyFallback,
          description: (t ? (t + (description ? '\n\n' + description : '')) : description) || '',
          images,
          images_all: Array.from(new Set(images.map(i => (i || '').split('?')[0]))),
          domain
        };
        
        console.log('Fallback scraping completed');
        res.json(fallbackData);
        
      } catch (fallbackError) {
        console.error('Fallback scraping also failed:', fallbackError && (fallbackError.stack || fallbackError.message || fallbackError));
        const devDetails = {
          playwright: playwrightError ? (playwrightError.stack || playwrightError.message || String(playwrightError)) : null,
          fallback: fallbackError ? (fallbackError.stack || fallbackError.message || String(fallbackError)) : null
        };
        // Only include detailed traces in development
        const responseBody = process.env.NODE_ENV === 'production' ?
          { error: 'Failed to scrape product data', details: 'Both Playwright and fallback methods failed' } :
          { error: 'Failed to scrape product data', details: 'Both Playwright and fallback methods failed', traces: devDetails };
        res.status(500).json(responseBody);
      }
    }
  } catch (error) {
    console.error('General scraping error:', error);
    res.status(500).json({ error: 'Failed to process scraping request' });
  }
});

// Flag comment
app.post('/api/comments/:id/flag', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;
    
    // Update comment flag count
    await pool.query(
      'UPDATE comments SET flag_count = flag_count + 1, flagged_by = $1, flagged_at = NOW() WHERE id = $2',
      [userId, id]
    );
    
    // Log the flag reason if provided
    if (reason) {
      await pool.query(
        'INSERT INTO user_reports (reporter_id, reported_content_id, content_type, reason, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [userId, id, 'comment', reason, `Comment flagged: ${reason}`]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error flagging comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new comment

// Create superadmin endpoint (for initial setup)
app.post('/api/auth/create-superadmin', async (req, res) => {
  try {
    const { email = 'admin@example.com', password = 'admin123', username = 'admin' } = req.body;
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // First, add password_hash column if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
    } catch (err) {
      // Column might already exist, ignore error
    }
    
    // Generate UUID for the user
    const userId = require('crypto').randomUUID();
    
    // Create or update superadmin user
    const { rows } = await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       ON CONFLICT (email) DO UPDATE SET 
       password_hash = EXCLUDED.password_hash, 
       role = EXCLUDED.role, 
       username = EXCLUDED.username
       RETURNING id, username, email, role`,
      [userId, username, email, password_hash, 'admin']
    );
    
    res.json({ message: 'Superadmin created/updated successfully', user: rows[0] });
  } catch (err) {
    console.error('Create superadmin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Competitor Research endpoint (Super Admin only)
app.post('/api/admin/competitor-research', requireSuperAdmin, async (req, res) => {
  try {
    const { competitors, stores } = req.body;
    const CompetitorResearcher = require('./scripts/competitor-research');
    const researcher = new CompetitorResearcher();

    const deals = await researcher.researchAllCompetitors(competitors, stores);

    // Check for duplicates
    const dealsWithDuplicates = await researcher.checkForDuplicates(deals, pool);

    const duplicates = dealsWithDuplicates.filter(deal => deal.isDuplicate);
    const unique = dealsWithDuplicates.filter(deal => !deal.isDuplicate);

    res.json({
      deals: dealsWithDuplicates,
      summary: {
        total: dealsWithDuplicates.length,
        unique: unique.length,
        duplicates: duplicates.length
      }
    });
  } catch (err) {
    console.error('Competitor research error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Insert researched deals (Super Admin only)
app.post('/api/admin/insert-researched-deals', requireSuperAdmin, async (req, res) => {
  try {
    const { deals, insertDuplicates = false, createdBy } = req.body;
    const CompetitorResearcher = require('./scripts/competitor-research');
    const researcher = new CompetitorResearcher();

    // Filter deals based on duplicate status
    const dealsToInsert = insertDuplicates
      ? deals
      : deals.filter(deal => !deal.isDuplicate);

    const insertedDeals = await researcher.saveDealsToDatabase(dealsToInsert, pool, createdBy);

    // Log the insertion for audit
    const auditQuery = `
      INSERT INTO audit_log (action, target_type, target_id, actor_id, actor_role, diff_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await pool.query(auditQuery, [
      'competitor_deals_inserted',
      'system',
      null,
      req.user?.id || '00000000-0000-0000-0000-000000000000',
      req.user?.role || 'system',
      JSON.stringify({
        totalDeals: deals.length,
        insertedDeals: insertedDeals.length,
        duplicatesSkipped: deals.length - dealsToInsert.length,
        competitors: [...new Set(deals.map(d => d.competitor))],
        createdBy: createdBy || 'system'
      })
    ]);

    res.json({
      inserted: insertedDeals.length,
      skipped: deals.length - dealsToInsert.length,
      deals: insertedDeals
    });
  } catch (err) {
    console.error('Insert researched deals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// EARLY ACCESS MANAGEMENT ENDPOINTS
// ================================

// Get all access codes
app.get('/api/admin/early-access-codes', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM early_access_codes 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching access codes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new access code
app.post('/api/admin/early-access-codes', requireSuperAdmin, async (req, res) => {
  try {
    const { code, description, max_uses, expires_at } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const { rows } = await pool.query(`
      INSERT INTO early_access_codes (code, description, max_uses, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [code, description || null, max_uses || 1, expires_at || null, req.userId]);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating access code:', err);
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Code already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Update access code
app.put('/api/admin/early-access-codes/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, max_uses, expires_at, is_active } = req.body;
    
    const { rows } = await pool.query(`
      UPDATE early_access_codes 
      SET code = $1, description = $2, max_uses = $3, expires_at = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, description, max_uses, expires_at, is_active, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Access code not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating access code:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete access code
app.delete('/api/admin/early-access-codes/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM early_access_codes WHERE id = $1 RETURNING *', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Access code not found' });
    }
    
    res.json({ message: 'Access code deleted successfully' });
  } catch (err) {
    console.error('Error deleting access code:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get early access requests
app.get('/api/admin/early-access-requests', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM early_access_requests 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching access requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update request status
app.put('/api/admin/early-access-requests/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const { rows } = await pool.query(`
      UPDATE early_access_requests 
      SET status = $1, notes = $2, processed_by = $3, processed_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, notes, req.userId, id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate UUID for the user
    const userId = require('crypto').randomUUID();
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (id, email, password_hash, username, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, email, username, role, status',
      [userId, email, hashedPassword, username, 'user', 'active']
    );
    
    const user = result.rows[0];
    
    // Set session cookie
    res.cookie('session_id', user.id, { 
      httpOnly: true, 
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
      domain: 'localhost'  // Allow cookie to be sent to any localhost port
    });
    
    res.json({ user, authenticated: true, session: { user_id: user.id } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signin endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user from database
    const { rows } = await pool.query(
      'SELECT id, username, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = rows[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session cookie with proper domain and path
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.saversdream.com' : undefined; // undefined = current domain

    res.cookie('session_id', user.id, {
      httpOnly: true,
      secure: isProduction, // Use HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/',
      domain: domain // Allow cookie to work on subdomains in production
    });
    
    // Return user data (without password) and include session info
    const { password_hash, ...userData } = user;
    res.json({ 
      user: userData, 
      authenticated: true,
      session: { user_id: user.id } // Include session data for frontend
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Signout endpoint
app.post('/api/auth/signout', async (req, res) => {
  try {
    // Clear the session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.saversdream.com' : undefined;

    res.clearCookie('session_id', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      domain: domain
    });
    
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { content, user_id, deal_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO comments (content, user_id, deal_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [content, user_id, deal_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get alerts for user
app.get('/api/alerts', async (req, res) => {
  try {
    const { userId, active } = req.query;
    
    let query = 'SELECT * FROM alerts';
    const params = [];
    const conditions = [];
    
    if (userId) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(userId);
    }
    
    if (active === 'true') {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(true);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new alert
app.post('/api/alerts', async (req, res) => {
  try {
    const { user_id, type, rules, is_active = true } = req.body;
    
    const { rows } = await pool.query(
      'INSERT INTO alerts (user_id, type, rules, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [user_id, type, JSON.stringify(rules), is_active]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update alert
app.put('/api/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(key === 'rules' ? JSON.stringify(updates[key]) : updates[key]);
        paramCount++;
      }
    });
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);
    
    const query = `UPDATE alerts SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await pool.query(query, updateValues);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// Activate alert
app.put('/api/alerts/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(
      'UPDATE alerts SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error activating alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// Deactivate alert
app.put('/api/alerts/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows } = await pool.query(
      'UPDATE alerts SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error deactivating alert:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new announcement
app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, type, target_audience, author_id, is_active, send_push, sent_count, views } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO announcements (title, content, type, target_audience, author_id, is_active, send_push, sent_count, views, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *',
      [title, content, type, target_audience, author_id, is_active, send_push, sent_count, views]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all audit logs
app.get('/api/audit_logs', async (req, res) => {
  try {
    let query = 'SELECT * FROM admin_actions';
    const params = [];
    if (req.query.action) {
      query += ' WHERE action_type = $1';
      params.push(req.query.action);
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all system settings
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, key, value, description, created_at, updated_at FROM system_settings ORDER BY key'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific setting by key
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM system_settings WHERE key = $1',
      [key]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new setting
app.post('/api/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO system_settings (key, value, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
      [key, value, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update setting by key
app.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    const { rows } = await pool.query(
      'INSERT INTO system_settings (key, value, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW() RETURNING *',
      [key, value, description]
    );
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Saved deals endpoints
app.get('/api/saved-deals/check', async (req, res) => {
  try {
    const { dealId, userId } = req.query;
    const { rows } = await pool.query(
      'SELECT id FROM saved_deals WHERE deal_id = $1 AND user_id = $2',
      [dealId, userId]
    );
    res.json({ saved: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/saved-deals', async (req, res) => {
  try {
    const { dealId, userId } = req.body;
    await pool.query(
      'INSERT INTO saved_deals (deal_id, user_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [dealId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/saved-deals', async (req, res) => {
  try {
    const { dealId, userId } = req.query;
    await pool.query(
      'DELETE FROM saved_deals WHERE deal_id = $1 AND user_id = $2',
      [dealId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notification endpoints
app.get('/api/notifications/unread', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return res.json([]);
    
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC',
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/mark-read', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json({ success: true });
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE id IN (${placeholders})`,
      ids
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoints
app.get('/api/admin/dashboard-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [userStats, dealStats, commentStats] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today FROM users', [today]),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today, COUNT(CASE WHEN status = $2 THEN 1 END) as pending FROM deals', [today, 'pending']),
      pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= $1 THEN 1 END) as today FROM comments', [today])
    ]);
    
    res.json({
      total_users: parseInt(userStats.rows[0].total),
      new_users_today: parseInt(userStats.rows[0].today),
      active_users: parseInt(userStats.rows[0].total), // Mock
      total_content: parseInt(dealStats.rows[0].total) + parseInt(commentStats.rows[0].total),
      new_content_today: parseInt(dealStats.rows[0].today) + parseInt(commentStats.rows[0].today),
      pending_moderation: parseInt(dealStats.rows[0].pending),
      recent_activities: [],
      system_alerts: [{ id: '1', type: 'info', message: 'System operational', created_at: new Date().toISOString() }]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/quick-stats', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as pending FROM deals WHERE status = $1', ['pending']);
    res.json({
      online_users: Math.floor(Math.random() * 100),
      pending_actions: parseInt(rows[0].pending),
      system_load: Math.random() * 100,
      error_rate: Math.random() * 5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/system-health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      database: 'healthy',
      api: 'healthy',
      storage: 'healthy',
      cache: 'healthy'
    });
  } catch (err) {
    res.json({
      database: 'down',
      api: 'down',
      storage: 'down',
      cache: 'down'
    });
  }
});

app.get('/api/admin/user-stats', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    // Get user basic info
    const { rows: userRows } = await pool.query(
      'SELECT id, username, email, role, created_at, status FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userRows[0];
    
    // Get user stats
    const [dealsResult, commentsResult, votesGivenResult, votesReceivedResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM deals WHERE created_by = $1', [user_id]),
      pool.query('SELECT COUNT(*) as count FROM comments WHERE user_id = $1', [user_id]),
      pool.query('SELECT COUNT(*) as count FROM votes WHERE user_id = $1', [user_id]),
      pool.query('SELECT COUNT(*) as count FROM votes v JOIN deals d ON v.deal_id = d.id WHERE d.created_by = $1', [user_id])
    ]);
    
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    
    const stats = {
      user,
      stats: {
        total_deals: parseInt(dealsResult.rows[0]?.count || 0),
        total_comments: parseInt(commentsResult.rows[0]?.count || 0),
        total_votes_given: parseInt(votesGivenResult.rows[0]?.count || 0),
        total_votes_received: parseInt(votesReceivedResult.rows[0]?.count || 0),
        account_age_days: accountAgeDays,
        last_activity: user.updated_at || user.created_at,
        is_banned: user.status === 'banned',
        is_suspended: user.status === 'suspended',
        ban_expiry: null,
        suspend_expiry: null
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Follow endpoints
// Follow a user
app.post('/api/follows/user', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { targetUserId } = req.body;
    
    // Insert follow relationship
    await pool.query(
      'INSERT INTO user_follows (follower_id, followed_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [sessionId, targetUserId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfollow a user
app.delete('/api/follows/user/:targetUserId', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { targetUserId } = req.params;
    
    await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND followed_id = $2',
      [sessionId, targetUserId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Follow a store
app.post('/api/follows/store', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { storeId } = req.body;
    
    await pool.query(
      'INSERT INTO store_follows (follower_id, store_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [sessionId, storeId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfollow a store
app.delete('/api/follows/store/:storeId', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { storeId } = req.params;
    
    await pool.query(
      'DELETE FROM store_follows WHERE follower_id = $1 AND store_id = $2',
      [sessionId, storeId]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if following a user
app.get('/api/follows/user/:targetUserId/check', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.json({ following: false });
    }
    
    const { targetUserId } = req.params;
    
    const { rows } = await pool.query(
      'SELECT 1 FROM user_follows WHERE follower_id = $1 AND followed_id = $2',
      [sessionId, targetUserId]
    );
    
    res.json({ following: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if following a store
app.get('/api/follows/store/:storeId/check', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.json({ following: false });
    }
    
    const { storeId } = req.params;
    
    const { rows } = await pool.query(
      'SELECT 1 FROM store_follows WHERE follower_id = $1 AND store_id = $2',
      [sessionId, storeId]
    );
    
    res.json({ following: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get follow counts for a user
app.get('/api/follows/counts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [followersResult, followingUsersResult, followingStoresResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM user_follows WHERE followed_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM user_follows WHERE follower_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM store_follows WHERE follower_id = $1', [userId])
    ]);
    
    res.json({
      followers: parseInt(followersResult.rows[0].count),
      following_users: parseInt(followingUsersResult.rows[0].count),
      following_stores: parseInt(followingStoresResult.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get following feed
app.get('/api/follows/feed', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.json([]);
    }
    
    const { limit = 20, offset = 0 } = req.query;
    
    // Get deals from followed users and stores
    const { rows } = await pool.query(`
      SELECT DISTINCT d.*, 
             c.name as category_name, c.emoji as category_emoji,
             s.name as store_name, s.logo_url as store_logo,
             u.username, u.role as user_role, u.reputation, u.avatar_url
      FROM deals d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN stores s ON d.store_id = s.id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE (
        d.created_by IN (SELECT followed_id FROM user_follows WHERE follower_id = $1)
        OR d.store_id IN (SELECT store_id FROM store_follows WHERE follower_id = $1)
      )
      AND d.status = 'live'
      ORDER BY d.created_at DESC
      LIMIT $2 OFFSET $3
    `, [sessionId, parseInt(limit), parseInt(offset)]);
    
    // Transform the data
    const transformedRows = rows.map(row => ({
      ...row,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        emoji: row.category_emoji
      } : null,
      store: row.store_name ? {
        id: row.store_id,
        name: row.store_name,
        logo_url: row.store_logo
      } : null,
      created_by_user: row.username ? {
        id: row.created_by,
        username: row.username,
        role: row.user_role,
        reputation: row.reputation,
        avatar_url: row.avatar_url
      } : null
    }));
    
    res.json(transformedRows);
  } catch (err) {
    console.error('Error fetching following feed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Change password endpoint
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Get user from database
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, sessionId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user role endpoint
app.put('/api/users/:id/role', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Check if user is admin (only admins can change roles)
    const { rows: adminCheck } = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [sessionId]
    );

  if (adminCheck.length === 0 || !['admin', 'superadmin', 'super_admin'].includes(adminCheck[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update user role
    const { rows } = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, role',
      [role, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: err.message });
  }
});

// Store push token endpoint
app.post('/api/push-tokens', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { token, platform, device_id, app_version } = req.body;
    
    await pool.query(
      `INSERT INTO push_tokens (token, user_id, platform, device_id, app_version, disabled, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW()) 
       ON CONFLICT (token) DO UPDATE SET 
       user_id = EXCLUDED.user_id, 
       platform = EXCLUDED.platform, 
       device_id = EXCLUDED.device_id, 
       app_version = EXCLUDED.app_version, 
       updated_at = NOW()`,
      [token, sessionId, platform, device_id, app_version]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error storing push token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reports endpoints
app.get('/api/reports', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM user_reports';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user_reports', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM user_reports';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// Affiliate endpoints
app.get('/api/affiliate-settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM affiliate_settings ORDER BY store_name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching affiliate settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/affiliate-stats', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT store_name, country_code, is_active FROM affiliate_settings');
    
    const stats = {
      total_stores: 0,
      active_affiliates: 0,
      total_countries: 0,
      stores_by_country: {},
    };
    
    if (rows) {
      const uniqueStores = new Set();
      const uniqueCountries = new Set();
      
      rows.forEach((setting) => {
        uniqueStores.add(setting.store_name);
        uniqueCountries.add(setting.country_code);
        
        if (setting.is_active) {
          stats.active_affiliates++;
        }
        
        if (!stats.stores_by_country[setting.country_code]) {
          stats.stores_by_country[setting.country_code] = 0;
        }
        stats.stores_by_country[setting.country_code]++;
      });
      
      stats.total_stores = uniqueStores.size;
      stats.total_countries = uniqueCountries.size;
    }
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching affiliate stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin elevation endpoint
app.post('/api/admin/elevate', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const { rows } = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Return elevation token (simplified for development) - note the service expects 'token' not 'elevationToken'
    const token = `elevation_${sessionId}_${Date.now()}`;
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats for admin panel
app.get('/api/admin/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user basic info
    const { rows: userRows } = await pool.query(
      'SELECT id, username, email, role, created_at, status FROM users WHERE id = $1',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userRows[0];
    
    // Get user stats
    const [dealsResult, commentsResult, votesGivenResult, votesReceivedResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM deals WHERE created_by = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM comments WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM votes WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM votes v JOIN deals d ON v.deal_id = d.id WHERE d.created_by = $1', [userId])
    ]);
    
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    
    const stats = {
      user,
      stats: {
        total_deals: parseInt(dealsResult.rows[0]?.count || 0),
        total_comments: parseInt(commentsResult.rows[0]?.count || 0),
        total_votes_given: parseInt(votesGivenResult.rows[0]?.count || 0),
        total_votes_received: parseInt(votesReceivedResult.rows[0]?.count || 0),
        account_age_days: accountAgeDays,
        last_activity: user.updated_at || user.created_at,
        is_banned: user.status === 'banned',
        is_suspended: user.status === 'suspended',
        ban_expiry: null,
        suspend_expiry: null
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin user action endpoints
app.post('/api/admin/admin-ban-user', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, reason, duration_days } = req.body;
    const banExpiry = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;
    
    const result = await pool.query(
      'UPDATE users SET status = $1, ban_expiry = $2 WHERE id = $3', 
      ['banned', banExpiry, user_id]
    );
    
    res.json({ success: true, message: 'User banned successfully' });
  } catch (err) {
    console.error('🔧 ERROR in ban user:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-unban-user', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, reason } = req.body;
    await pool.query(
      'UPDATE users SET status = $1, ban_expiry = NULL WHERE id = $2', 
      ['active', user_id]
    );
    
    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-suspend-user', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, reason, duration_days } = req.body;
    const suspendExpiry = duration_days ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000) : null;
    
    const result = await pool.query(
      'UPDATE users SET status = $1, suspend_expiry = $2 WHERE id = $3', 
      ['suspended', suspendExpiry, user_id]
    );
    
    res.json({ success: true, message: 'User suspended successfully' });
  } catch (err) {
    console.error('🔧 ERROR in suspend user:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-unsuspend-user', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, reason } = req.body;
    await pool.query(
      'UPDATE users SET status = $1, suspend_expiry = NULL WHERE id = $2', 
      ['active', user_id]
    );
    
    res.json({ success: true, message: 'User unsuspended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-change-role', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, new_role, reason } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [new_role, user_id]);
    res.json({ success: true, message: 'User role changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-delete-user', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_id, reason, hard_delete } = req.body;
    if (hard_delete) {
      await pool.query('DELETE FROM users WHERE id = $1', [user_id]);
    } else {
      await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['deleted', user_id]);
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-restore-user', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user_id]);
    res.json({ success: true, message: 'User restored successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-reset-password', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    const tempPassword = Math.random().toString(36).slice(-8);
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(tempPassword, saltRounds);
    
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, user_id]);
    res.json({ success: true, message: 'Password reset successfully', tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-verify-user', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['verified', user_id]);
    res.json({ success: true, message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-unverify-user', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['user', user_id]);
    res.json({ success: true, message: 'User unverified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-bulk-user-action', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const elevationToken = req.headers['x-admin-elevation'];
    
    if (!elevationToken) {
      return res.status(428).json({ error: 'Admin elevation required' });
    }
    
    // Verify user is admin/superadmin
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (rows.length === 0 || !['admin', 'superadmin'].includes(rows[0].role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { user_ids, action, reason, duration } = req.body;
    const results = [];
    
    // Process each user individually to track success/failure
    for (const userId of user_ids) {
      try {
        if (action === 'ban') {
          const banExpiry = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;
          await pool.query(
            'UPDATE users SET status = $1, ban_expiry = $2 WHERE id = $3', 
            ['banned', banExpiry, userId]
          );
        } else if (action === 'suspend') {
          const suspendExpiry = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;
          await pool.query(
            'UPDATE users SET status = $1, suspend_expiry = $2 WHERE id = $3', 
            ['suspended', suspendExpiry, userId]
          );
        } else if (action === 'unban') {
          await pool.query(
            'UPDATE users SET status = $1, ban_expiry = NULL WHERE id = $2', 
            ['active', userId]
          );
        } else if (action === 'unsuspend') {
          await pool.query(
            'UPDATE users SET status = $1, suspend_expiry = NULL WHERE id = $2', 
            ['active', userId]
          );
        }
        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Bulk ${action} completed`, 
      results 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Missing report endpoints
app.post('/api/reports', async (req, res) => {
  try {
    const { target_type, target_id, reporter_id, reason, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO user_reports (target_type, target_id, reporter_id, reason, description, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [target_type, target_id, reporter_id, reason, description, 'pending']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const { rows } = await pool.query(
      'UPDATE user_reports SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [status, adminNotes, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM user_reports WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/deal/:dealId', async (req, res) => {
  try {
    const { dealId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM user_reports WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC',
      ['deal', dealId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Missing admin dashboard endpoints
app.get('/api/admin/recent-activities', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/system-alerts', async (req, res) => {
  try {
    res.json([{ id: '1', type: 'info', message: 'System operational', created_at: new Date().toISOString() }]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/top-users', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.reputation, 
       COUNT(DISTINCT d.id) as deal_count, 
       COUNT(DISTINCT c.id) as comment_count
       FROM users u 
       LEFT JOIN deals d ON u.id = d.created_by 
       LEFT JOIN comments c ON u.id = c.user_id 
       GROUP BY u.id, u.username, u.reputation 
       ORDER BY u.reputation DESC NULLS LAST 
       LIMIT $1`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, role FROM users WHERE role IN (\'admin\', \'superadmin\', \'moderator\') ORDER BY role, username'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Category endpoints
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, emoji, is_active } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { rows } = await pool.query(
      'INSERT INTO categories (name, slug, emoji, is_active, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [name, slug, emoji, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, description, is_active } = req.body;

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }
    if (emoji !== undefined) {
      updateFields.push(`emoji = $${paramCount}`);
      updateValues.push(emoji);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
      paramCount++;
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
      paramCount++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await pool.query(query, updateValues);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Store endpoints
app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stores/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query('SELECT * FROM stores WHERE slug = $1', [slug]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stores', async (req, res) => {
  try {
    const { name, slug, logo_url, website_url, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO stores (name, slug, logo_url, website_url, description, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [name, slug, logo_url, website_url, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, logo_url, website_url, description } = req.body;

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }
    if (slug !== undefined) {
      updateFields.push(`slug = $${paramCount}`);
      updateValues.push(slug);
      paramCount++;
    }
    if (logo_url !== undefined) {
      updateFields.push(`logo_url = $${paramCount}`);
      updateValues.push(logo_url);
      paramCount++;
    }
    if (website_url !== undefined) {
      updateFields.push(`website_url = $${paramCount}`);
      updateValues.push(website_url);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
      paramCount++;
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const query = `UPDATE stores SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await pool.query(query, updateValues);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM stores WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Banner endpoints
app.post('/api/banners', requireAuth, async (req, res) => {
  try {
    const { title, description, image_url, is_active, priority } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO banners (title, description, image_url, is_active, priority, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [title, description, image_url, is_active !== false, priority || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/banners/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'id') {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(updates[key]);
        paramCount++;
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);
    
    const query = `UPDATE banners SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const { rows } = await pool.query(query, updateValues);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('DELETE FROM banners WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Push notification endpoint
app.post('/api/push/send', async (req, res) => {
  try {
    const { user_id, title, body, data } = req.body;
    // Mock implementation - in production, integrate with push service
    res.json({ success: true, message: 'Push notification sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gamification endpoints
app.get('/api/gamification/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Mock gamification stats
    const stats = {
      user_id: userId,
      total_points: 150,
      deals_posted: 5,
      deals_saved: 12,
      comments_made: 8,
      upvotes_received: 25,
      login_streak: 3,
      level: 2,
      badges: []
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gamification/award-points', async (req, res) => {
  try {
    const { userId, points, action } = req.body;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gamification/award-badge', async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gamification/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    // Mock leaderboard data
    const leaderboard = Array.from({ length: parseInt(limit) }, (_, i) => ({
      user_id: `user_${i + 1}`,
      username: `User${i + 1}`,
      total_points: 1000 - (i * 50),
      level: Math.floor((1000 - (i * 50)) / 100) + 1,
      rank: i + 1
    }));
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Collection endpoints
app.get('/api/collections', async (req, res) => {
  try {
    const { userId } = req.query;
    const { rows } = await pool.query(
      'SELECT * FROM collections WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/collections', async (req, res) => {
  try {
    const { name, description, userId, isPublic } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO collections (name, description, user_id, is_public, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [name, description, userId, isPublic || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collections/:id/deals', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT cd.*, d.title, d.description, d.price, d.image_url 
       FROM collection_deals cd 
       JOIN deals d ON cd.deal_id = d.id 
       WHERE cd.collection_id = $1 
       ORDER BY cd.added_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/collections/:id/deals', async (req, res) => {
  try {
    const { id } = req.params;
    const { dealId } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO collection_deals (collection_id, deal_id, added_at) VALUES ($1, $2, NOW()) RETURNING *',
      [id, dealId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/collections/:id/deals/:dealId', async (req, res) => {
  try {
    const { id, dealId } = req.params;
    const { rows } = await pool.query(
      'DELETE FROM collection_deals WHERE collection_id = $1 AND deal_id = $2 RETURNING *',
      [id, dealId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found in collection' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    const { rows } = await pool.query(
      'DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found or unauthorized' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Debug endpoint to check users
app.get('/api/debug/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset admin password endpoint (for testing)
app.post('/api/debug/reset-admin-password', async (req, res) => {
  try {
    const { password = 'admin123' } = req.body;
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    const { rows } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE role = $2 RETURNING id, username, email, role',
      [password_hash, 'admin']
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No admin user found' });
    }
    
    res.json({ message: 'Admin password reset successfully', user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user endpoint
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Generate UUID for the user
    const userId = require('crypto').randomUUID();
    
    const { rows } = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, username, email, role',
      [userId, username, email, password_hash, role]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// ENHANCED CHAT API ENDPOINTS
// ================================

// Get all channels (global + user's private channels)
app.get('/api/chat/channels', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const { rows } = await pool.query(`
      SELECT c.id,
             c.name,
             c.description,
             c.type,
             c.is_global,
             c.created_by,
             c.created_at,
             c.updated_at,
             c.is_active,
             CASE 
               WHEN c.type = 'private' THEN 
                 (SELECT u.username FROM users u WHERE u.id = 
                   (SELECT cm2.user_id FROM channel_members cm2 
                    WHERE cm2.channel_id = c.id AND cm2.user_id != $1 LIMIT 1))
               ELSE c.name 
             END as display_name,
             CASE 
               WHEN c.type = 'private' THEN 
                 (SELECT u.avatar_url FROM users u WHERE u.id = 
                   (SELECT cm2.user_id FROM channel_members cm2 
                    WHERE cm2.channel_id = c.id AND cm2.user_id != $1 LIMIT 1))
               ELSE NULL 
             END as avatar_url,
             cm.role as user_role,
             m.content as last_message,
             COALESCE(m.created_at, c.created_at) as last_message_time,
             sender.username as last_sender,
             CASE WHEN c.type = 'global' THEN 0 ELSE 1 END as sort_order
      FROM chat_channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      LEFT JOIN messages m ON c.id = m.channel_id AND m.id = (
        SELECT id FROM messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN users sender ON m.sender_id = sender.id
      WHERE c.type = 'global' 
         OR (c.type IN ('group', 'private') AND cm.user_id = $1)
      ORDER BY 
        sort_order,
        last_message_time DESC NULLS LAST
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a channel
app.get('/api/chat/channels/:channelId/messages', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.session.userId;
    
    // Check if user has access to this channel
    const accessCheck = await pool.query(`
      SELECT 1 FROM chat_channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      WHERE c.id = $2 AND (c.type = 'global' OR cm.user_id = $1)
    `, [userId, channelId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
    
    const { rows } = await pool.query(`
      SELECT m.*, u.username, u.avatar_url, u.role,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'id', mr.id,
                 'emoji', mr.reaction,
                 'user_id', mr.user_id,
                 'username', ru.username
               )) FROM message_reactions mr 
               LEFT JOIN users ru ON mr.user_id = ru.id 
               WHERE mr.message_id = m.id),
               '[]'::json
             ) as reactions
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.channel_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [channelId, parseInt(limit), parseInt(offset)]);
    
    res.json(rows.reverse()); // Reverse to show oldest first
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send a message
app.post('/api/chat/channels/:channelId/messages', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, mentioned_users = [] } = req.body;
    const userId = req.session.userId;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if user has access to this channel
    const accessCheck = await pool.query(`
      SELECT 1 FROM chat_channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      WHERE c.id = $2 AND (c.type = 'global' OR cm.user_id = $1)
    `, [userId, channelId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
    
    const { rows } = await pool.query(`
      INSERT INTO messages (channel_id, sender_id, content, mentioned_users, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [channelId, userId, content.trim(), mentioned_users]);
    
    // Get sender info
    const messageWithUser = await pool.query(`
      SELECT m.*, u.username, u.avatar_url, u.role
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.id = $1
    `, [rows[0].id]);
    
    res.status(201).json(messageWithUser.rows[0]);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or get private chat channel
app.post('/api/chat/private', requireAuth, async (req, res) => {
  try {
    const { other_user_id } = req.body;
    const userId = req.session.userId;
    
    if (!other_user_id || other_user_id === userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if users are blocked
    const blockCheck = await pool.query(`
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = $1 AND blocked_id = $2) 
         OR (blocker_id = $2 AND blocked_id = $1)
    `, [userId, other_user_id]);
    
    if (blockCheck.rows.length > 0) {
      return res.status(403).json({ error: 'Cannot chat with blocked user' });
    }
    
    // Check if private channel already exists
    const existingChannel = await pool.query(`
      SELECT c.* FROM chat_channels c
      WHERE c.type = 'private'
        AND c.id IN (
          SELECT cm1.channel_id FROM channel_members cm1
          WHERE cm1.user_id = $1
          INTERSECT
          SELECT cm2.channel_id FROM channel_members cm2
          WHERE cm2.user_id = $2
        )
        AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
    `, [userId, other_user_id]);
    
    if (existingChannel.rows.length > 0) {
      return res.json(existingChannel.rows[0]);
    }
    
    // Create new private channel
    const { rows: channelRows } = await pool.query(`
      INSERT INTO chat_channels (name, type, created_by, created_at)
      VALUES ('Private Chat', 'private', $1, NOW())
      RETURNING *
    `, [userId]);
    
    const channelId = channelRows[0].id;
    
    // Add both users as members
    await pool.query(`
      INSERT INTO channel_members (channel_id, user_id, role, joined_at)
      VALUES 
        ($1, $2, 'member', NOW()),
        ($1, $3, 'member', NOW())
    `, [channelId, userId, other_user_id]);
    
    res.status(201).json(channelRows[0]);
  } catch (err) {
    console.error('Error creating private chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send chat request (ping system)
app.post('/api/chat/requests', requireAuth, async (req, res) => {
  try {
    const { recipient_id, message } = req.body;
    const userId = req.session.userId;
    
    if (!recipient_id || recipient_id === userId) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }
    
    // Check if users are blocked
    const blockCheck = await pool.query(`
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = $1 AND blocked_id = $2) 
         OR (blocker_id = $2 AND blocked_id = $1)
    `, [userId, recipient_id]);
    
    if (blockCheck.rows.length > 0) {
      return res.status(403).json({ error: 'Cannot send request to blocked user' });
    }
    
    // Check for existing pending request
    const existingRequest = await pool.query(`
      SELECT 1 FROM chat_requests 
      WHERE sender_id = $1 AND recipient_id = $2 AND status = 'pending'
    `, [userId, recipient_id]);
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    
    const { rows } = await pool.query(`
      INSERT INTO chat_requests (sender_id, recipient_id, message, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING *
    `, [userId, recipient_id, message || '']);
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error sending chat request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get chat requests (sent and received)
app.get('/api/chat/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type = 'received' } = req.query;
    
    let query;
    if (type === 'sent') {
      query = `
        SELECT cr.*, u.username as recipient_username, u.avatar_url as recipient_avatar
        FROM chat_requests cr
        LEFT JOIN users u ON cr.recipient_id = u.id
        WHERE cr.sender_id = $1
        ORDER BY cr.created_at DESC
      `;
    } else {
      query = `
        SELECT cr.*, u.username as sender_username, u.avatar_url as sender_avatar
        FROM chat_requests cr
        LEFT JOIN users u ON cr.sender_id = u.id
        WHERE cr.recipient_id = $1
        ORDER BY cr.created_at DESC
      `;
    }
    
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching chat requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Respond to chat request
app.put('/api/chat/requests/:requestId', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept', 'reject', 'ignore'
    const userId = req.session.userId;
    
    if (!['accept', 'reject', 'ignore'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Verify this is the recipient of the request
    const { rows: requestRows } = await pool.query(`
      SELECT * FROM chat_requests WHERE id = $1 AND recipient_id = $2
    `, [requestId, userId]);
    
    if (requestRows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const request = requestRows[0];
    
    // Update request status
    await pool.query(`
      UPDATE chat_requests SET status = $1, responded_at = NOW()
      WHERE id = $2
    `, [action === 'accept' ? 'accepted' : action, requestId]);
    
    // If accepted, create private channel
    if (action === 'accept') {
      // Check if private channel already exists
      const existingChannel = await pool.query(`
        SELECT c.* FROM chat_channels c
        WHERE c.type = 'private'
          AND c.id IN (
            SELECT cm1.channel_id FROM channel_members cm1
            WHERE cm1.user_id = $1
            INTERSECT
            SELECT cm2.channel_id FROM channel_members cm2
            WHERE cm2.user_id = $2
          )
          AND (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) = 2
      `, [userId, request.sender_id]);
      
      if (existingChannel.rows.length === 0) {
        // Create new private channel
        const { rows: channelRows } = await pool.query(`
          INSERT INTO chat_channels (name, type, created_by, created_at)
          VALUES ('Private Chat', 'private', $1, NOW())
          RETURNING *
        `, [userId]);
        
        const channelId = channelRows[0].id;
        
        // Add both users as members
        await pool.query(`
          INSERT INTO channel_members (channel_id, user_id, role, joined_at)
          VALUES 
            ($1, $2, 'member', NOW()),
            ($1, $3, 'member', NOW())
        `, [channelId, userId, request.sender_id]);
      }
    }
    
    res.json({ success: true, action });
  } catch (err) {
    console.error('Error responding to chat request:', err);
    res.status(500).json({ error: err.message });
  }
});

// Block user
app.post('/api/chat/block', requireAuth, async (req, res) => {
  try {
    const { user_id } = req.body;
    const userId = req.session.userId;
    
    if (!user_id || user_id === userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    await pool.query(`
      INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `, [userId, user_id]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unblock user
app.delete('/api/chat/block/:userId', requireAuth, async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    const userId = req.session.userId;
    
    await pool.query(`
      DELETE FROM user_blocks 
      WHERE blocker_id = $1 AND blocked_id = $2
    `, [userId, blockedUserId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get blocked users
app.get('/api/chat/blocked', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const { rows } = await pool.query(`
      SELECT ub.*, u.username, u.avatar_url
      FROM user_blocks ub
      LEFT JOIN users u ON ub.blocked_id = u.id
      WHERE ub.blocker_id = $1
      ORDER BY ub.created_at DESC
    `, [userId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching blocked users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get/Update chat preferences
app.get('/api/chat/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    let { rows } = await pool.query(`
      SELECT * FROM user_chat_preferences WHERE user_id = $1
    `, [userId]);
    
    if (rows.length === 0) {
      // Create default preferences
      const { rows: newRows } = await pool.query(`
        INSERT INTO user_chat_preferences (
          user_id, allow_private_messages, allow_group_invites, 
          show_online_status, message_notifications, created_at
        )
        VALUES ($1, true, true, true, true, NOW())
        RETURNING *
      `, [userId]);
      rows = newRows;
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching chat preferences:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chat/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { 
      allow_private_messages, 
      allow_group_invites, 
      show_online_status, 
      message_notifications 
    } = req.body;
    
    const { rows } = await pool.query(`
      INSERT INTO user_chat_preferences (
        user_id, allow_private_messages, allow_group_invites, 
        show_online_status, message_notifications, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        allow_private_messages = EXCLUDED.allow_private_messages,
        allow_group_invites = EXCLUDED.allow_group_invites,
        show_online_status = EXCLUDED.show_online_status,
        message_notifications = EXCLUDED.message_notifications,
        updated_at = NOW()
      RETURNING *
    `, [userId, allow_private_messages, allow_group_invites, show_online_status, message_notifications]);
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating chat preferences:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add reaction to message
app.post('/api/chat/messages/:messageId/reactions', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.session.userId;
    
    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }
    
    await pool.query(`
      INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
    `, [messageId, userId, emoji]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding reaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove reaction from message
app.delete('/api/chat/messages/:messageId/reactions', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.query;
    const userId = req.session.userId;
    
    await pool.query(`
      DELETE FROM message_reactions 
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    `, [messageId, userId, emoji]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing reaction:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create group chat
app.post('/api/chat/groups', requireAuth, async (req, res) => {
  try {
    const { name, description, member_ids = [] } = req.body;
    const userId = req.session.userId;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // Create group channel
    const { rows: channelRows } = await pool.query(`
      INSERT INTO chat_channels (name, description, type, created_by, created_at)
      VALUES ($1, $2, 'group', $3, NOW())
      RETURNING *
    `, [name.trim(), description || '', userId]);
    
    const channelId = channelRows[0].id;
    
    // Add creator as admin
    await pool.query(`
      INSERT INTO channel_members (channel_id, user_id, role, joined_at)
      VALUES ($1, $2, 'admin', NOW())
    `, [channelId, userId]);
    
    // Add other members
    if (member_ids.length > 0) {
      const memberValues = member_ids.map(memberId => `('${channelId}', '${memberId}', 'member', NOW())`).join(', ');
      await pool.query(`
        INSERT INTO channel_members (channel_id, user_id, role, joined_at)
        VALUES ${memberValues}
      `);
    }
    
    res.status(201).json(channelRows[0]);
  } catch (err) {
    console.error('Error creating group chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Join group chat
app.post('/api/chat/groups/:channelId/join', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.session.userId;
    
    // Check if channel exists and is a group
    const { rows: channelRows } = await pool.query(`
      SELECT * FROM chat_channels WHERE id = $1 AND type = 'group'
    `, [channelId]);
    
    if (channelRows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Add user as member
    await pool.query(`
      INSERT INTO channel_members (channel_id, user_id, role, joined_at)
      VALUES ($1, $2, 'member', NOW())
      ON CONFLICT (channel_id, user_id) DO NOTHING
    `, [channelId, userId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error joining group chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Leave group chat
app.delete('/api/chat/groups/:channelId/leave', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.session.userId;
    
    await pool.query(`
      DELETE FROM channel_members 
      WHERE channel_id = $1 AND user_id = $2
    `, [channelId, userId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error leaving group chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get channel members
app.get('/api/chat/channels/:channelId/members', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.session.userId;
    
    // Check if user has access to this channel
    const accessCheck = await pool.query(`
      SELECT 1 FROM chat_channels c
      LEFT JOIN channel_members cm ON c.id = cm.channel_id AND cm.user_id = $1
      WHERE c.id = $2 AND (c.type = 'global' OR cm.user_id = $1)
    `, [userId, channelId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
    
    const { rows } = await pool.query(`
      SELECT cm.*, u.username, u.avatar_url, u.status
      FROM channel_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.channel_id = $1
      ORDER BY cm.role DESC, u.username ASC
    `, [channelId]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching channel members:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint
app.get('/api/test-chat-debug', (req, res) => {
  res.json({ message: 'Chat debug endpoint working', timestamp: new Date().toISOString() });
});

// Debug endpoint to inspect CSP/CORS and early-access codes
app.get('/_debug/security', (req, res) => {
  const key = req.query.key;
  if (process.env.NODE_ENV === 'production' && process.env.DEBUG_KEY && process.env.DEBUG_KEY !== key) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://www.saversdream.com', 'https://saversdream.com'];
  const cspConnect = process.env.CSP_CONNECT_SRC ? process.env.CSP_CONNECT_SRC.split(',') : [];
  const codes = loadEarlyCodes ? loadEarlyCodes() : [];

  res.json({
    env: process.env.NODE_ENV || 'development',
    allowedOrigins,
    cspConnect,
    earlyAccessCount: codes.length,
    earlyAccessSample: codes.slice(0, 5)
  });
});

// Handle access code submission
app.post('/grant-early', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.length < 4) {
      return res.redirect('/?error=invalid_code');
    }

    // Local file-based check for early access codes
    const accessCode = findValidEarlyCode(code);

    if (!accessCode) {
      return res.redirect('/?error=invalid_code');
    }

    // Increment usage count in local file
    incrementEarlyCodeUse(accessCode);

    // Set cookie for 30 days
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.saversdream.com' : undefined;

    res.cookie('sd_early', '1', {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      domain: domain
    });

    // Redirect to main app
    res.redirect('/');
  } catch (err) {
    console.error('Error granting early access:', err && err.stack ? err.stack : err);
    // Protected debug output: if DEBUG_KEY is set, allow returning stack when provided via ?key or header
    try {
      const debugKey = process.env.DEBUG_KEY;
      const providedKey = (req.query && req.query.key) || req.get && req.get('X-Debug-Key');
      if (debugKey && providedKey && String(providedKey) === String(debugKey)) {
        res.status(500).type('text').send((err && err.stack) ? err.stack : String(err));
        return;
      }
    } catch (e) {
      console.error('Error evaluating debug key for /grant-early:', e);
    }

    res.redirect('/?error=server_error');
  }
});

// Handle access request submission
app.post('/request-access', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.redirect('/?error=missing_fields');
    }
    
    // Check if email already requested
    const { rows: existing } = await pool.query(`
      SELECT id FROM early_access_requests 
      WHERE email = $1 AND status = 'pending'
    `, [email]);
    
    if (existing.length > 0) {
      return res.redirect('/?error=already_requested');
    }
    
    // Store the request in database
    await pool.query(`
      INSERT INTO early_access_requests (name, email, created_at) 
      VALUES ($1, $2, NOW())
    `, [name, email]);
    
    res.redirect('/?success=request_submitted');
  } catch (err) {
    console.error('Error processing access request:', err);
    res.redirect('/?error=server_error');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
