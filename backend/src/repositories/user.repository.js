import { pool } from "../db/pool.js";

const USER_FIELDS = `
  id::text as id,
  name,
  email,
  created_at as "createdAt"
`;

export async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `
      insert into users (name, email, password_hash)
      values ($1, $2, $3)
      returning ${USER_FIELDS}
    `,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await pool.query(
    `
      select
        id::text as id,
        name,
        email,
        password_hash as "passwordHash",
        created_at as "createdAt"
      from users
      where email = $1
      limit 1
    `,
    [email]
  );
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const result = await pool.query(
    `
      select ${USER_FIELDS}
      from users
      where id = $1
      limit 1
    `,
    [String(id)]
  );
  return result.rows[0] || null;
}
