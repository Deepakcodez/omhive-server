import { Hono } from "hono";
import { attendanceController } from "./controller.js";
import { userController } from "../user/controller.js";
import { heartbeatInputSchema } from "./schema.js";
import { validator } from "hono/validator";

export const attendanceRoute = new Hono()

    .get("/", async (c) => {
        const date = c.req.query("date")

        if (!date) {
            throw new Error("Date is required")
        }
        try {

            const result = await attendanceController.getAttendanceByDate({
                date,
            })

            return c.json({
                data: result,
                success: true,
                message: "success to get attendance by date"
            }, 200)
        } catch (error: any) {
            console.log("error in attendance route", error.message)
            return c.json({
                data: null,
                success: false,
                message: error.message
            }, 500)

        }
    })

    // check heartbeat
    .post("/heartbeat",
        validator('json', (value, c) => {
            const parsed = heartbeatInputSchema.safeParse(value)
            if (!parsed.success) {
                return c.json({ error: parsed.error.issues }, 401)
            }
            return parsed.data
        }),
        async (c) => {
            try {
                const { attendanceId, userId } = c.req.valid('json');
                const now = new Date();
                const attendance = await attendanceController.setLastSeen({ attendanceId, time: now })
                if (!attendance) {
                    return c.json(
                        { data: null, success: false, message: "Failed to update heartbeat" },
                        500,
                    );
                }
                const isLoggedInResponse = await userController.isLoggedIn({ userId: userId, date: now })
                const response = {
                    "loggedIn": isLoggedInResponse.loggedIn,
                    "status": attendance.status,
                    "attendanceId": attendance.id
                }
                return c.json({ data: response, success: true, message: "Heartbeat is fine" }, 200);
            } catch (e: any) {
                return c.json(
                    { data: null, success: false, message: e.message ?? "Failed to check heartbeat" },
                    500,
                );
            }
        })

