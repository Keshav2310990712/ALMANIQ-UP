import { pool } from "../db/pool.js";
import { ok } from "../lib/response.js";

export async function getAnalytics(req, res, next) {
  try {
    const userId = String(req.user.id);

    // 1. Total bookings & cancelled count
    const summaryRes = await pool.query(
      `
        select 
          count(*)::int as total,
          coalesce(sum(case when status = 'cancelled' then 1 else 0 end), 0)::int as cancelled
        from bookings
        where user_id = $1
      `,
      [userId]
    );

    const { total, cancelled } = summaryRes.rows[0] || { total: 0, cancelled: 0 };
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    // 2. Most Booked Event Type
    const mostBookedRes = await pool.query(
      `
        select et.title, count(b.uid)::int as count
        from bookings b
        join event_types et on b.event_type_id = et.id
        where b.user_id = $1
        group by et.title
        order by count desc
        limit 1
      `,
      [userId]
    );
    const mostBookedEvent = mostBookedRes.rows[0]?.title || "N/A";

    // 3. Busiest Day
    const busiestDayRes = await pool.query(
      `
        select trim(to_char(date, 'Day')) as weekday, count(*)::int as count
        from bookings
        where user_id = $1
        group by weekday
        order by count desc, weekday asc
        limit 1
      `,
      [userId]
    );
    const busiestDay = busiestDayRes.rows[0]?.weekday || "N/A";

    return ok(res, {
      totalBookings: total,
      mostBookedEvent,
      busiestDay,
      cancellationRate: `${cancellationRate}%`
    });
  } catch (error) {
    return next(error);
  }
}
