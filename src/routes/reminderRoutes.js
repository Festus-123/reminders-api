import { Router } from "express";
import { ReminderController } from "../controller/reminderController.js";

const router = Router()

router.get("/", ReminderController.getAllReminders)
router.get("/:id", ReminderController.getReminderById)
router.post('/', ReminderController.createReminder);
router.patch('/:id', ReminderController.updateReminder);
router.delete('/:id', ReminderController.deleteReminder);

export default router;