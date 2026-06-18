import { Hono } from "hono";
import { userController } from "./controller.js";
import { validator } from "hono/validator";
import { LoginSchema, UserSchema } from "./schema.js";

export const userRoute = new Hono()
    // get all user
    .get('/', async (c) => {
        const users = await userController.allUser()
        return c.json({ data: users, success: true }, 200)
    })

    // create user
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
            const user = await userController.createUser({ userName, fullName, phone })
            return c.json({ data: user, success: true }, 200)
        })

    // user login
    .post('/login',
        validator('json', (value, c) => {
            const parsed = LoginSchema.safeParse(value)
            if (!parsed.success) {
                return c.json({ error: parsed.error.issues }, 401)
            }
            return parsed.data
        }),
        async (c) => {
            const { userName, startTime, hostname, systemUsername, os } = c.req.valid('json')

            const user = await userController.login({ userName, startTime, hostname, systemUsername, os })
            return c.json({ data: user, success: true }, 200)
        })
    // user break
    .post('/break',
        async (c) => {
            const { attendanceId } = await c.req.json()
            if (!attendanceId) {
                return c.json({ data: null, success: false, message: "Attendance ID is required" }, 400)
            }
            const user = await userController.break({ attendanceId })
            return c.json({ data: user, success: true }, 200)
        })

    // user break
    .post('/logout', async (c) => {
        const { attendanceId } = await c.req.json()
        if (!attendanceId) {
            return c.json({ data: null, success: false, message: "Attendance ID is required" }, 400)
        }
        const user = await userController.logout({ attendanceId })
        return c.json({ data: user, success: true }, 200)
    })

    // get user by id
    .get('/:id', async (c) => {
        const user = await userController.userById({ id: c.req.param('id') })
        return c.json({ data: user, success: true }, 200)
    })