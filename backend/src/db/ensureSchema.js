import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ensureSchema() {
  // Bootstrap base tables if not exists using 001_init.sql
  try {
    const initSqlPath = path.join(__dirname, "migrations", "001_init.sql");
    const initSql = await fs.readFile(initSqlPath, "utf8");
    await pool.query(initSql);
  } catch (err) {
    console.error("Warning: Failed to bootstrap base schema, attempting to proceed...", err.message);
  }

  await pool.query(`
    ALTER TABLE availability_settings
    ADD COLUMN IF NOT EXISTS is_on_break BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE event_types
    ADD COLUMN IF NOT EXISTS booking_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);

  await pool.query(`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);

  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add user_id to event_types
  await pool.query(`
    ALTER TABLE event_types
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  `);

  // Add user_id to bookings
  await pool.query(`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  `);

  // Update availability_settings: remove singleton constraint, remove PK constraint on id, add user_id, set PK constraint on user_id
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_singleton'
      ) THEN
        ALTER TABLE availability_settings DROP CONSTRAINT availability_singleton;
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_settings_pkey'
      ) THEN
        ALTER TABLE availability_settings DROP CONSTRAINT availability_settings_pkey;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'availability_settings' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE availability_settings ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_settings_pkey' OR conname = 'availability_settings_user_id_pkey'
      ) THEN
        ALTER TABLE availability_settings ADD PRIMARY KEY (user_id);
      END IF;
    END $$;
  `);

  // Update availability_weekly_rules: add user_id, drop unique on day, add unique on (user_id, day)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'availability_weekly_rules' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE availability_weekly_rules ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_weekly_rules_day_key'
      ) THEN
        ALTER TABLE availability_weekly_rules DROP CONSTRAINT availability_weekly_rules_day_key;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_weekly_rules_user_id_day_key'
      ) THEN
        ALTER TABLE availability_weekly_rules ADD CONSTRAINT availability_weekly_rules_user_id_day_key UNIQUE (user_id, day);
      END IF;
    END $$;
  `);

  // Update availability_date_overrides: add user_id, drop unique on date, add unique on (user_id, date)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'availability_date_overrides' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE availability_date_overrides ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_date_overrides_date_key'
      ) THEN
        ALTER TABLE availability_date_overrides DROP CONSTRAINT availability_date_overrides_date_key;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'availability_date_overrides_user_id_date_key'
      ) THEN
        ALTER TABLE availability_date_overrides ADD CONSTRAINT availability_date_overrides_user_id_date_key UNIQUE (user_id, date);
      END IF;
    END $$;
  `);
}

