import { pool } from "../db/pool.js";
import { AppError } from "../lib/errors.js";
import { ok } from "../lib/response.js";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

export async function getPublicProfile(req, res, next) {
  try {
    const { username } = req.params;
    if (!username) {
      throw new AppError("Username is required", 400);
    }

    // Query all users to match slugified name
    const usersResult = await pool.query("select id::text as id, name from users");
    const matchedUser = usersResult.rows.find(
      (user) => slugify(user.name) === username.toLowerCase()
    );

    if (!matchedUser) {
      throw new AppError("User not found", 404);
    }

    // Query active event types for this user
    const eventTypesResult = await pool.query(
      `
        select 
          id::text as id, 
          title, 
          slug, 
          duration, 
          description 
        from event_types 
        where user_id = $1 and active = true
        order by created_at desc
      `,
      [matchedUser.id]
    );

    return ok(res, {
      name: matchedUser.name,
      eventTypes: eventTypesResult.rows
    });
  } catch (error) {
    return next(error);
  }
}
