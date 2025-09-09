require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add status column to users if not exists
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
      CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
    `);
    
    // Create chat_bans table for moderation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_bans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
        banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    
    // Create indexes for chat_bans
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_bans_user_id ON chat_bans(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_bans_channel_id ON chat_bans(channel_id);
      CREATE INDEX IF NOT EXISTS idx_chat_bans_banned_by ON chat_bans(banned_by);
      CREATE INDEX IF NOT EXISTS idx_chat_bans_is_active ON chat_bans(is_active);
    `);
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };