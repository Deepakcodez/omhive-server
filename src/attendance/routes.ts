import { Hono } from "hono";
import { attendanceController } from "./controller.js";

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
            const { attendanceId, time } = body;



            //user will hit this api in every 1 min  wait for 5 min if  no req happens for 5 min set the user attendance to logout 
            const attendance = await attendanceController.setLastSeen({ attendanceId, time })
            if (!attendance) {
                return c.json(
                    { data: null, success: false, message: "Failed to update heartbeat" },
                    500,
                );
            }

            return c.json({ data: attendance, success: true, message: "Heartbeat is fine" }, 200);
        } catch (e: any) {
            return c.json(
                { data: null, success: false, message: e.message ?? "Failed to check heartbeat" },
                500,
            );
        }
    })
