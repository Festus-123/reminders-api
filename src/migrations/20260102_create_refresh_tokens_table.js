// src/migrations/20260102_create_refresh_tokens_table.js
import db from '../config/db.js';

export async function up() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('refresh_tokens table created successfully');
  } catch (error) {
    console.error('Error creating refresh_tokens table:', error);
  }
}

export async function down() {
  try {
    await db.query('DROP TABLE IF EXISTS refresh_tokens');
  } catch (error) {
    console.error('Error dropping refresh_tokens table:', error);
  }
}

up().then(() => db.end());
