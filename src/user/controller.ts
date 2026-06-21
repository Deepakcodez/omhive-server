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
    allUserWithLoginLogout: async ({ date }: { date: string }) => {
        const records = await db
            .select({
                id: usersTable.id,
                userName: usersTable.userName,
                fullName: usersTable.fullName,
                phone: usersTable.phone,
                attendanceId: attendanceTable.id,
                date: attendanceTable.date,
                loginTime: attendanceTable.loginTime,
                logoutTime: attendanceTable.logoutTime,
                expectedWorkSeconds: attendanceTable.expectedWorkSeconds,
                totalWorkSeconds: attendanceTable.totalWorkSeconds,
                totalBreakSeconds: attendanceTable.totalBreakSeconds,
                status: attendanceTable.status,
                hostname: attendanceTable.hostname,
                systemUsername: attendanceTable.systemUsername,
                os: attendanceTable.os,
            })
            .from(usersTable)
            .where(eq(attendanceTable.date, date))
            .leftJoin(attendanceTable, eq(usersTable.id, attendanceTable.userId))
            .orderBy(usersTable.fullName, attendanceTable.date);

        const usersMap = new Map<string, any>();

        for (const record of records) {
            if (!usersMap.has(record.id)) {
                usersMap.set(record.id, {
                    id: record.id,
                    userName: record.userName,
                    fullName: record.fullName,
                    phone: record.phone,
                    attendance: []
                });
            }

            if (record.attendanceId) {
                usersMap.get(record.id).attendance.push({
                    id: record.attendanceId,
                    date: record.date,
                    loginTime: record.loginTime,
                    logoutTime: record.logoutTime,
                    expectedWorkSeconds: record.expectedWorkSeconds,
                    totalWorkSeconds: record.totalWorkSeconds,
                    totalBreakSeconds: record.totalBreakSeconds,
                    status: record.status,
                    hostname: record.hostname,
                    systemUsername: record.systemUsername,
                    os: record.os,
                });
            }
        }

        return Array.from(usersMap.values());
    },
    isLoggedIn: async ({ userId, date: today }: { userId: string, date: string }) => {
        console.log(userId, today)
        try {
            const [attendance] = await db
                .select()
                .from(attendanceTable)
                .where(
                    and(
                        eq(attendanceTable.userId, userId),
                        eq(attendanceTable.date, today),
                        isNull(attendanceTable.logoutTime)
                    )
                );
            console.log("attendance", attendance)
            return {
                loggedIn: !!attendance,
                attendanceId: attendance?.id ?? null,
                loginTime: attendance?.loginTime ?? null,
                status: attendance?.status ?? null,
            };
        } catch (error) {
            console.log("Error in isLoggedIn", error)
            return {
                loggedIn: false,
                attendanceId: null,
                loginTime: null,
                status: null,
            }
        }
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
            throw new Error("Attendance not registered")
        }
        return {
            userId: user.id,
            username: user.userName,
            existing: false,
            attendanceId: attendance.id,
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

        if (attendance.status === "logged_out") {
            throw new Error("User already logged out");
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

        return {
            breakId: breakSession.id,
            startTime: breakSession.startTime,
        };
    },
    resume: async ({ attendanceId }: { attendanceId: string }) => {
        const [attendance] = await db
            .select()
            .from(attendanceTable)
            .where(eq(attendanceTable.id, attendanceId));

        if (!attendance) {
            throw new Error("Attendance not found");
        }

        if (attendance.status === "logged_out") {
            throw new Error("User already logged out");
        }

        if (attendance.status !== "break") {
            throw new Error("User is not on break");
        }

        return db.transaction(async (tx) => {
            const [activeBreak] = await tx
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

            await tx
                .update(breakSessionTable)
                .set({
                    endTime,
                    durationSeconds,
                })
                .where(eq(breakSessionTable.id, activeBreak.id));

            await tx
                .update(attendanceTable)
                .set({
                    status: "working",
                    totalBreakSeconds:
                        sql`${attendanceTable.totalBreakSeconds} + ${durationSeconds}`,
                })
                .where(eq(attendanceTable.id, attendanceId));

            return {
                durationSeconds,
                resumedAt: endTime,
            };
        });
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

        let totalBreakSeconds = attendance.totalBreakSeconds;

        const [activeBreak] = await db
            .select()
            .from(breakSessionTable)
            .where(
                and(
                    eq(breakSessionTable.attendanceId, attendanceId),
                    isNull(breakSessionTable.endTime)
                )
            );

        if (activeBreak) {
            const breakDuration = Math.floor(
                (logoutTime.getTime() -
                    activeBreak.startTime.getTime()) / 1000
            );

            totalBreakSeconds += breakDuration;

            await db
                .update(breakSessionTable)
                .set({
                    endTime: logoutTime,
                    durationSeconds: breakDuration,
                })
                .where(eq(breakSessionTable.id, activeBreak.id));
        }

        const totalSeconds = Math.floor(
            (logoutTime.getTime() -
                attendance.loginTime.getTime()) / 1000
        );

        const workSeconds = Math.max(
            0,
            totalSeconds - totalBreakSeconds
        );

        await db
            .update(attendanceTable)
            .set({
                logoutTime,
                totalWorkSeconds: workSeconds,
                totalBreakSeconds,
                status: "logged_out",
            })
            .where(eq(attendanceTable.id, attendanceId));

        return {
            alreadyLoggedOut: false,
            logoutTime,
            totalWorkSeconds: workSeconds,
            totalBreakSeconds,
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