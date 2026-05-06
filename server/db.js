const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Database error:', err.message);
});

// Test connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Check your DATABASE_URL in .env file');
  } else {
    console.log('✅ Database connected successfully');
  }
});

module.exports = pool;
