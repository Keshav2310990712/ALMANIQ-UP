import jwt from "jsonwebtoken";
import { AppError } from "../lib/errors.js";

export function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Authorization header is missing", 401);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new AppError("Authorization header must be in the format 'Bearer <token>'", 401);
  }

  const token = parts[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_signing_key_change_me";
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    next();
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
}
