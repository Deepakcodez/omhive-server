import { Hono } from "hono";

export const activityRoute = new Hono()
    //set activity
    .post('/', async (c) => {
        const { activity } = await c.req.json()
        console.log(activity)
        return c.json({ data: activity, success: true }, 200)
    })