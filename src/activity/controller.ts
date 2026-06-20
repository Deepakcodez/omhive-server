import { and, asc, eq, gte, lte } from "drizzle-orm";
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
    console.log("session []", activities)
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

    const query = db
      .select()
      .from(activitySession)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(activitySession.startTime))
      .limit(limit);

    return query;
  },

  getActivityByDate: async ({
    date,
    userId,
    attendanceId,
    limit = 100,
  }: ActivityDateFilters) => {
    const { start, end } = getDayRange(date);
 
    return activityController.getActivitySessions({
      userId,
      attendanceId,
      from: start.toISOString(),
      to: end.toISOString(),
      limit,
    });
  },
};
