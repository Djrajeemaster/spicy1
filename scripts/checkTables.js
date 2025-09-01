const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'spicymug',
  password: 'Yuvansai@143',
  port: 5432,
});

async function checkTables() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema='public' 
      AND (table_name LIKE '%auth%' OR table_name LIKE '%user%')
    `);
    console.log('Tables:', result.rows);
    
    // Check users table structure
    const userCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name='users' AND table_schema='public'
    `);
    console.log('Users columns:', userCols.rows);
  } finally {
    client.release();
    pool.end();
  }
}

checkTables();