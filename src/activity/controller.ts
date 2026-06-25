import { and, asc, desc, eq, gte, lte, count, sql, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { activitySession, attendanceTable, idleSessionTable } from "../db/schema.js";
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


  getActivity: async ({
    attendanceId,
    userId,
    date
  }: {
    attendanceId?: string
    userId?: string
    date?: string
  }) => {

    if (attendanceId) {
      const [attendance] = await db
        .select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, attendanceId))

      if (!attendance) {
        throw new Error("Attendance not found")
      }

      const activities = await db
        .select()
        .from(activitySession)
        .where(
          eq(
            activitySession.attendanceId,
            attendanceId
          )
        )

      const idleSessions = await db
        .select()
        .from(idleSessionTable)
        .where(
          eq(
            idleSessionTable.attendanceId,
            attendanceId
          )
        )

      return {
        attendance,
        activities,
        idleSessions
      }
    }

  },

  setActivity: async ({ activities }: { activities: Activity[] }) => {
    console.log("sync controller")
    const sessions = await db
      .insert(activitySession)
      .values(
        activities.map((activity) => ({
          syncId: activity.syncId,
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
      ).onConflictDoUpdate({
        target: activitySession.syncId,
        set: {
          endTime: sql`excluded."endTime"`,
          duration: sql`excluded.duration`,
        }
      })
      .returning();
    console.log("👍👍👍synced : ", sessions.length)
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

    if (attendanceId) {
      // Specific session selected
      conditions.push(
        eq(activitySession.attendanceId, attendanceId)
      );
    } else {
      // Entire day selected
      if (userId) {
        conditions.push(
          eq(activitySession.userId, userId)
        );
      }

      if (from) {
        conditions.push(
          gte(activitySession.startTime, new Date(from))
        );
      }

      if (to) {
        conditions.push(
          lte(activitySession.startTime, new Date(to))
        );
      }
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

    console.log("activity data : ", data)
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
    console.log('date ->', date, ' start ->', start, ' end ->', end, 'user id ->', userId, 'attendace id ->', attendanceId, 'page ->', page)
    return activityController.getActivitySessions({
      userId,
      attendanceId,
      from: start.toISOString(),
      to: end.toISOString(),
      limit,
      offset: (page - 1) * limit,
    });
  },
  startIdleSession: async ({
    attendanceId,
    userId,
    startTime,
  }: {
    attendanceId: string
    userId: string
    startTime: string
  }) => {
    // Check for an existing active idle session
    const [existing] = await db
      .select()
      .from(idleSessionTable)
      .where(
        and(
          eq(idleSessionTable.attendanceId, attendanceId),
          isNull(idleSessionTable.endTime)
        )
      )
      .limit(1)

    // Prevent duplicate idle sessions
    if (existing) {
      return existing
    }

    const [idleSession] = await db
      .insert(idleSessionTable)
      .values({
        attendanceId,
        userId,
        startTime: new Date(startTime),
      })
      .returning()

    return idleSession
  },

  stopIdleSession: async ({
    attendanceId,
    endTime
  }: {
    attendanceId: string
    endTime: string
  }) => {

    const [activeIdle] = await db
      .select()
      .from(idleSessionTable)
      .where(
        and(
          eq(idleSessionTable.attendanceId, attendanceId),
          isNull(idleSessionTable.endTime)
        )
      )
      .limit(1)

    if (!activeIdle) {
      throw new Error("No active idle session found")
    }

    const idleEndTime = new Date(endTime)

    const duration = Math.floor(
      (idleEndTime.getTime() -
        activeIdle.startTime.getTime()) / 1000
    )

    await db.transaction(async (tx) => {
      await tx
        .update(idleSessionTable)
        .set({
          endTime: idleEndTime,
          durationSeconds: duration
        })
        .where(eq(idleSessionTable.id, activeIdle.id))

      await tx
        .update(attendanceTable)
        .set({
          totalIdleSeconds: sql`
          ${attendanceTable.totalIdleSeconds} + ${duration}
        `
        })
        .where(eq(attendanceTable.id, attendanceId))
    })

    return {
      success: true,
      duration
    }
  }
};
