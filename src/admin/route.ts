import { Hono } from "hono";
import { validator } from "hono/validator";
import { UserSchema } from "../user/schema.js";
import { adminController } from "./controller.js";

export const adminRoute = new Hono()
    .post('/',
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


