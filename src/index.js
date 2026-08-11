import express from "express";
import router from "../routes/reminderRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/v1/reminders", router);

app.listen(PORT, () => console.log("Reminder Api working"));


