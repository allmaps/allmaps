import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * A stable database facade for an app compiled once at Worker startup. Every
 * property/method resolves against the current request, never a global client.
 * Both routes and Better Auth must use this facade within run().
 */
export function createRequestDatabase<Database extends object>() {
  const storage = new AsyncLocalStorage<Database>()
  const db = new Proxy({} as Database, {
    get(_target, property) {
      const current = storage.getStore()
      if (!current) throw new Error('Database access outside a request')
      const value = Reflect.get(current, property, current)
      return typeof value === 'function' ? value.bind(current) : value
    }
  })

  return {
    db,
    run<Result>(database: Database, operation: () => Result): Result {
      return storage.run(database, operation)
    }
  }
}
