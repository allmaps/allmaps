import { getPgContext } from '@allmaps/db'
import { AllmapsShareDB } from '@allmaps/api-live'

import { seedDemoData } from './seed.ts'

// Seeds the demo dataset into the PostgreSQL database at DATABASE_URL, once.
// SEED_FIXTURE_ORIGINS lists the two fixture server origins the demo
// organizations serve their images from, separated by a comma.

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Missing DATABASE_URL')

const origins = process.env.SEED_FIXTURE_ORIGINS?.split(',')

const context = getPgContext(databaseUrl)
const shareDb = new AllmapsShareDB({ db: context.db })

try {
  await seedDemoData(
    {
      client: {
        query: async (sql, params = []) => ({
          rows: (await context.pool.query(sql, params)).rows as never[]
        }),
        exec: async (sql) => {
          await context.pool.query(sql)
        }
      },
      db: context.db,
      shareDb
    },
    undefined,
    origins
  )
  console.log('Demo data ready')
} finally {
  await shareDb.close()
  await context.close()
}
