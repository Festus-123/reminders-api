import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" })); 
// deliberately unversioned — health checks are infrastructure, not API surface

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/reminders", reminderRoutes);
app.use(errorHandlerMiddleware);


export default app;
