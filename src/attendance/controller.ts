import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "../db/index.js"
import { attendanceTable, usersTable, breakSessionTable, idleSessionTable } from "../db/schema.js"

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
        const attendanceIds = rows
            .map((r) => r.attendanceId)
            .filter((id): id is string => !!id)

        const activeBreaks =
            attendanceIds.length > 0
                ? await db
                      .select()
                      .from(breakSessionTable)
                      .where(
                          and(
                              inArray(breakSessionTable.attendanceId, attendanceIds),
                              isNull(breakSessionTable.endTime)
                          )
                      )
                : []

        const activeIdles =
            attendanceIds.length > 0
                ? await db
                      .select()
                      .from(idleSessionTable)
                      .where(
                          and(
                              inArray(idleSessionTable.attendanceId, attendanceIds),
                              isNull(idleSessionTable.endTime)
                          )
                      )
                : []

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

            let breakSeconds = row.totalBreakSeconds ?? 0
            let idleSeconds = row.totalIdleSeconds ?? 0

            // Add active break duration if any
            const activeBreak = activeBreaks.find(
                (b) => b.attendanceId === row.attendanceId
            )
            if (activeBreak) {
                const activeBreakDuration = Math.floor(
                    (Date.now() - new Date(activeBreak.startTime).getTime()) / 1000
                )
                breakSeconds += activeBreakDuration
            }

            // Add active idle duration if any
            const activeIdle = activeIdles.find(
                (i) => i.attendanceId === row.attendanceId
            )
            if (activeIdle) {
                const activeIdleDuration = Math.floor(
                    (Date.now() - new Date(activeIdle.startTime).getTime()) / 1000
                )
                idleSeconds += activeIdleDuration
            }

            let workSeconds = 0
            if (row.loginTime) {
                const end = row.logoutTime ? new Date(row.logoutTime) : new Date()
                const totalSeconds = Math.floor(
                    (end.getTime() - new Date(row.loginTime).getTime()) / 1000
                )
                workSeconds = Math.max(
                    0,
                    totalSeconds - breakSeconds - idleSeconds
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
        console.log(Array.from(usersMap.values()),  "attendance")
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
