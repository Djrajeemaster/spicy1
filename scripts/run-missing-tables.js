require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createMissingTables() {
  try {
    console.log('Creating missing database tables...');
    
    const sqlPath = path.join(__dirname, 'create-missing-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Missing tables created successfully');
    
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createMissingTables();
}

module.exports = { createMissingTables };