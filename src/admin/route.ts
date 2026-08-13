import { Hono } from "hono";
import { validator } from "hono/validator";
import { UserSchema } from "../user/schema.js";
import { adminController } from "./controller.js";

export const adminRoute = new Hono()
    .post('/create-user',
        validator('json', (value, c) => {
            const parsed = UserSchema.safeParse(value)
            if (!parsed.success) {
                return c.json({ error: parsed.error.issues }, 401)
            }
            return parsed.data
        }),
        async (c) => {
            const { userName, fullName, phone } = c.req.valid('json')
            try {
                const user = await adminController.createUser({ userName, fullName, phone })
                return c.json({ data: user, success: true }, 200)

            } catch (error: any) {
                return c.json({ error: error.message, success: false }, 401)
            }
        })
    .get('/user-list', async (c) => {
        try {
            const users = await adminController.allUser()
            return c.json({ data: users, success: true, message: "Fetched all user successfully" }, 200)
        } catch (error: any) {
            console.log("error in get all user", error)
            return c.json({ data: null, success: false, message: error.message }, 500)
        }
    })
    .post('/activate-user', async (c) => {
        try {
            const { userId } = await c.req.json()
            if (!userId) {
                return c.json({ data: null, success: false, message: "userId is required" }, 401)
            }
            const user = await adminController.activateUser({ userId })
            return c.json({ data: user, success: true }, 200)
        } catch (error: any) {
            return c.json({ data: null, success: false, message: error.message }, 401)
        }
    })

