import { Hono } from "hono";
import { userController } from "./controller.js";
import { validator } from "hono/validator";
import { isLoggedInSchema, LoginSchema, UserSchema } from "./schema.js";

export const userRoute = new Hono()
    // get all user
    .get('/list', async (c) => {
        try {
            const users = await userController.allUser()
            return c.json({ data: users, success: true, message: "Fetched all user successfully" }, 200)
        } catch (error: any) {
            console.log("error in get all user", error)
            return c.json({ data: null, success: false, message: error.message }, 500)
        }
    })
    .get('/with-login-logout', async (c) => {
        try {
            const users = await userController.allUserWithLoginLogout()
            return c.json({ data: users, success: true, message: "Fetched all user successfully" }, 200)
        } catch (error: any) {
            console.log("error in get all user", error)
            return c.json({ data: null, success: false, message: error.message }, 500)
        }
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

    // is logged in
    .post('/is-logged-in',
        validator('json', (value, c) => {
            const parsed = isLoggedInSchema.safeParse(value)
            if (!parsed.success) {
                return c.json({ error: parsed.error.issues }, 401)
            }
            return parsed.data
        }),
        async (c) => {
            const { userId, date } = c.req.valid('json')
            const user = await userController.isLoggedIn({ userId, date })
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
            try {
                const { userName, startTime, hostname, systemUsername, os } = c.req.valid('json')

                const user = await userController.login({ userName, startTime, hostname, systemUsername, os })
                return c.json({ data: user, success: true, message: "User logged in" }, 200)
            } catch (error: any) {
                console.log("error in login", error)
                return c.json({ data: null, success: false, message: error.message }, 500)
            }
        })
    // user break
    .post('/break',
        async (c) => {
            try {
                const { attendanceId } = await c.req.json()
                if (!attendanceId) {
                    return c.json({ data: null, success: false, message: "Attendance ID is required" }, 400)
                }
                const breakData = await userController.break({ attendanceId })
                return c.json({ data: breakData, success: true, message: "Break started" }, 200)
            } catch (error: any) {
                return c.json({ data: null, success: false, message: error.message }, 500)
            }
        })
    .post('/resume',
        async (c) => {
          try {
              const { attendanceId } = await c.req.json()
              if (!attendanceId) {
                  return c.json({ data: null, success: false, message: "Attendance ID is required" }, 400)
              }
              const user = await userController.resume({ attendanceId })
              return c.json({ data: user, success: true , message : ""}, 200)
          } catch (error: any) {
            return c.json({ data: null, success: false, message: error.message }, 500)
          }
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