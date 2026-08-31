// src/models/userModel.js
import db from '../config/db.js';

export const UserModel = {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async create({ email, passwordHash }) {
    const result = await db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
      [email, passwordHash]
    );
    return result.rows[0];
  },
};