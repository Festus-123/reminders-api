import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import reminderRoutes from "./routes/reminderRoutes.js";
import errorHandlerMiddleware from "./middlewares/errorHandlerMiddleware.js";

const app = express();
// const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(helmet()); // sets a batch of sensible security-related HTTP headers

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
});

app.use(limiter);
app.use(pinoHttp());
app.use(morgan('combined'));

app.get("/health", (req, res) => res.status(200).json({ status: "ok" })); 
// deliberately unversioned — health checks are infrastructure, not API surface

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/reminders", reminderRoutes);
app.use(errorHandlerMiddleware);


export default app;
