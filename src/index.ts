import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { userRoute } from './user/routes.js'
import { activityRoute } from './activity/route.js'

const app = new Hono()

app.get('/', (c) => {
  console.log("api hit")
  return c.text('Hello Hono!')
})
app.post('/', async (c) => {
  const body = await c.req.json();
  console.log("sessions", body);
  return c.text('Hello Hono!')
})

app.route('/api/user', userRoute)
app.route('/api/activity', activityRoute)

serve({
  fetch: app.fetch,
  port: 5001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
