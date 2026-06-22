import { and, asc, desc, eq, gte, lte, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { activitySession } from "../db/schema.js";
import type { Activity, ActivityDateFilters, ActivityFilters } from "./types.js";

const toDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

const getDayRange = (date: string) => {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
};

export const activityController = {
  setActivity: async ({ activities }: { activities: Activity[] }) => {
    console.log("sync controller")
    const sessions = await db
      .insert(activitySession)
      .values(
        activities.map((activity) => ({
          attendanceId: activity.attendanceId,
          userId: activity.userId,
          activityType: activity.activityType,
          startTime: toDate(activity.startTime),
          endTime: toDate(activity.endTime),
          duration: Math.round(activity.duration),
          software: activity.software,
          title: activity.title,
          hostname: activity.hostname,
          systemUsername: activity.systemUsername,
        }))
      )
      .returning();
    console.log("👍👍👍synced : ", sessions)
    return sessions;
  },

  getActivityById: async ({ id }: { id: string }) => {
    const [session] = await db
      .select()
      .from(activitySession)
      .where(eq(activitySession.id, id))
      .limit(1);

    return session ?? null;
  },

  getActivitySessions: async ({
    userId,
    attendanceId,
    from,
    to,
    limit = 100,
    offset = 1,
  }: ActivityFilters) => {
    const conditions = [];

    if (userId) {
      conditions.push(eq(activitySession.userId, userId));
    }

    if (attendanceId) {
      conditions.push(eq(activitySession.attendanceId, attendanceId));
    }

    if (from) {
      conditions.push(gte(activitySession.startTime, new Date(from)));
    }

    if (to) {
      conditions.push(lte(activitySession.startTime, new Date(to)));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(activitySession)
        .where(whereClause)
        .orderBy(desc(activitySession.startTime))
        .limit(limit)
        .offset(offset),

      db
        .select({
          count: count(),
        })
        .from(activitySession)
        .where(whereClause),
    ]);

    return {
      data,
      total: totalResult[0]?.count ?? 0,
      limit,
      offset,
    };
  },

  getActivityByDate: async ({
    date,
    userId,
    attendanceId,
    page,
    limit = 100,
  }: ActivityDateFilters) => {
    const { start, end } = getDayRange(date);

    return activityController.getActivitySessions({
      userId,
      attendanceId,
      from: start.toISOString(),
      to: end.toISOString(),
      limit,
      offset: (page - 1) * limit,
    });
  },
};
