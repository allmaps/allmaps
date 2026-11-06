import { describe, expect, it } from 'vitest'
import { createRequestDatabase } from '../../../packages/db/src/request.ts'

describe('request database isolation', () => {
  class Database {
    readonly id: string
    constructor(id: string) {
      this.id = id
    }
    query = { value: () => this.id }
    identity() {
      return this.id
    }
    async transaction(operation: (id: string) => Promise<string>) {
      return operation(this.id)
    }
  }

  it('isolates overlapping requests across awaits and transaction callbacks', async () => {
    const scope = createRequestDatabase<Database>()
    const firstStarted = Promise.withResolvers<void>()
    const secondStarted = Promise.withResolvers<void>()
    const first = scope.run(new Database('first'), async () => {
      firstStarted.resolve()
      await secondStarted.promise
      expect(scope.db.identity()).toBe('first')
      return scope.db.transaction(async (id) => {
        await Promise.resolve()
        expect(scope.db.query.value()).toBe(id)
        return id
      })
    })
    const second = scope.run(new Database('second'), async () => {
      await firstStarted.promise
      secondStarted.resolve()
      expect(scope.db.identity()).toBe('second')
      await first
      return scope.db.query.value()
    })
    expect(await Promise.all([first, second])).toEqual(['first', 'second'])
    expect(() => scope.db.identity()).toThrow(
      'Database access outside a request'
    )
  })

  it('restores the surrounding context after nested and failing operations', async () => {
    const scope = createRequestDatabase<Database>()
    await scope.run(new Database('outer'), async () => {
      await expect(
        scope.run(new Database('inner'), async () => {
          await Promise.resolve()
          expect(scope.db.identity()).toBe('inner')
          throw new Error('query failed')
        })
      ).rejects.toThrow('query failed')
      expect(scope.db.identity()).toBe('outer')
    })
    expect(() => scope.db.query).toThrow('Database access outside a request')
  })
})
