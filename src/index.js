import express from "express";
import authRoutes from "./routes/authRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/reminders", reminderRoutes);
app.use(errorHandlerMiddleware);

app.listen(PORT, () => console.log("Reminder Api working"));


