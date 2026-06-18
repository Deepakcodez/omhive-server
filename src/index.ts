import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { userRoute } from './user/routes.js'

const app = new Hono()

app.get('/', (c) => {
  console.log("api hit")
  return c.text('Hello Hono!')
})

app.route('/api/user', userRoute)

serve({
  fetch: app.fetch,
  port: 5001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
