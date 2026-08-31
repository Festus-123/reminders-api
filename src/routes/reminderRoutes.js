import { Router } from "express";
import { ReminderController } from "../controller/reminderController.js";
import { authMiddleware } from "../middlewares/authmiddleware.js";

const router = Router()

router.use(authMiddleware);

router.get("/", ReminderController.getAllReminders)
router.get("/:id", ReminderController.getReminderById)
router.post('/', ReminderController.createReminder);
router.patch('/:id', ReminderController.updateReminder);
router.delete('/:id', ReminderController.deleteReminder);

export default router;