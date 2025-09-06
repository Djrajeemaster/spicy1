const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  try {
    // Check audit_log table structure
    const auditResult = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'audit_log\'');
    console.log('Audit log table structure:');
    auditResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });

    console.log('\n---\n');

    // Check if system user exists
    const systemUser = await pool.query('SELECT id, username FROM users WHERE id = \'00000000-0000-0000-0000-000000000000\'');
    console.log('System user exists:', systemUser.rows.length > 0);

    if (systemUser.rows.length === 0) {
      console.log('Creating system user...');
      await pool.query('INSERT INTO users (id, username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5, $6)', [
        '00000000-0000-0000-0000-000000000000',
        'system',
        'system@local',
        'system',
        'admin',
        'active'
      ]);
      console.log('System user created');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
