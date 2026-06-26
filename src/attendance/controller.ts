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

                totalWorkSeconds: attendanceTable.totalWorkSeconds,
                totalBreakSeconds: attendanceTable.totalBreakSeconds,
                totalIdleSeconds: attendanceTable.totalIdleSeconds,

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

            // User hasn't logged in
            if (!row.attendanceId) {
                continue
            }

            user.totalWorkSeconds += row.totalWorkSeconds ?? 0
            user.totalBreakSeconds += row.totalBreakSeconds ?? 0
            user.totalIdleSeconds += row.totalIdleSeconds ?? 0

            user.sessions.push({
                attendanceId: row.attendanceId,
                loginTime: row.loginTime,
                logoutTime: row.logoutTime,
                status: row.status,
                workSeconds: row.totalWorkSeconds,
                breakSeconds: row.totalBreakSeconds,
                idleSeconds: row.totalIdleSeconds,
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
