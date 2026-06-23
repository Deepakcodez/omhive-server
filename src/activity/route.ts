import { Hono } from "hono";
import { activityController } from "./controller.js";

const getLimit = (value?: string) => {
  const limit = value ? Number(value) : 100;

  if (Number.isNaN(limit) || limit < 1 || limit > 500) {
    throw new Error("Limit must be between 1 and 500");
  }

  return limit;
};

export const isValidDateParam = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
};

export const activityRoute = new Hono()
  // get activity sessions by userId, attendanceId, or date range
  .get("/", async (c) => {
    try {
      const userId = c.req.query("userId");
      const attendanceId = c.req.query("attendanceId");
      const from = c.req.query("from");
      const to = c.req.query("to");
      const limit = getLimit(c.req.query("limit"));

      const sessions = await activityController.getActivitySessions({
        userId,
        attendanceId,
        from,
        to,
        limit,
      });

      return c.json({ data: sessions, success: true }, 200);
    } catch (e: any) {
      const status = e.message === "Limit must be between 1 and 500" ? 400 : 500;
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to get activity sessions" },
        status,
      );
    }
  })

  // get activity sessions for a user
  .get("/user/:userId", async (c) => {
    try {
      const sessions = await activityController.getActivitySessions({
        userId: c.req.param("userId"),
        from: c.req.query("from"),
        to: c.req.query("to"),
        limit: getLimit(c.req.query("limit")),
      });

      return c.json({ data: sessions, success: true }, 200);
    } catch (e: any) {
      const status = e.message === "Limit must be between 1 and 500" ? 400 : 500;
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to get user activity sessions" },
        status,
      );
    }
  })

  // get activity sessions for an attendance session
  .get("/attendance/:attendanceId", async (c) => {
    try {
      const sessions = await activityController.getActivitySessions({
        attendanceId: c.req.param("attendanceId"),
        from: c.req.query("from"),
        to: c.req.query("to"),
        limit: getLimit(c.req.query("limit")),
      });

      return c.json({ data: sessions, success: true }, 200);
    } catch (e: any) {
      const status = e.message === "Limit must be between 1 and 500" ? 400 : 500;
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to get attendance activity sessions" },
        status,
      );
    }
  })

  // get activity sessions by date
  .get("/date/:date", async (c) => {
    try {
      const date = c.req.param("date");
      const page = Number(c.req.query("page") ?? 1);
      const limit = getLimit(c.req.query("limit"));

      if (!isValidDateParam(date)) {
        return c.json(
          { data: null, success: false, message: "Date must be in YYYY-MM-DD format" },
          400,
        );
      }
      const sessions = await activityController.getActivityByDate({
        date,
        userId: c.req.query("userId"),
        attendanceId: c.req.query("attendanceId"),
        page,
        limit
      });

      return c.json({ data: sessions, success: true, message: "Fetched session successfully" }, 200);
    } catch (e: any) {
      const status = e.message === "Limit must be between 1 and 500" ? 400 : 500;
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to get activity sessions by date" },
        status,
      );
    }
  })

  // get one activity session
  .get("/:id", async (c) => {
    try {
      const session = await activityController.getActivityById({
        id: c.req.param("id"),
      });

      if (!session) {
        return c.json(
          { data: null, success: false, message: "Activity session not found" },
          404,
        );
      }

      return c.json({ data: session, success: true }, 200);
    } catch (e: any) {
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to get activity session" },
        500,
      );
    }
  })

  //set activity
  .post("/", async (c) => {
    try {
      console.log("syncing start")
      const activities = await c.req.json();
      const result = await activityController.setActivity({ activities });
      return c.json(
        { data: result, success: true, message: "Activity set successfully" },
        200,
      );
    } catch (e: any) {
      console.log("error : ", e)
      return c.json(
        { data: null, success: false, message: e.message ?? "Failed to set activity" },
        500,
      );
    }
  });
