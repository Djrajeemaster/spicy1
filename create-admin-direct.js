const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  try {
    // Add password_hash column if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
      console.log('Added password_hash column');
    } catch (err) {
      console.log('Password_hash column already exists or error:', err.message);
    }

    // Hash password
    const password = 'admin123';
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Generate UUID
    const { randomUUID } = require('crypto');
    const userId = randomUUID();
    
    console.log('Creating admin user with ID:', userId);
    
    // Try to insert directly without foreign key constraint
    const { rows } = await pool.query(`
      INSERT INTO users (id, username, email, password_hash, role, created_at, status) 
      VALUES ($1, $2, $3, $4, $5, NOW(), $6) 
      ON CONFLICT (email) DO UPDATE SET 
      password_hash = EXCLUDED.password_hash, 
      role = EXCLUDED.role, 
      username = EXCLUDED.username
      RETURNING id, username, email, role
    `, [userId, 'admin', 'admin@example.com', password_hash, 'admin', 'active']);
    
    console.log('Admin user created successfully:', rows[0]);
    
  } catch (err) {
    console.error('Error creating admin:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();