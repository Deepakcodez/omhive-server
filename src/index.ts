import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { connectDB, pool } from './config/db.js'
import { initUserTable } from './models/user.model.js'
import { userRoutes } from './routes/user.routes.js'

const app = new Hono()


app.get('/', async(c) => {
  const result =await pool.query("SELECT current_database()");
  return c.text(`database name: ${result.rows[0].current_database}`)
})
app.route('/api/users', userRoutes)

await connectDB();
await initUserTable();

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000)
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
