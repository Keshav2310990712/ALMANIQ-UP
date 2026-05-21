import { Router } from "express";
import * as bookingController from "../controllers/bookings.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Public route - get booking details (Feature 1)
router.get("/:uid", bookingController.getBookingByUidPublic);

// Protected routes (require authMiddleware)
router.get("/slots", authMiddleware, bookingController.listAvailableSlots);
router.post("/", authMiddleware, bookingController.createBooking);
router.get("/", authMiddleware, bookingController.listBookings);
router.patch("/:uid/cancel", authMiddleware, bookingController.cancelBooking);
router.post("/:uid/reschedule", authMiddleware, bookingController.rescheduleBooking);

export default router;
