import { Router } from "express";
import { ReminderController } from "../controller/reminderController.js";
import { authMiddleware } from "../middlewares/authmiddleware.js";
import { createReminderSchema, updateReminderSchema} from "../schemas/reminderSchema.js";
import { validateData } from "../middlewares/validationMiddleware.js";

const router = Router()

router.use(authMiddleware);

router.get("/", ReminderController.getAllReminders)
router.get("/:id", ReminderController.getReminderById)

router.post('/', validateData(createReminderSchema), ReminderController.createReminder);
router.patch('/:id', validateData(updateReminderSchema), ReminderController.updateReminder);
router.delete('/:id', ReminderController.deleteReminder);

export default router;