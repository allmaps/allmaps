import { describe, expect, it, vi } from 'vitest'
import { getPgContext } from '../../../packages/db/src/db.ts'

describe('pg pool lifetime', () => {
  it('creates isolated lazy pools for each request', async () => {
    const first = getPgContext('postgresql://localhost/unused')
    const second = getPgContext('postgresql://localhost/unused', {
      maxConnections: 5
    })
    try {
      expect(first.db.$client).toBe(first.pool)
      expect(second.db.$client).toBe(second.pool)
      expect(first.pool).not.toBe(second.pool)
      expect(first.pool.options.max).toBe(10)
      expect(second.pool.options.max).toBe(5)
      expect(first.db.$client.totalCount).toBe(0)
      expect(second.db.$client.totalCount).toBe(0)
    } finally {
      await Promise.all([first.close(), second.close()])
    }
  })

  it('handles idle connection errors without exposing connection details', async () => {
    const context = getPgContext('postgresql://localhost/unused')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(() =>
        context.db.$client.emit(
          'error',
          new Error('private connection details')
        )
      ).not.toThrow()
      expect(warning).toHaveBeenCalledExactlyOnceWith(
        'Idle PostgreSQL connection failed'
      )
    } finally {
      warning.mockRestore()
      await context.close()
    }
  })
})
