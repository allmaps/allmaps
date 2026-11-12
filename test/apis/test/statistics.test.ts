import { describe, it, expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { schema } from '@allmaps/db'
import { queryStatistics } from '@allmaps/api-shared/db'
import { createTestContext } from './helpers/context.ts'

describe('statistics', () => {
  it('restricts access and updates counts when domains or archives change', async () => {
    const context = await createTestContext({ seed: 'demo' })
    try {
      const request = (path: string, headers?: HeadersInit, method = 'GET') =>
        context.rest.handle(
          new Request(`${context.env.PUBLIC_REST_BASE_URL}${path}`, {
            headers,
            method
          })
        )
      const login = async (slug: string) => {
        const response = await request(
          `/__dev/login/${slug}`,
          undefined,
          'POST'
        )
        expect(response.status).toBe(200)
        return {
          Cookie: response.headers
            .getSetCookie()
            .map((cookie) => cookie.split(';')[0])
            .join('; ')
        }
      }
      const [org] = await context.db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.slug, 'demo-amsterdam'))
      expect((await request('/statistics')).status).toBe(401)
      const admin = await login('local-admin')
      const member = await login('local-member')
      const visitor = await login('local-visitor')
      const path = `/organizations/${org.id}/statistics`
      expect((await request('/statistics', admin)).status).toBe(200)
      expect((await request('/statistics', member)).status).toBe(403)
      expect((await request(path, member)).status).toBe(200)
      expect((await request(path, visitor)).status).toBe(403)
      const response = await request(path, admin)
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
      const stats = await response.json()
      expect(stats.images).toBeGreaterThan(0)
      expect(stats.georeferencedImages).toBeLessThanOrEqual(stats.images)
      expect(stats.georeferencedPercentage).toBeGreaterThanOrEqual(0)
      expect(stats.georeferencedPercentage).toBeLessThanOrEqual(100)
      await context.db
        .update(schema.users)
        .set({ role: 'collaborator' })
        .where(eq(schema.users.slug, 'local-visitor'))
      const collaborator = await login('local-visitor')
      expect((await request('/statistics', collaborator)).status).toBe(200)
      expect((await request(path, collaborator)).status).toBe(403)
      expect(
        (await request('/organizations/0000000000000000/statistics', admin))
          .status
      ).toBe(404)
      const before = await queryStatistics(context.db, org.id)
      const [image] = await context.db
        .select()
        .from(schema.images)
        .where(eq(schema.images.domain, 'localhost'))
        .limit(1)
      await context.db
        .update(schema.images)
        .set({ archived: true })
        .where(eq(schema.images.id, image.id))
      const after = await queryStatistics(context.db, org.id)
      expect(after.images).toBe(before.images - 1)
      expect(after.maps).toBeLessThanOrEqual(before.maps)
      await context.db
        .delete(schema.organizationUrls)
        .where(eq(schema.organizationUrls.organizationId, org.id))
      const empty = await queryStatistics(context.db, org.id)
      expect(empty.images).toBe(0)
      expect(empty.manifests).toBe(0)
      expect(empty.georeferencedPercentage).toBeNull()
    } finally {
      await context.close()
    }
  })
})
