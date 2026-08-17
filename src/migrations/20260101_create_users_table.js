// src/migrations/20260101_create_users_table.js
import db from '../config/db.js';

export async function up() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.log(error);
  }
}

export async function down() {
  try {
    await db.query('DROP TABLE IF EXISTS users');
  } catch (error) {
    console.log(error);
  }
}

up();