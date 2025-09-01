const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createSuperadmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
    if (existingAdmin.rows.length > 0) {
      console.log('❌ Superadmin already exists!');
      process.exit(1);
    }

    // Superadmin credentials
    const username = 'superadmin';
    const email = 'admin@spicymug.com';
    const password = 'admin123'; // Change this to a secure password
    
    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create superadmin user
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, username, email, role',
      [username, email, password_hash, 'admin']
    );
    
    console.log('✅ Superadmin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 User ID:', rows[0].id);
    console.log('\n⚠️  Please change the password after first login!');
    
  } catch (err) {
    console.error('❌ Error creating superadmin:', err.message);
  } finally {
    await pool.end();
  }
}

createSuperadmin();