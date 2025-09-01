const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetAdminPassword() {
  try {
    const password = 'admin123';
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Update admin user password
    const { rows } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE role = $2 RETURNING id, username, email, role',
      [password_hash, 'admin']
    );
    
    if (rows.length === 0) {
      console.log('❌ No admin user found');
      process.exit(1);
    }
    
    console.log('✅ Admin password reset successfully!');
    console.log('👤 Admin user:', rows[0]);
    console.log('📧 Email:', rows[0].email);
    console.log('🔑 Password: admin123');
    
  } catch (err) {
    console.error('❌ Error resetting admin password:', err.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();