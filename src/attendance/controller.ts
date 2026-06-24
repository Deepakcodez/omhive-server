import { eq } from "drizzle-orm"
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
            .from(attendanceTable)
            .innerJoin(
                usersTable,
                eq(attendanceTable.userId, usersTable.id)
            )
            .where(
                eq(attendanceTable.date, date)
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

            user.totalWorkSeconds +=
                row.totalWorkSeconds

            user.totalBreakSeconds +=
                row.totalBreakSeconds

            user.totalIdleSeconds +=
                row.totalIdleSeconds ?? 0

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

        return Array.from(usersMap.values())
    }
}
