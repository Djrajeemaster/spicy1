require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const https = require('https');
const fs = require('fs');

// Import security middleware
const { createRateLimiter, validateInput, securityHeaders, corsOptions } = require('./middleware/security');
const { authenticateToken, requireRole, generateTokens, verifyRefreshToken } = require('./middleware/auth');
const { logger, requestLogger, errorLogger } = require('./middleware/logger');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);

// Rate limiting
const generalLimiter = createRateLimiter(900000, 100); // 100 requests per 15 minutes
const authLimiter = createRateLimiter(900000, 5); // 5 auth attempts per 15 minutes
const apiLimiter = createRateLimiter(60000, 30); // 30 API calls per minute

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
app.use(generalLimiter);

// Database connection with SSL for production
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
};

if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  } catch (err) {
    logger.error('Health check failed', err);
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// Secure authentication endpoints
app.post('/api/auth/signin', 
  validateInput({
    email: { required: true, email: true, sanitize: true },
    password: { required: true, minLength: 6 }
  }),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const { rows } = await pool.query(
        'SELECT id, username, email, role, password_hash, status FROM users WHERE email = $1',
        [email]
      );
      
      if (rows.length === 0) {
        logger.warn('Failed login attempt', { email, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = rows[0];
      
      if (user.status !== 'active') {
        return res.status(401).json({ error: 'Account is not active' });
      }
      
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        logger.warn('Failed login attempt - wrong password', { email, ip: req.ip });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const { accessToken, refreshToken } = generateTokens(user.id);
      
      // Store refresh token in database
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );
      
      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      const { password_hash, ...userData } = user;
      logger.info('Successful login', { userId: user.id, email });
      
      res.json({
        user: userData,
        accessToken,
        authenticated: true
      });
      
    } catch (err) {
      logger.error('Signin error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if token exists in database and is not expired
    const { rows } = await pool.query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const { accessToken } = generateTokens(decoded.userId);
    
    res.json({ accessToken });
    
  } catch (err) {
    logger.error('Token refresh error', err);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/signout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      // Remove refresh token from database
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    
    res.clearCookie('refreshToken');
    res.json({ message: 'Signed out successfully' });
    
  } catch (err) {
    logger.error('Signout error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected user endpoints
app.get('/api/users', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, role, status, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    logger.error('Error fetching users', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Secure deal endpoints with validation
app.post('/api/deals', 
  authenticateToken,
  validateInput({
    title: { required: true, maxLength: 200, sanitize: true },
    description: { required: true, maxLength: 1000, sanitize: true },
    price: { required: true },
    deal_url: { required: true, sanitize: true }
  }),
  async (req, res) => {
    try {
      const dealData = { ...req.body, created_by: req.user.id };
      
      const { rows } = await pool.query(`
        INSERT INTO deals (
          title, description, price, original_price, discount_percentage,
          deal_url, image_url, category_id, store_id, created_by,
          city, state, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `, [
        dealData.title, dealData.description, dealData.price,
        dealData.original_price, dealData.discount_percentage,
        dealData.deal_url, dealData.image_url, dealData.category_id,
        dealData.store_id, dealData.created_by, dealData.city,
        dealData.state, dealData.status || 'pending'
      ]);
      
      logger.info('Deal created', { dealId: rows[0].id, userId: req.user.id });
      res.json(rows[0]);
      
    } catch (err) {
      logger.error('Error creating deal', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Error handling middleware
app.use(errorLogger);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server with HTTPS in production
if (process.env.NODE_ENV === 'production' && process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
  const options = {
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    key: fs.readFileSync(process.env.SSL_KEY_PATH)
  };
  
  https.createServer(options, app).listen(port, () => {
    logger.info(`Secure server running on port ${port}`);
  });
} else {
  app.listen(port, () => {
    logger.info(`Server running on port ${port} (${process.env.NODE_ENV})`);
  });
}