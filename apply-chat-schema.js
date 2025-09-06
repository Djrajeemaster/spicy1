const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applySchema() {
  try {
    const schema = fs.readFileSync('./database/enhanced_chat_schema.sql', 'utf8');
    
    console.log('📄 Applying enhanced chat schema...');
    await pool.query(schema);
    console.log('✅ Enhanced chat schema applied successfully');
    
    // Test if tables were created
    const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%chat%' 
      OR table_name IN ('user_blocks', 'message_reactions')
      ORDER BY table_name
    `);
    
    console.log('📋 Created chat tables:');
    rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (err) {
    console.error('❌ Error applying schema:', err.message);
    console.error('Full error:', err);
  } finally {
    await pool.end();
  }
}

applySchema();
