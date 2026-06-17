import { boolean, date, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";


export const workStatus = pgEnum('work_status', ['working', 'break', 'logged_out']);
export const activityType = pgEnum('activity_type', ['work', 'break']);


export const usersTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom().unique(),
    userName: varchar({ length: 255 }).notNull(),
    fullName: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 15 }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const attendanceTable = pgTable("attendance", {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().notNull().references(() => usersTable.id),
    date: date().notNull(), // 2026-06-17
    loginTime: timestamp().notNull(),
    logoutTime: timestamp(),
    expectedWorkSeconds: integer().notNull().default(9 * 60 * 60), // 9 hours
    totalWorkSeconds: integer().notNull().default(0),
    totalBreakSeconds: integer().notNull().default(0),
    isPresent: boolean().notNull().default(true),
    status: workStatus('status').notNull().default('working'),
    hostname: varchar({ length: 255 }).notNull(),
    systemUsername: varchar({ length: 255 }).notNull(),
    os: varchar({ length: 100 }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const breakSessionTable = pgTable("break_sessions", {
    id: uuid().primaryKey().defaultRandom(),
    attendanceId: uuid().notNull().references(() => attendanceTable.id),
    startTime: timestamp().notNull(),
    endTime: timestamp(),
    durationSeconds: integer().notNull().default(0),
});

export const activitySession = pgTable("activitysession", {
    id: uuid().primaryKey().defaultRandom().unique(),
    attendanceId: uuid().notNull().references(() => attendanceTable.id),
    userId: uuid().notNull().references(() => usersTable.id),
    activityType: activityType('activity_type').default('work').notNull(),
    startTime: timestamp().notNull(),
    endTime: timestamp().notNull(),
    duration: integer().notNull(),
    software: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    hostname: varchar({ length: 255 }).notNull(),
    systemUsername: varchar({ length: 255 }).notNull(),
})
