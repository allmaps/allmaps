import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { ciDatabaseUrl, migrateDatabase } from './migrations.ts'

const client = postgres(ciDatabaseUrl(process.env), {
  max: 1,
  idle_timeout: 0,
  max_lifetime: 0,
  connect_timeout: 15,
  onnotice: () => {}
})

try {
  const applied = await migrateDatabase(drizzle({ client }))
  console.log(
    applied.length
      ? `Applied migrations:\n${applied.join('\n')}`
      : 'No pending migrations'
  )
} finally {
  await client.end({ timeout: 5 })
}
