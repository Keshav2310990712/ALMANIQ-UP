import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as userRepository from "../repositories/user.repository.js";
import { withTransaction } from "../db/pool.js";
import { AppError } from "../lib/errors.js";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_signing_key_change_me";

export async function signup({ name, email, password }) {
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // Check if user already exists
  const existingUser = await userRepository.getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user and initialize availability in a transaction
  const user = await withTransaction(async (client) => {
    // Insert user
    const userResult = await client.query(
      `
        insert into users (name, email, password_hash)
        values ($1, $2, $3)
        returning id::text as id, name, email, created_at as "createdAt"
      `,
      [name, normalizedEmail, passwordHash]
    );
    const newUser = userResult.rows[0];

    // Initialize availability settings
    await client.query(
      `
        insert into availability_settings (user_id, timezone, is_on_break)
        values ($1, 'UTC', false)
      `,
      [newUser.id]
    );

    // Initialize weekly rules
    const defaultRules = [
      { day: 1, start: "09:00", end: "17:00" },
      { day: 2, start: "09:00", end: "17:00" },
      { day: 3, start: "09:00", end: "17:00" },
      { day: 4, start: "09:00", end: "17:00" },
      { day: 5, start: "09:00", end: "17:00" }
    ];

    for (const rule of defaultRules) {
      await client.query(
        `
          insert into availability_weekly_rules (user_id, day, start_time, end_time)
          values ($1, $2, $3, $4)
        `,
        [newUser.id, rule.day, rule.start, rule.end]
      );
    }

    return newUser;
  });

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { user, token };
}

export async function signin({ email, password }) {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // Find user
  const user = await userRepository.getUserByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    },
    token
  };
}
