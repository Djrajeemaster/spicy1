const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');
const app = express();

// Parse JSON bodies
app.use(express.json());

// CORS configuration - allow all localhost origins for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Get all banners
app.get('/api/banners', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM banners ORDER BY priority ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Session endpoint
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const bcrypt = require('bcrypt');

app.get('/api/auth/session', async (req, res) => {
  const sessionId = req.cookies.session_id;
  console.log('Session check - sessionId:', sessionId);
  console.log('All cookies:', req.cookies);
  
  if (!sessionId) {
    console.log('No session ID found');
    return res.json({ user: null, authenticated: false });
  }
  
  try {
    // Look up user by session ID (user ID)
    const { rows } = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [sessionId]
    );
    
    console.log('Session check - user found:', rows.length > 0 ? rows[0] : 'none');
    
    if (rows.length === 0) {
      console.log('User not found for session ID:', sessionId);
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
require('dotenv').config();



const port = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Example endpoint: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users');
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
        deal_url, image_url, category_id, store_id, created_by,
        city, state, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `, [
      dealData.title,
      dealData.description,
      dealData.price,
      dealData.original_price,
      dealData.discount_percentage,
      dealData.deal_url,
      dealData.image_url,
      dealData.category_id,
      dealData.store_id,
      dealData.created_by,
      dealData.city,
      dealData.state,
      dealData.status || 'pending'
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
    
    console.log('Vote request:', { dealId: id, userId, voteType });
    
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
    
    console.log('Vote successful');
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

// Signin endpoint
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    
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
    res.cookie('session_id', user.id, { 
      httpOnly: true, 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    });
    
    // Return user data (without password) and include session info
    const { password_hash, ...userData } = user;
    console.log('Signin successful - returning user:', userData);
    console.log('Setting cookie for user ID:', user.id);
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
    res.clearCookie('session_id', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
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

    if (adminCheck.length === 0 || !['admin', 'super_admin'].includes(adminCheck[0].role)) {
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
app.post('/api/admin/admin-ban-user', async (req, res) => {
  try {
    const { user_id, reason, duration_days } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['banned', user_id]);
    res.json({ success: true, message: 'User banned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-unban-user', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user_id]);
    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-suspend-user', async (req, res) => {
  try {
    const { user_id, reason, duration_days } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['suspended', user_id]);
    res.json({ success: true, message: 'User suspended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-unsuspend-user', async (req, res) => {
  try {
    const { user_id, reason } = req.body;
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['active', user_id]);
    res.json({ success: true, message: 'User unsuspended successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-change-role', async (req, res) => {
  try {
    const { user_id, new_role, reason } = req.body;
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [new_role, user_id]);
    res.json({ success: true, message: 'User role changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/admin-delete-user', async (req, res) => {
  try {
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

app.post('/api/admin/admin-bulk-user-action', async (req, res) => {
  try {
    const { user_ids, action, reason, duration } = req.body;
    // Simplified bulk action implementation
    for (const userId of user_ids) {
      if (action === 'ban') {
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['banned', userId]);
      } else if (action === 'suspend') {
        await pool.query('UPDATE users SET status = $1 WHERE id = $2', ['suspended', userId]);
      }
    }
    res.json({ success: true, message: `Bulk ${action} completed successfully` });
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
    const { name, emoji, description, is_active } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO categories (name, emoji, description, is_active, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [name, emoji, description, is_active !== false]
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
    const { rows } = await pool.query(
      'UPDATE categories SET name = $1, emoji = $2, description = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, emoji, description, is_active, id]
    );
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
    const { rows } = await pool.query(
      'UPDATE stores SET name = $1, slug = $2, logo_url = $3, website_url = $4, description = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [name, slug, logo_url, website_url, description, id]
    );
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
app.post('/api/banners', async (req, res) => {
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

app.put('/api/banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, is_active, priority } = req.body;
    const { rows } = await pool.query(
      'UPDATE banners SET title = $1, description = $2, image_url = $3, is_active = $4, priority = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
      [title, description, image_url, is_active, priority, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/banners/:id', async (req, res) => {
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
    console.log(`Push notification to user ${user_id}: ${title} - ${body}`);
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
    console.log(`Awarded ${points} points to user ${userId} for ${action}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gamification/award-badge', async (req, res) => {
  try {
    const { userId, badgeId } = req.body;
    console.log(`Awarded badge ${badgeId} to user ${userId}`);
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
