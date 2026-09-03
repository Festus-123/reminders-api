// src/controllers/reminderController.js
import { ReminderService } from "../services/reminderServices.js";

export const ReminderController = {
  async getAllReminders(req, res, next) {
    try {
      const { completed, overdue, sort, limit, offset } = req.query;
      const userId = req.user.id;
      const filters = {
        completed: completed === undefined ? undefined : completed === "true",
        overdue: overdue === "true",
        sort,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      };
      const reminders = await ReminderService.getAllReminders(userId, filters);
      res.status(200).json(reminders);
    } catch (error) {
      next(error);
    }
  },

  async getReminderById(req, res, next) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const reminder = await ReminderService.getReminderById(reminderId, userId);
      res.status(200).json(reminder);
    } catch (error) {
      next(error);
    }
  },

  async createReminder(req, res, next) {
    try {
      const userId = req.user.id;
      const newReminder = await ReminderService.createReminder({
        ...req.body,
        userId,
      });
      res.status(201).json(newReminder);
    } catch (error) {
      next(error);
    }
  },

  async updateReminder(req, res, next) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const updated = await ReminderService.updateReminder(reminderId, req.body, userId);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  },

  async deleteReminder(req, res, next) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const result = await ReminderService.deleteReminder(reminderId, userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};

export default ReminderController;
