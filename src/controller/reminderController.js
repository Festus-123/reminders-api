// src/controllers/reminderController.js
import { ReminderService } from "../services/reminderServices.js";

export const ReminderController = {
  async getAllReminders(req, res) {
    try {
      const { completed, sort, limit, offset } = req.query;
      const filters = {
        completed: completed === undefined ? undefined : completed === "true",
        sort,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      };
      const reminders = await ReminderService.getAllReminders(filters);
      res.status(200).json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async getReminderById(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const reminder = await ReminderService.getReminderById(reminderId);
      res.status(200).json(reminder);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  },

  async createReminder(req, res) {
    try {
      const newReminder = await ReminderService.createReminder(req.body);
      res.status(201).json(newReminder);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  async updateReminder(req, res) {
    try {
      const reminderId = parseInt(req.params.id, 10);
      const updated = await ReminderService.updateReminder(
        reminderId,
        req.body,
      );
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
