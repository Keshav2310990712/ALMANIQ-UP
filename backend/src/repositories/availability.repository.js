import { pool, withTransaction } from "../db/pool.js";

const SETTINGS_QUERY = `
  select timezone, is_on_break as "isOnBreak"
  from availability_settings
  where id = true
  limit 1
`;

const WEEKLY_RULES_QUERY = `
  select
    day,
    to_char(start_time, 'HH24:MI') as "startTime",
    to_char(end_time, 'HH24:MI') as "endTime"
  from availability_weekly_rules
  order by day asc
`;

const DATE_OVERRIDES_QUERY = `
  select
    date::text as date,
    to_char(start_time, 'HH24:MI') as "startTime",
    to_char(end_time, 'HH24:MI') as "endTime",
    blocked
  from availability_date_overrides
  order by date asc
`;

export async function getAvailability(_filters) {
  const userId = _filters?.userId;
  const [settingsResult, weeklyRulesResult, dateOverridesResult] = await Promise.all([
    pool.query(
      `
        select timezone, is_on_break as "isOnBreak"
        from availability_settings
        where user_id = $1
        limit 1
      `,
      [userId]
    ),
    pool.query(
      `
        select
          day,
          to_char(start_time, 'HH24:MI') as "startTime",
          to_char(end_time, 'HH24:MI') as "endTime"
        from availability_weekly_rules
        where user_id = $1
        order by day asc
      `,
      [userId]
    ),
    pool.query(
      `
        select
          date::text as date,
          to_char(start_time, 'HH24:MI') as "startTime",
          to_char(end_time, 'HH24:MI') as "endTime",
          blocked
        from availability_date_overrides
        where user_id = $1
        order by date asc
      `,
      [userId]
    )
  ]);

  return buildAvailabilityResponse({
    timezone: settingsResult.rows[0]?.timezone || "UTC",
    isOnBreak: Boolean(settingsResult.rows[0]?.isOnBreak),
    weeklyRules: weeklyRulesResult.rows,
    dateOverrides: normalizeDateOverrides(dateOverridesResult.rows)
  });
}

export async function createAvailability(payload) {
  const userId = payload.userId;
  return withTransaction(async (client) => {
    const settingsResult = await client.query(
      `
        insert into availability_settings (user_id, timezone, updated_at)
        values ($1, $2, now())
        on conflict (user_id)
        do update set timezone = excluded.timezone, updated_at = now()
        returning timezone, is_on_break as "isOnBreak"
      `,
      [userId, payload.timezone]
    );

    await client.query("delete from availability_weekly_rules where user_id = $1", [userId]);
    await client.query("delete from availability_date_overrides where user_id = $1", [userId]);

    for (const rule of payload.weeklyRules) {
      await client.query(
        `
          insert into availability_weekly_rules (user_id, day, start_time, end_time)
          values ($1, $2, $3, $4)
        `,
        [userId, rule.day, rule.startTime, rule.endTime]
      );
    }

    for (const override of payload.dateOverrides) {
      await client.query(
        `
          insert into availability_date_overrides (user_id, date, start_time, end_time, blocked)
          values ($1, $2, $3, $4, $5)
        `,
        [userId, override.date, override.startTime, override.endTime, Boolean(override.blocked)]
      );
    }

    return buildAvailabilityResponse({
      timezone: settingsResult.rows[0]?.timezone || payload.timezone,
      isOnBreak: Boolean(settingsResult.rows[0]?.isOnBreak),
      weeklyRules: payload.weeklyRules,
      dateOverrides: normalizeDateOverrides(payload.dateOverrides)
    });
  });
}

export async function updateBreakMode(isOnBreak, userId) {
  const result = await pool.query(
    `
      insert into availability_settings (user_id, timezone, is_on_break, updated_at)
      values ($1, 'UTC', $2, now())
      on conflict (user_id)
      do update set is_on_break = excluded.is_on_break, updated_at = now()
      returning timezone, is_on_break as "isOnBreak"
    `,
    [userId, Boolean(isOnBreak)]
  );

  return {
    timezone: result.rows[0]?.timezone || "UTC",
    isOnBreak: Boolean(result.rows[0]?.isOnBreak)
  };
}

export async function getAvailabilityHeatmap({ eventId, month, userId }) {
  const monthStart = `${month}-01`;
  const result = await pool.query(
    `
      with bounds as (
        select
          $1::date as month_start,
          ($1::date + interval '1 month')::date as month_end
      ),
      days as (
        select generate_series(
          (select month_start from bounds),
          (select month_end from bounds) - interval '1 day',
          interval '1 day'
        )::date as day
      ),
      booked as (
        select
          b.date,
          coalesce(sum(b.duration), 0)::int as booked_minutes
        from bookings b
        where b.status = 'confirmed'
          and b.date >= (select month_start from bounds)
          and b.date < (select month_end from bounds)
          and b.user_id = $2
        group by b.date
      ),
      availability_by_day as (
        select
          d.day,
          greatest(
            case
              when o.blocked = true then 0
              when o.date is not null and o.start_time is not null and o.end_time is not null
                then greatest(floor(extract(epoch from (o.end_time - o.start_time)) / 60), 0)
              when w.day is not null
                then greatest(floor(extract(epoch from (w.end_time - w.start_time)) / 60), 0)
              else 0
            end::int,
            0
          ) as total_available_minutes,
          coalesce(b.booked_minutes, 0) as booked_minutes
        from days d
        left join availability_date_overrides o on o.date = d.day and o.user_id = $2
        left join availability_weekly_rules w on w.day = extract(dow from d.day)::int and w.user_id = $2
        left join booked b on b.date = d.day
      )
      select
        day::text as date,
        total_available_minutes as "totalAvailableMinutes",
        booked_minutes as "bookedMinutes",
        greatest(total_available_minutes - booked_minutes, 0) as "availableMinutes",
        case
          when total_available_minutes = 0 then 0
          else least(
            round(
              (greatest(total_available_minutes - booked_minutes, 0)::numeric * 100.0)
              / total_available_minutes
            ),
            100
          )::int
        end as score
      from availability_by_day
      order by day asc
    `,
    [monthStart, userId]
  );

  return result.rows;
}

function normalizeDateOverrides(dateOverrides = []) {
  return dateOverrides.map((row) => ({
    ...row,
    startTime: row.startTime || null,
    endTime: row.endTime || null
  }));
}

function buildAvailabilityResponse({ timezone, isOnBreak = false, weeklyRules = [], dateOverrides = [] }) {
  const firstRule = weeklyRules[0] || null;

  return {
    timezone,
    isOnBreak,
    weeklyRules,
    dateOverrides,
    days: weeklyRules.map((rule) => rule.day),
    startTime: firstRule?.startTime || null,
    endTime: firstRule?.endTime || null,
    blockedDates: dateOverrides.filter((item) => item.blocked).map((item) => item.date)
  };
}
