// src/services/reminderService.js

import { ReminderModel } from "../models/reminderModels.js";

export const ReminderService = {
  async getAllReminders(filters) {
    // Fetch All Reminders
    return ReminderModel.getAll(filters);
  },

 async getReminderById(reminderId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new Error('Reminder not found');
    return reminder;
  },

async createReminder(newReminder) {
    const { title, notes, userId } = newReminder;
    const sanitized = { title: title?.trim(), notes: notes?.trim(), userId };
    return ReminderModel.create(sanitized);
  },

  async updateReminder(reminderId, newValues) {
    const updated = await ReminderModel.update(reminderId, newValues);
    if (!updated) throw new Error('Reminder not found');
    return updated;
  },

 async deleteReminder(reminderId) {
    const rowsDeleted = await ReminderModel.delete(reminderId);
    if (rowsDeleted === 0) throw new Error('Reminder not found');
    return { message: 'Reminder deleted successfully' };
  },
};