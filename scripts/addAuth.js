const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'spicymug',
  password: 'Yuvansai@143',
  port: 5432,
});

const users = [
  { email: 'user@example.com', password: 'password123' },
  { email: 'business@example.com', password: 'password123' },
  { email: 'moderator@example.com', password: 'password123' },
  { email: 'admin@example.com', password: 'password123' },
  { email: 'superadmin@example.com', password: 'password123' }
];

async function addAuth() {
  const client = await pool.connect();
  try {
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Get user ID from users table
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (userResult.rows.length === 0) continue;
      
      const userId = userResult.rows[0].id;
      
      // Insert into auth.users (if using Supabase schema locally)
      try {
        await client.query(
          'INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW(), NOW())',
          [userId, user.email, hashedPassword]
        );
        console.log(`✅ Added auth for ${user.email}`);
      } catch (err) {
        console.log(`⚠️  Auth for ${user.email} already exists`);
      }
    }
  } finally {
    client.release();
    pool.end();
  }
}

addAuth();