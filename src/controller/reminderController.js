// src/controllers/reminderController.js
import { ReminderService } from "../services/reminderServices.js";

export const ReminderController = {
  async getAllReminders(req, res) {
    try {
      const { completed, overdue, sort, limit, offset } = req.query;
      const userId = req.user.id || 1; // Replace with actual auth later
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
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async getReminderById(req, res, next) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const userId = req.user?.id || 1; // Replace with actual auth later
      const reminder = await ReminderService.getReminderById(
        reminderId,
        userId,
      );
      res.status(200).json(reminder);
    } catch (error) {
      next(error);
    }
  },

  async createReminder(req, res) {
    try {
      const userId = req.user.id || 1; // Replace with actual auth later
      const newReminder = await ReminderService.createReminder({
        ...req.body,
        userId: userId,
      });
      res.status(201).json(newReminder);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async updateReminder(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const userId = req.user?.id || 1; // Replace with actual auth later
      const updated = await ReminderService.updateReminder(reminderId, req.body, userId);
      res.status(200).json(updated);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async deleteReminder(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const result = await ReminderService.deleteReminder(reminderId);
      res.status(200).json(result);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },
};
