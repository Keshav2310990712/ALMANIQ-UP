import cors from "cors";
import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import { authMiddleware } from "./middleware/auth.js";
import availabilityRoutes from "./routes/availability.routes.js";
import bookingRoutes from "./routes/bookings.routes.js";
import eventTypeRoutes from "./routes/eventTypes.routes.js";
import slotsRoutes from "./routes/slots.routes.js";
import publicRoutes from "./routes/public.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) : true
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/event-types", authMiddleware, eventTypeRoutes);
app.use("/api/slots", authMiddleware, slotsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/availability", authMiddleware, availabilityRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
