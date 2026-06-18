import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { attendanceTable, breakSessionTable, usersTable } from "../db/schema.js";
import type { Login, User } from "./schema.js";

export const userController = {
    createUser: async ({ userName, fullName, phone }: User) => {
        const user = await db.insert(usersTable).values({
            userName,
            fullName,
            phone,
        }).returning()
        return user
    },
    login: async ({ userName, startTime, hostname, systemUsername, os }: Login) => {
        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.userName, userName));
        if (!user) {
            throw new Error("User not found")
        }
        const attendanceDate = new Date(startTime)
            .toISOString()
            .split('T')[0];

        const existingAttendance = await db
            .select()
            .from(attendanceTable)
            .where(
                and(
                    eq(attendanceTable.userId, user.id),
                    eq(attendanceTable.date, attendanceDate)
                )
            )
            .limit(1);

        if (existingAttendance.length > 0) {
            return {
                userId: user.id,
                userName: user.userName,
                existing: true,
                attendanceId: existingAttendance[0].id,
                loginTime: existingAttendance[0].loginTime
            };
        }

        const [attendance] = await db.insert(attendanceTable).values({
            userId: user.id,
            date: attendanceDate,
            loginTime: new Date(startTime),
            hostname,
            systemUsername,
            os,
        }).returning()

        if (!attendance) {
            throw new Error("Attendance not created")
        }
        return {
            userId: user.id,
            username : user.userName,
            attendanceId: attendance.id,
            existing: false,
            loginTime: attendance.loginTime

        }
    },
    break: async ({ attendanceId }: { attendanceId: string }) => {

        const [attendance] = await db
            .select()
            .from(attendanceTable)
            .where(eq(attendanceTable.id, attendanceId));

        if (!attendance) {
            throw new Error("Attendance not found");
        }

        if (attendance.status === "break") {
            throw new Error("Already on break");
        }

        const [breakSession] = await db
            .insert(breakSessionTable)
            .values({
                attendanceId,
                startTime: new Date(),
            })
            .returning();

        await db
            .update(attendanceTable)
            .set({
                status: "break",
            })
            .where(eq(attendanceTable.id, attendanceId));

        return breakSession;
    },
    resume: async ({ attendanceId }: { attendanceId: string }) => {
        const [activeBreak] = await db
            .select()
            .from(breakSessionTable)
            .where(
                and(
                    eq(breakSessionTable.attendanceId, attendanceId),
                    isNull(breakSessionTable.endTime)
                )
            );

        if (!activeBreak) {
            throw new Error("No active break found");
        }

        const endTime = new Date();

        const durationSeconds = Math.floor(
            (endTime.getTime() -
                activeBreak.startTime.getTime()) / 1000
        );

        await db
            .update(breakSessionTable)
            .set({
                endTime,
                durationSeconds,
            })
            .where(eq(breakSessionTable.id, activeBreak.id));

        await db
            .update(attendanceTable)
            .set({
                status: "working",
                totalBreakSeconds:
                    sql`${attendanceTable.totalBreakSeconds} + ${durationSeconds}`,
            })
            .where(eq(attendanceTable.id, attendanceId));

        return {
            durationSeconds,
        };
    },
    logout: async ({ attendanceId }: { attendanceId: string }) => {
        const [attendance] = await db
            .select()
            .from(attendanceTable)
            .where(eq(attendanceTable.id, attendanceId));

        if (!attendance) {
            throw new Error("Attendance not found");
        }
        if (attendance.status === "logged_out") {
            return {
                alreadyLoggedOut: true,
                logoutTime: attendance.logoutTime,
                totalWorkSeconds: attendance.totalWorkSeconds,
                totalBreakSeconds: attendance.totalBreakSeconds,
            };
        }

        const logoutTime = new Date();

        const totalSeconds = Math.floor(
            (logoutTime.getTime() -
                attendance.loginTime.getTime()) / 1000
        );

        const workSeconds =
            totalSeconds - attendance.totalBreakSeconds;

        await db
            .update(attendanceTable)
            .set({
                logoutTime,
                totalWorkSeconds: workSeconds,
                status: "logged_out",
            })
            .where(eq(attendanceTable.id, attendanceId));

        return {
            alreadyLoggedOut: false,
            logoutTime,
            totalWorkSeconds: workSeconds,
            totalBreakSeconds: attendance.totalBreakSeconds,
        };
    },

    allUser: async () => {
        const user = await db.select().from(usersTable)
        return user
    },
    userById: async ({ id }: { id: string }) => {
        const user = await db.select().from(usersTable).where(eq(usersTable.id, id))
        return user
    }
}