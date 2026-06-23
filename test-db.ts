import 'dotenv/config'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

await client.connect()

const res = await client.query(
  "select current_database(), current_user"
)

console.log(res.rows)

await client.end()