import { boolean, date, index, integer, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";


export const workStatus = pgEnum('work_status', ['working', 'break', 'logged_out']);
export const activityType = pgEnum('activity_type', ['work', 'break']);


export const usersTable = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    userName: varchar({ length: 255 }).unique().notNull(),
    fullName: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 15 }).unique().notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
},
    (table) => ({
        usernameIdx: uniqueIndex("users_username_idx").on(table.userName),
        phoneIdx: uniqueIndex("users_phone_idx").on(table.phone),
    })
);

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

}, (table) => ({
    userDateIdx: index("attendance_user_date_idx").on(
        table.userId,
        table.date
    ),

    statusIdx: index("attendance_status_idx").on(
        table.status
    ),
}));

export const breakSessionTable = pgTable("break_sessions", {
    id: uuid().primaryKey().defaultRandom(),
    attendanceId: uuid().notNull().references(() => attendanceTable.id),
    startTime: timestamp().notNull(),
    endTime: timestamp(),
    durationSeconds: integer().notNull().default(0),
});

export const activitySession = pgTable("activitysession", {
    id: uuid().primaryKey().defaultRandom(),
    syncId: uuid().notNull().unique(),
    attendanceId: uuid().notNull().references(() => attendanceTable.id),
    userId: uuid().notNull().references(() => usersTable.id),
    activityType: activityType('activity_type').default('work').notNull(),
    startTime: timestamp().notNull(),
    endTime: timestamp().notNull(),
    duration: integer().notNull(),
    software: text().notNull(),
    title: text().notNull(),
    hostname: text().notNull(),
    systemUsername: varchar({ length: 255 }).notNull(),
},

    (table) => ({
        userIdx: index("activity_user_idx").on(table.userId),

        attendanceIdx: index("activity_attendance_idx").on(
            table.attendanceId
        ),

        startTimeIdx: index("activity_start_idx").on(
            table.startTime
        ),

        userTimeIdx: index("activity_user_time_idx").on(
            table.userId,
            table.startTime
        ),
    }))



