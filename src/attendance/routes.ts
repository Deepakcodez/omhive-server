import { Hono } from "hono";
import { attendanceController } from "./controller.js";

export const attendanceRoute = new Hono()

attendanceRoute.get("/", async (c) => {
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