import * as bookingRepository from "../repositories/booking.repository.js";
import * as availabilityRepository from "../repositories/availability.repository.js";
import * as eventTypeRepository from "../repositories/eventType.repository.js";
import { randomUUID } from "crypto";
import { withTransaction } from "../db/pool.js";
import { AppError } from "../lib/errors.js";
import { getWeekdayInTimeZone } from "../lib/date.js";
import { generateTimeSlots } from "../lib/slotEngine.js";
import { sendBookingEmail } from "./mailer.service.js";

export async function listBookings(filters, userId) {
  return bookingRepository.listBookings({ ...filters, userId });
}

export async function listAvailableSlots(filters, userId) {
  const [availability, existingBookings, eventTypes] = await Promise.all([
    availabilityRepository.getAvailability({ userId }),
    bookingRepository.listBookings({ ...filters, userId }),
    eventTypeRepository.listEventTypes({ id: filters?.eventTypeId, slug: filters?.slug, userId })
  ]);

  const eventType = Array.isArray(eventTypes)
    ? eventTypes.find(
        (item) =>
          item?.id === filters?.eventTypeId ||
          item?.slug === filters?.slug
      )
    : null;

  const timezone = availability?.timezone || "UTC";
  const dayInTimeZone = getWeekdayInTimeZone(filters?.date, timezone);
  const weeklyRule = Array.isArray(availability?.weeklyRules)
    ? availability.weeklyRules.find((item) => item.day === dayInTimeZone)
    : null;

  const blockedDates = Array.isArray(availability?.blockedDates)
    ? availability.blockedDates.map((date) => ({ date, blocked: true }))
    : [];

  const dateOverrides = Array.isArray(availability?.dateOverrides)
    ? availability.dateOverrides
    : blockedDates;

  return generateTimeSlots({
    date: filters?.date,
    availabilityRules: {
      days: weeklyRule ? [weeklyRule.day] : Array.isArray(availability?.days) ? availability.days : [],
      startTime: weeklyRule?.startTime || availability?.startTime || "09:00",
      endTime: weeklyRule?.endTime || availability?.endTime || "17:00"
    },
    dateOverrides,
    existingBookings: Array.isArray(existingBookings) ? existingBookings : [],
    eventDuration: Number(
      filters?.duration ?? filters?.eventDuration ?? eventType?.duration ?? 30
    ),
    bufferBefore: Number(filters?.bufferBefore ?? 0),
    bufferAfter: Number(filters?.bufferAfter ?? 0)
  });
}

export async function createBooking(payload, userId) {
  const eventType = await getEventTypeByIdOrThrow(payload?.eventTypeId, userId);
  const availability = await availabilityRepository.getAvailability({ userId });

  const bookingPayload = {
    uid: randomUUID(),
    eventTypeId: eventType.id,
    name: payload?.name,
    email: payload?.email,
    answers: normalizeBookingAnswers(payload?.answers, eventType.bookingQuestions),
    date: payload?.date,
    time: payload?.time,
    duration: Number(eventType.duration || 30),
    userId
  };

  try {
    const booking = await withTransaction((client) =>
      bookingRepository.createBooking(bookingPayload, client)
    );

    await trySendBookingEmail({
      type: "confirmed",
      booking,
      eventType,
      timezone: availability?.timezone || "UTC"
    });

    return booking;
  } catch (error) {
    throw mapBookingConflict(error);
  }
}

export async function cancelBooking(uid, userId) {
  const booking = await bookingRepository.getBookingByUid(uid);
  if (!booking || String(booking.userId) !== String(userId)) {
    throw new AppError("Booking not found", 404);
  }

  const availability = await availabilityRepository.getAvailability({ userId });
  const updatedBooking = await withTransaction((client) =>
    bookingRepository.cancelBooking(uid, client)
  );

  if (!updatedBooking) {
    throw new AppError("Booking not found", 404);
  }

  const eventType = await getEventTypeByIdOrThrow(updatedBooking.eventTypeId, userId);

  await trySendBookingEmail({
    type: "cancelled",
    booking: updatedBooking,
    eventType,
    timezone: availability?.timezone || "UTC"
  });

  return updatedBooking;
}

export async function getBookingByUidPublic(uid) {
  const booking = await bookingRepository.getBookingByUid(uid);
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const eventTypes = await eventTypeRepository.listEventTypes({ id: booking.eventTypeId });
  const eventType = Array.isArray(eventTypes) ? eventTypes[0] : null;

  return {
    ...booking,
    eventName: eventType ? eventType.title : "Scheduled Meeting",
    eventDescription: eventType ? eventType.description : ""
  };
}

export async function rescheduleBooking(uid, payload, userId) {
  try {
    const availability = await availabilityRepository.getAvailability({ userId });
    const result = await withTransaction(async (client) => {
      const existingBooking = await bookingRepository.getBookingByUid(uid, client);

      if (!existingBooking || String(existingBooking.userId) !== String(userId)) {
        throw new AppError("Booking not found", 404);
      }

      const eventType = await getEventTypeByIdOrThrow(existingBooking.eventTypeId, userId);

      const booking = await bookingRepository.rescheduleBooking(
        uid,
        {
          date: payload?.date,
          time: payload?.time,
          duration: Number(eventType.duration || existingBooking.duration)
        },
        client
      );

      if (!booking) {
        throw new AppError("Booking not found", 404);
      }

      return { booking, eventType };
    });

    await trySendBookingEmail({
      type: "rescheduled",
      booking: result.booking,
      eventType: result.eventType,
      timezone: availability?.timezone || "UTC"
    });

    return result.booking;
  } catch (error) {
    throw mapBookingConflict(error);
  }
}

function mapBookingConflict(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.code === "23P01" || error?.code === "23505") {
    return new AppError("This time slot is already booked", 409);
  }

  return error;
}

async function getEventTypeByIdOrThrow(eventTypeId, userId) {
  const eventTypes = await eventTypeRepository.listEventTypes({ id: eventTypeId, userId });
  const eventType = Array.isArray(eventTypes) ? eventTypes[0] : null;

  if (!eventType) {
    throw new AppError("Event type not found", 404);
  }

  return eventType;
}

async function trySendBookingEmail(payload) {
  try {
    await sendBookingEmail(payload);
  } catch (error) {
    console.error("Failed to send booking email", error);
  }
}

function normalizeBookingAnswers(answers, bookingQuestions = []) {
  if (!answers || typeof answers !== "object") {
    return {};
  }

  return (Array.isArray(bookingQuestions) ? bookingQuestions : []).reduce((result, question) => {
    const key = String(question || "").trim();

    if (!key) {
      return result;
    }

    result[key] = String(answers[key] || "").trim();
    return result;
  }, {});
}
