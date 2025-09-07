require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Store uploads temporarily then move into assets
const upload = multer({ dest: path.join(__dirname, 'tmp_uploads') });

// Simple early-access import (optional)
try {
  require('./early-access')(app);
} catch (e) {
  console.log('Early access module not found, skipping...');
}

// Configuration
const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Always return JSON on errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:3000',
      'https://saversdream.com',
      'https://www.saversdream.com'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

// Basic middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  // Add your JWT verification logic here
  next();
};

const requireSuperAdmin = (req, res, next) => {
  // Add your super admin check logic here
  next();
};

// ================================
// AUTHENTICATION ENDPOINTS
// ================================

// Auth status
app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: false, user: null });
});

// ================================
// BANNERS ENDPOINTS
// ================================

// Get active banners (FIXED with expires_at)
app.get('/api/banners', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM banners
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching banners:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// SETTINGS ENDPOINTS
// ================================

// Get all system settings
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM system_settings ORDER BY key');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific setting by key
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE key = $1', [key]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new setting
app.post('/api/settings', requireSuperAdmin, async (req, res) => {
  try {
    const { key, value, description } = req.body;

    const { rows } = await pool.query(
      'INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3) RETURNING *',
      [key, value, description || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a setting by key
app.put('/api/settings/:key', requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const { rows } = await pool.query(
      'UPDATE system_settings SET value = $1, description = $2, updated_at = NOW() WHERE key = $3 RETURNING *',
      [value, description || null, key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a setting by key
app.delete('/api/settings/:key', requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { rows } = await pool.query('DELETE FROM system_settings WHERE key = $1 RETURNING *', [key]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ message: 'Setting deleted successfully' });
  } catch (err) {
    console.error('Error deleting setting:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// SITE SETTINGS ENDPOINTS
// ================================

// Get site settings
app.get('/api/site/settings', (req, res) => {
  const siteSettings = {
    siteName: 'Savers Dream',
    siteDescription: 'Your ultimate deal finder',
    logoUrl: 'https://saversdream.com/assets/site-logo.png',
    logoFilename: '/assets/site-logo.png'
  };

  // Normalize logo URLs
  for (const k of Object.keys(siteSettings)) {
    if (typeof siteSettings[k] === 'string' && /logo/i.test(k)) {
      let v = siteSettings[k];
      if (!/^https?:\/\//i.test(v)) {
        if (!v.startsWith('/')) v = '/' + v;
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        v = `${proto}://${host}${v}`;
      }
      siteSettings[k] = v;
    }
  }

  res.json(siteSettings);
});

// Update site settings
app.put('/api/site/settings', requireSuperAdmin, (req, res) => {
  // Simple implementation - in production you'd save to database
  res.json({ message: 'Site settings updated (simplified version)' });
});

// ================================
// BASIC DEAL ENDPOINTS
// ================================

// Get deals
app.get('/api/deals', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.*, u.username as created_by_name
      FROM deals d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.status = 'active'
      ORDER BY d.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// BASIC USER ENDPOINTS
// ================================

// Get users (admin only)
app.get('/api/users', requireSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, username, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// HEALTH CHECK
// ================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================================
// SERVE INDEX.HTML FOR SPA
// ================================

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Savers Dream</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>Savers Dream API</h1>
        <p>API is running successfully!</p>
        <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
      </html>
    `);
  }
});

// ================================
// START SERVER
// ================================

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origins: Configured for multiple origins`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  pool.end(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

module.exports = app;
