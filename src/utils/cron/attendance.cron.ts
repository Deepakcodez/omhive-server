import { and, eq, isNotNull, lt } from "drizzle-orm"
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
                        attendanceTable.status,
                        "working"
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
                    eq(
                        attendanceTable.id,
                        attendance.id
                    )
                )
        }
    }, 10_000)

}
