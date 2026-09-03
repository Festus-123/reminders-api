// src/services/reminderService.js

import { ReminderModel } from "../models/reminderModels.js";
import { CustomError } from "../utils/CustomError.js";
import ERROR_MESSAGES from "../constants/errorMessages.js";


export const ReminderService = {
  async getAllReminders(userId, filters) {
    // Fetch All Reminders
    return ReminderModel.getAll(userId, filters);
  },

  async getReminderById(reminderId, userId) {
    const reminder = await ReminderModel.findById(reminderId, userId);
    if (!reminder) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if(reminder.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403)
    return reminder;
  },

  async createReminder(newReminder) {
    const { title, notes, dueDate, userId } = newReminder;
    const sanitized = {
      title: title?.trim(),
      notes: notes?.trim(),
      dueDate: dueDate,
      userId: userId,
    };
    return ReminderModel.create(sanitized);
  },

  async updateReminder(reminderId, newValues, userId) {
    const reminder = await ReminderModel.findById(reminderId, userId);
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403)
    const updated = await ReminderModel.update(reminderId, newValues);
    if (!updated) throw new Error("Reminder not found");
    return updated;
  },

  async deleteReminder(reminderId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.user_id !== userId) {
      const error = new Error("You are not authorized to delete this reminder");
      error.statusCode = 403;
      throw error;
    }
    const rowsDeleted = await ReminderModel.delete(reminderId);
    if (rowsDeleted === 0) throw new Error("Reminder not found");
    return { message: "Reminder deleted successfully" };
  },
};
