const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'spicymug',
  password: 'Yuvansai@143',
  port: 5432,
});

async function addPasswordsToUsers() {
  const client = await pool.connect();
  try {
    // Add password column if it doesn't exist
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
    
    // Update users with hashed passwords
    const users = [
      { email: 'user@example.com', password: 'password123' },
      { email: 'business@example.com', password: 'password123' },
      { email: 'moderator@example.com', password: 'password123' },
      { email: 'admin@example.com', password: 'password123' },
      { email: 'superadmin@example.com', password: 'password123' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, user.email]
      );
      console.log(`✅ Added password for ${user.email}`);
    }
  } finally {
    client.release();
    pool.end();
  }
}

addPasswordsToUsers();