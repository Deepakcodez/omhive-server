import { and, asc, desc, eq, gte, lte, count, sql, isNull, SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { activitySession, attendanceTable, idleSessionTable, breakSessionTable } from "../db/schema.js";
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
    // 1. Conditions for activity sessions
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

    const activities = await db
      .select()
      .from(activitySession)
      .where(whereClause);

    // 2. Conditions for break sessions
    const breakConds = [];
    if (attendanceId) {
      breakConds.push(eq(breakSessionTable.attendanceId, attendanceId));
    } else {
      if (userId) {
        breakConds.push(eq(attendanceTable.userId, userId));
      }
      if (from) {
        breakConds.push(gte(breakSessionTable.startTime, new Date(from)));
      }
      if (to) {
        breakConds.push(lte(breakSessionTable.startTime, new Date(to)));
      }
    }
    const breakWhere = breakConds.length > 0 ? and(...breakConds) : undefined;
    const rawBreaks = await db
      .select({
        id: breakSessionTable.id,
        attendanceId: breakSessionTable.attendanceId,
        startTime: breakSessionTable.startTime,
        endTime: breakSessionTable.endTime,
        durationSeconds: breakSessionTable.durationSeconds,
      })
      .from(breakSessionTable)
      .innerJoin(attendanceTable, eq(breakSessionTable.attendanceId, attendanceTable.id))
      .where(breakWhere);

    const breakActivities = rawBreaks.map(b => ({
      id: b.id,
      syncId: b.id,
      attendanceId: b.attendanceId,
      userId: userId || '',
      activityType: 'break' as const,
      startTime: b.startTime,
      endTime: b.endTime || new Date(),
      duration: b.durationSeconds || Math.max(0, Math.round(((b.endTime ? b.endTime.getTime() : Date.now()) - b.startTime.getTime()) / 1000)),
      software: 'Break',
      title: 'On Break',
      hostname: '',
      systemUsername: '',
    }));

    // 3. Conditions for idle sessions
    const idleConds = [];
    if (attendanceId) {
      idleConds.push(eq(idleSessionTable.attendanceId, attendanceId));
    } else {
      if (userId) {
        idleConds.push(eq(idleSessionTable.userId, userId));
      }
      if (from) {
        idleConds.push(gte(idleSessionTable.startTime, new Date(from)));
      }
      if (to) {
        idleConds.push(lte(idleSessionTable.startTime, new Date(to)));
      }
    }
    const idleWhere = idleConds.length > 0 ? and(...idleConds) : undefined;
    const rawIdles = await db
      .select()
      .from(idleSessionTable)
      .where(idleWhere);

    const idleActivities = rawIdles.map(i => ({
      id: i.id,
      syncId: i.id,
      attendanceId: i.attendanceId,
      userId: i.userId,
      activityType: 'break' as const,
      startTime: i.startTime,
      endTime: i.endTime || new Date(),
      duration: i.durationSeconds || Math.max(0, Math.round(((i.endTime ? i.endTime.getTime() : Date.now()) - i.startTime.getTime()) / 1000)),
      software: 'Idle',
      title: 'User Idle',
      hostname: '',
      systemUsername: '',
    }));

    // 4. Combine, sort by startTime descending, and paginate
    const combined = [...activities, ...breakActivities, ...idleActivities]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const paginatedData = combined.slice(offset, offset + limit);

    console.log("combined activities length:", combined.length, "paginated length:", paginatedData.length);
    return {
      data: paginatedData,
      total: combined.length,
      limit,
      offset,
    };
  },
  getActivitySessionsForGraph: async ({
    userId,
    attendanceId,
    from,
    to,
  }: ActivityFilters) => {
    // Activity conditions
    const conditions: SQL[] = [];
    const breakConds: SQL[] = [];
    const idleConds: SQL[] = [];

    if (attendanceId) {
      conditions.push(
        eq(activitySession.attendanceId, attendanceId)
      );
    } else {
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

    const activities = await db
      .select()
      .from(activitySession)
      .where(whereClause);


    if (attendanceId) {
      breakConds.push(
        eq(breakSessionTable.attendanceId, attendanceId)
      );
    } else {
      if (userId) {
        breakConds.push(
          eq(attendanceTable.userId, userId)
        );
      }

      if (from) {
        breakConds.push(
          gte(breakSessionTable.startTime, new Date(from))
        );
      }

      if (to) {
        breakConds.push(
          lte(breakSessionTable.startTime, new Date(to))
        );
      }
    }

    const rawBreaks = await db
      .select({
        id: breakSessionTable.id,
        attendanceId: breakSessionTable.attendanceId,
        userId: attendanceTable.userId,
        startTime: breakSessionTable.startTime,
        endTime: breakSessionTable.endTime,
        durationSeconds: breakSessionTable.durationSeconds,
      })
      .from(breakSessionTable)
      .innerJoin(
        attendanceTable,
        eq(breakSessionTable.attendanceId, attendanceTable.id)
      )
      .where(
        breakConds.length
          ? and(...breakConds)
          : undefined
      );

    const breakActivities = rawBreaks.map((b) => ({
      id: b.id,
      syncId: b.id,
      attendanceId: b.attendanceId,
      userId: b.userId,
      activityType: 'break' as const,
      startTime: b.startTime,
      endTime: b.endTime ?? new Date(),
      duration:
        b.durationSeconds ||
        Math.round(
          ((b.endTime?.getTime() ?? Date.now()) -
            b.startTime.getTime()) /
          1000
        ),
      software: 'Break',
      title: 'On Break',
      hostname: '',
      systemUsername: '',
    }));



    if (attendanceId) {
      idleConds.push(
        eq(idleSessionTable.attendanceId, attendanceId)
      );
    } else {
      if (userId) {
        idleConds.push(
          eq(idleSessionTable.userId, userId)
        );
      }

      if (from) {
        idleConds.push(
          gte(idleSessionTable.startTime, new Date(from))
        );
      }

      if (to) {
        idleConds.push(
          lte(idleSessionTable.startTime, new Date(to))
        );
      }
    }

    const rawIdles = await db
      .select()
      .from(idleSessionTable)
      .where(
        idleConds.length
          ? and(...idleConds)
          : undefined
      );

    const idleActivities = rawIdles.map((i) => ({
      id: i.id,
      syncId: i.id,
      attendanceId: i.attendanceId,
      userId: i.userId,
      activityType: 'idle' as const,
      startTime: i.startTime,
      endTime: i.endTime,
      duration:
        i.durationSeconds ||
        Math.round(
          ((i.endTime?.getTime() ?? Date.now()) -
            i.startTime.getTime()) /
          1000
        ),
      software: 'Idle',
      title: 'User Idle',
      hostname: '',
      systemUsername: '',
    }));

    const data = [
      ...activities,
      ...breakActivities,
      ...idleActivities,
    ].sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    )

    return {
      data,
      total: data.length,
      limit: data.length,
      offset: 0,
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
  getActivityGraphByDate: async ({
    date,
    userId,
    attendanceId,
  }: Omit<ActivityDateFilters, 'page' | 'limit'>) => {
    const { start, end } = getDayRange(date);

    return activityController.getActivitySessionsForGraph({
      userId,
      attendanceId,
      from: start.toISOString(),
      to: end.toISOString(),
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
