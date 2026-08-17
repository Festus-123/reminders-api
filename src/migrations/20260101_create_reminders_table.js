// src/migrations/20260101_create_reminders_table.js
import db from '../config/db.js';

export async function up() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        notes TEXT,
        due_date TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.log(error);
  }
}

export async function down() {
  try {
    await db.query('DROP TABLE IF EXISTS reminders');
  } catch (error) {
    console.log(error);
  }
}

up();