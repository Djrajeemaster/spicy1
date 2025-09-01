// This file should only be used in Node.js backend, not in React Native/Expo.
// Remove all usage of this file from your React Native code.

// If you need to access the database, call your backend API endpoints instead.

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

// REMOVE THIS FILE FROM REACT NATIVE IMPORTS!