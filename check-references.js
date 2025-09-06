const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkReferences() {
  try {
    // Check categories table
    const categoryResult = await pool.query('SELECT id, name FROM categories LIMIT 3');
    console.log('Sample categories:');
    categoryResult.rows.forEach(cat => {
      console.log(`ID: ${cat.id}, Name: ${cat.name}`);
    });
    
    // Check stores table
    const storeResult = await pool.query('SELECT id, name FROM stores LIMIT 3');
    console.log('Sample stores:');
    storeResult.rows.forEach(store => {
      console.log(`ID: ${store.id}, Name: ${store.name}`);
    });    // Check total deals count
    const dealsCount = await pool.query('SELECT COUNT(*) as total FROM deals');
    console.log('Total deals in database:', dealsCount.rows[0].total);

    // Check pending deals count
    const pendingCount = await pool.query('SELECT COUNT(*) as pending FROM deals WHERE status = \'pending\'');
    console.log('Pending deals:', pendingCount.rows[0].pending);

    // Check recent competitor deals
    const competitorDeals = await pool.query('SELECT id, title, created_by, status FROM deals WHERE created_by = \'00000000-0000-0000-0000-000000000000\' ORDER BY created_at DESC LIMIT 3');
    console.log('Recent competitor deals:');
    competitorDeals.rows.forEach(deal => {
      console.log(`ID: ${deal.id}, Title: ${deal.title?.substring(0, 40)}..., Status: ${deal.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkReferences();
