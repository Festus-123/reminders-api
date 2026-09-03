// src/models/reminderModels.js
import db from "../config/db.js";

export function formatReminder(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    notes: row.notes !== undefined ? row.notes : null,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    completed: Boolean(row.completed),
    userId: row.user_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export const ReminderModel = {
  async getAll(
    userId,
    { completed, overdue, sort, limit = 20, offset = 0 } = {},
  ) {
    const conditions = ["user_id = $1"];
    const values = [userId];

    if (completed !== undefined) {
      values.push(completed);
      conditions.push(`completed = $${values.length}`);
    }

    if (overdue) {
      conditions.push("due_date < NOW() AND completed = FALSE");
    }

    const orderBy = sort === "createdAt" ? "created_at ASC" : "created_at DESC";

    values.push(limit, offset);
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT * FROM reminders
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const result = await db.query(query, values);
    return result.rows.map(formatReminder);
  },

  async findById(id) {
    const result = await db.query("SELECT * FROM reminders WHERE id = $1", [id]);
    return result.rows[0];
  },

  async create({ title, notes, dueDate, userId }) {
    const result = await db.query(
      `INSERT INTO reminders (title, notes, due_date, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, notes, dueDate, userId],
    );
    return formatReminder(result.rows[0]);
  },

  async update(id, newValues) {
    const fieldMapping = {
      title: "title",
      notes: "notes",
      dueDate: "due_date",
      due_date: "due_date",
      completed: "completed",
    };

    const setClauses = [];
    const values = [];

    for (const [key, val] of Object.entries(newValues)) {
      const dbColumn = fieldMapping[key];
      if (dbColumn !== undefined) {
        values.push(val);
        setClauses.push(`${dbColumn} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      const existing = await ReminderModel.findById(id);
      return formatReminder(existing);
    }

    values.push(id);
    const query = `
      UPDATE reminders
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `;
    const result = await db.query(query, values);
    return formatReminder(result.rows[0]);
  },

  async delete(id) {
    const result = await db.query("DELETE FROM reminders WHERE id = $1", [id]);
    return result.rowCount;
  },
};

export default ReminderModel;
