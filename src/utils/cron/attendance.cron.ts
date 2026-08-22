import { and, eq, isNotNull, lt, ne, or } from "drizzle-orm"
import { db } from "../../db/index.js"
import { attendanceTable } from "../../db/schema.js"

export const checkHeartBeat = () => {
    console.log("checking user  heartbeat")
    setInterval(async () => {
        const fiveMinutesAgo =
            new Date(Date.now() - 1 * 60 * 1000)

        const inactiveUsers = await db
            .select()
            .from(attendanceTable)
            .where(
                and(
                    eq(
                        attendanceTable.status, "working"
                    ),
                    isNotNull(
                        attendanceTable.lastSeen
                    ),
                    lt(
                        attendanceTable.lastSeen,
                        fiveMinutesAgo
                    )
                )
            )

        console.log("inactive user -->  ", inactiveUsers)
        for (const attendance of inactiveUsers) {
            console.log("log outingg user")
            await db
                .update(attendanceTable)
                .set({
                    status: "logged_out",
                    logoutTime:
                        attendance.lastSeen
                })
                .where(
                    and(
                        eq(
                            attendanceTable.id,
                            attendance.id
                        ),
                        eq(
                            attendanceTable.status,
                            "working"
                        )
                    )
                )
        }
    }, 10_000)

}



export const closePreviousDayAttendance = () => {
    setInterval(async () => {
        const today =
            new Date().toISOString().split("T")[0]

        const oldSessions = await db
            .select()
            .from(attendanceTable)
            .where(
                and(
                    ne(attendanceTable.date, today),
                    or(
                        eq(
                            attendanceTable.status,
                            "working"
                        ),
                        eq(
                            attendanceTable.status,
                            "break"
                        )
                    )
                )
            )

        for (const attendance of oldSessions) {
            await db
                .update(attendanceTable)
                .set({
                    status: "logged_out",
                    logoutTime:
                        attendance.lastSeen ??
                        attendance.loginTime
                })
                .where(
                    and(
                        eq(
                            attendanceTable.id,
                            attendance.id
                        ),
                        or(
                            eq(
                                attendanceTable.status,
                                "working"
                            ),
                            eq(
                                attendanceTable.status,
                                "break"
                            )
                        )
                    )
                )
        }
    }, 60 * 60 * 1000)
}

