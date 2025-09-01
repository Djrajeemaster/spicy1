const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'spicymug',
  password: 'Yuvansai@143',
  port: 5432,
});

const { v4: uuidv4 } = require('uuid');

const users = [
  { id: uuidv4(), username: 'generaluser', email: 'user@example.com', role: 'user', reputation: 1.0 },
  { id: uuidv4(), username: 'verifiedbiz', email: 'business@example.com', role: 'business', reputation: 5.0 },
  { id: uuidv4(), username: 'moderator', email: 'moderator@example.com', role: 'moderator', reputation: 5.0 },
  { id: uuidv4(), username: 'admin', email: 'admin@example.com', role: 'admin', reputation: 5.0 },
  { id: uuidv4(), username: 'superadmin', email: 'superadmin@example.com', role: 'superadmin', reputation: 5.0 }
];

async function createUsers() {
  const client = await pool.connect();
  try {
    for (const user of users) {
      try {
        await client.query(
          'INSERT INTO users (id, username, email, role, reputation, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [user.id, user.username, user.email, user.role, user.reputation, 'active']
        );
        console.log(`✅ Created ${user.role}: ${user.username}`);
      } catch (err) {
        if (err.code === '23505') {
          console.log(`⚠️  User ${user.username} already exists`);
        } else {
          console.error(`❌ Error creating ${user.username}:`, err.message);
        }
      }
    }
  } finally {
    client.release();
    pool.end();
  }
}

createUsers();