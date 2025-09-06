const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkCompetitorDeals() {
  try {
    // Check competitor deals
    const competitorDeals = await pool.query('SELECT COUNT(*) as count FROM deals WHERE created_by = \'00000000-0000-0000-0000-000000000000\'');
    console.log('Competitor deals count:', competitorDeals.rows[0].count);

    // Check for any deals with invalid foreign keys
    const invalidDeals = await pool.query('SELECT id, title FROM deals WHERE category_id NOT IN (SELECT id FROM categories) OR store_id NOT IN (SELECT id FROM stores)');
    console.log('Deals with invalid foreign keys:', invalidDeals.rows.length);

    if (invalidDeals.rows.length > 0) {
      console.log('Invalid deals:');
      invalidDeals.rows.forEach(deal => {
        console.log(`ID: ${deal.id}, Title: ${deal.title?.substring(0, 30)}...`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCompetitorDeals();
