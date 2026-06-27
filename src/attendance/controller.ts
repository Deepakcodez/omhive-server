import { and, eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { attendanceTable, usersTable } from "../db/schema.js"

export const attendanceController = {
    getAttendanceByDate: async ({ date }: { date: string }) => {
        const rows = await db
            .select({
                attendanceId: attendanceTable.id,

                userId: usersTable.id,
                userName: usersTable.userName,
                fullName: usersTable.fullName,

                loginTime: attendanceTable.loginTime,
                logoutTime: attendanceTable.logoutTime,

                totalWorkSeconds:
                    attendanceTable.totalWorkSeconds,

                totalBreakSeconds:
                    attendanceTable.totalBreakSeconds,

                totalIdleSeconds:
                    attendanceTable.totalIdleSeconds,

                status: attendanceTable.status,
            })
            .from(usersTable)
            .leftJoin(
                attendanceTable,
                and(
                    eq(attendanceTable.userId, usersTable.id),
                    eq(attendanceTable.date, date)
                )
            )

        const usersMap = new Map()

        for (const row of rows) {
            if (!usersMap.has(row.userId)) {
                usersMap.set(row.userId, {
                    userId: row.userId,
                    userName: row.userName,
                    fullName: row.fullName,

                    totalWorkSeconds: 0,
                    totalBreakSeconds: 0,
                    totalIdleSeconds: 0,

                    sessions: [],
                })
            }

            const user = usersMap.get(row.userId)

            if (!row.attendanceId) {
                continue
            }

            let workSeconds =
                row.totalWorkSeconds ?? 0

            let breakSeconds =
                row.totalBreakSeconds ?? 0

            const idleSeconds =
                row.totalIdleSeconds ?? 0

            // Active attendance
            if (
                row.loginTime &&
                !row.logoutTime &&
                row.status !== "logged_out"
            ) {
                const totalSeconds = Math.floor(
                    (
                        Date.now() -
                        new Date(row.loginTime).getTime()
                    ) / 1000
                )

                workSeconds = Math.max(
                    0,
                    totalSeconds -
                    breakSeconds -
                    idleSeconds
                )
            }

            user.totalWorkSeconds += workSeconds
            user.totalBreakSeconds += breakSeconds
            user.totalIdleSeconds += idleSeconds

            user.sessions.push({
                attendanceId: row.attendanceId,
                loginTime: row.loginTime,
                logoutTime: row.logoutTime,
                status: row.status,

                workSeconds,
                breakSeconds,
                idleSeconds,
            })
        }

        for (const user of usersMap.values()) {
            user.sessions.sort(
                (a: any, b: any) =>
                    new Date(b.loginTime).getTime() -
                    new Date(a.loginTime).getTime()
            )
        }

        return Array.from(usersMap.values())
    },
    setLastSeen: async ({ attendanceId, time }: { attendanceId: string, time: string }) => {
        console.log("estting last sean")
        const [attendance] = await db
            .update(attendanceTable)
            .set({
                lastSeen: new Date(time)
            })
            .where(
                eq(attendanceTable.id, attendanceId)
            )
            .returning()
        console.log("estting last sean end")
        return attendance
    }
}
