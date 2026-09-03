// src/services/reminderServices.js
import { ReminderModel, formatReminder } from "../models/reminderModels.js";
import { CustomError } from "../utils/CustomError.js";
import ERROR_MESSAGES from "../constants/errorMessages.js";

export const ReminderService = {
  async getAllReminders(userId, filters) {
    return ReminderModel.getAll(userId, filters);
  },

  async getReminderById(reminderId, userId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if (reminder.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);
    return formatReminder(reminder);
  },

  async createReminder(newReminder) {
    const { title, notes, dueDate, userId } = newReminder;
    const sanitized = {
      title: title?.trim(),
      notes: notes?.trim() || null,
      dueDate: dueDate || null,
      userId,
    };
    return ReminderModel.create(sanitized);
  },

  async updateReminder(reminderId, newValues, userId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if (reminder.user_id !== userId) throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);

    const sanitized = { ...newValues };
    if (typeof sanitized.title === 'string') {
      sanitized.title = sanitized.title.trim();
    }
    if (sanitized.notes !== undefined && typeof sanitized.notes === 'string') {
      sanitized.notes = sanitized.notes.trim() || null;
    }

    const updated = await ReminderModel.update(reminderId, sanitized);
    return updated;
  },

  async deleteReminder(reminderId, userId) {
    const reminder = await ReminderModel.findById(reminderId);
    if (!reminder) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    if (reminder.user_id !== userId) {
      throw new CustomError(ERROR_MESSAGES.FORBIDDEN, 403);
    }
    const rowsDeleted = await ReminderModel.delete(reminderId);
    if (rowsDeleted === 0) throw new CustomError(ERROR_MESSAGES.REMINDER_NOT_FOUND, 404);
    return { message: "Reminder deleted successfully" };
  },
};

export default ReminderService;
