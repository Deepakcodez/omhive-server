import { Hono } from "hono";
import { attendanceController } from "./controller.js";
import { userController } from "../user/controller.js";

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
    .post("/heartbeat", async (c) => {
        try {
            const body = await c.req.json();
            console.log("heartbeat", body)
            const { attendanceId, time, userId } = body;



            const attendance = await attendanceController.setLastSeen({ attendanceId, time })
            if (!attendance) {
                return c.json(
                    { data: null, success: false, message: "Failed to update heartbeat" },
                    500,
                );
            }

            const isLoggedInResponse = await userController.isLoggedIn({ userId: userId, date: time })
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
