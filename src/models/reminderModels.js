// src/models/reminderModel.js
let reminders = []; // temporary in-memory "database"
let nextId = 1;

export const ReminderModel = {
  async getAll({ completed, sort, limit, offset } = {}) {
    let result = [...reminders];

    if (completed != undefined) {
      result = result.filter((r) => r.completed === completed);
    }

    if (sort === "-createdAt") {
      result = result.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    } else if (sort === "createdAt") {
      result = result.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
    }

    return result.slice(offset, offset + limit);
  },

  async findById(id) {
    return reminders.find((r) => r.id === id);
  },

  async create({ title, notes, userId }) {
    const reminder = {
      id: nextId++,
      title,
      notes: notes ?? null,
      completed: false,
      userId,
      createdAt: new Date().toISOString(),
    };
    reminders.push(reminder);
    return reminder;
  },

  async update(id, newValues) {
    const reminder = reminders.find((r) => r.id === id);
    if (!reminder) return null;
    Object.assign(reminder, newValues);
    return reminder;
  },

  async delete(id) {
    const lengthBefore = reminders.length;
    reminders = reminders.filter((r) => r.id !== id);
    return lengthBefore - reminders.length; // rows deleted (0 or 1)
  },
};
