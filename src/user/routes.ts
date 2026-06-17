import { Hono } from "hono";
import { userController } from "./controller.js";
import { validator } from "hono/validator";
import { UserSchema } from "./schema.js";

export const userRoute = new Hono()
    // get all user
    .get('/', (c) => c.json({ result: 'list users' }))

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

    // get user by id
    .get('/:id', (c) => c.json({ result: `get ${c.req.param('id')}` }))