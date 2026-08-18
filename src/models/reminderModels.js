// src/models/reminderModel.js
import db from '../config/db.js';

export const ReminderModel = {
  async getAll(userId, { completed, overdue, sort, limit = 20, offset = 0 } = {}) {
    const conditions = ['user_id = $1'];
    const values = [userId];

    if (completed !== undefined) {
      values.push(completed);
      conditions.push(`completed = $${values.length}`);
    }

    if (overdue) {
      // due_date exists on the table since Module 5 — this is its first real use
      conditions.push('due_date < NOW() AND completed = FALSE');
    }

    const orderBy = sort === 'createdAt' ? 'created_at ASC' : 'created_at DESC';

    values.push(limit, offset);
    const query = `
      SELECT * FROM reminders
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await db.query(query, values);
    return result.rows;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM reminders WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create({ title, notes, dueDate, userId }) {
    const result = await db.query(
      `INSERT INTO reminders (title, notes, due_date, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, notes, dueDate, userId]
    );
    return result.rows[0];
  },

  async update(id, newValues) {
    const fields = Object.keys(newValues);
    const setClauses = fields.map((key, index) => `${key} = $${index + 1}`);
    const values = Object.values(newValues);
    values.push(id); // id goes last, for the WHERE clause

    const query = `
      UPDATE reminders
      SET ${setClauses.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await db.query('DELETE FROM reminders WHERE id = $1', [id]);
    return result.rowCount;
  },
};