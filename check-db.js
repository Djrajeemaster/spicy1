const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, username, role FROM users LIMIT 5');
    console.log('Sample users:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id} (${typeof user.id}), Username: ${user.username}, Role: ${user.role}`);
    });

    // Check deals table structure
    const dealsResult = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'deals\' AND column_name IN (\'id\', \'created_by\')');
    console.log('\nDeals table structure:');
    dealsResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });

    // Check recent deals
    const recentDeals = await pool.query('SELECT id, title, created_by, status FROM deals ORDER BY created_at DESC LIMIT 5');
    console.log('\nRecent deals:');
    recentDeals.rows.forEach(deal => {
      console.log(`ID: ${deal.id}, Title: ${deal.title?.substring(0, 30)}..., Created by: ${deal.created_by}, Status: ${deal.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
