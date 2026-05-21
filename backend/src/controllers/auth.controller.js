import * as authService from "../services/auth.service.js";
import { ok } from "../lib/response.js";

export async function signup(req, res, next) {
  try {
    const data = await authService.signup(req.body);
    return ok(res, data, "User registered successfully");
  } catch (error) {
    return next(error);
  }
}

export async function signin(req, res, next) {
  try {
    const data = await authService.signin(req.body);
    return ok(res, data, "Logged in successfully");
  } catch (error) {
    return next(error);
  }
}
