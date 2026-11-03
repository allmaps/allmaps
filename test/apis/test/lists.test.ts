import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestContext, type TestContext } from './helpers/context.ts'

describe('admin-only list APIs', () => {
  let context: TestContext
  let adminHeaders: Record<string, string>

  const rest = (path: string, init?: RequestInit) =>
    context.rest.handle(
      new Request(`${context.env.PUBLIC_REST_BASE_URL}${path}`, init)
    )

  const annotations = (path: string, headers: Record<string, string>) =>
    context.annotations.handle(
      new Request(`${context.env.PUBLIC_ANNOTATIONS_BASE_URL}${path}`, {
        headers
      })
    )

  function sessionHeaders(response: Response) {
    return {
      Cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; '),
      'Content-Type': 'application/json'
    }
  }

  async function login(slug: string) {
    const response = await rest(`/__dev/login/${slug}`, { method: 'POST' })
    expect(response.status).toBe(200)
    return sessionHeaders(response)
  }

  beforeAll(async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('List API tests must not make network requests')
    })
    context = await createTestContext({ seed: 'demo' })
    adminHeaders = await login('local-admin')
  })

  afterAll(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.each(['unauthenticated', 'anonymous', 'local-editor', 'local-member'])(
    'rejects every list operation for %s users, including their own lists',
    async (role) => {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      let username = role
      let userId: string
      if (role === 'anonymous') {
        const response = await rest('/auth/sign-in/anonymous', {
          method: 'POST',
          headers,
          body: '{}'
        })
        expect(response.status).toBe(200)
        headers = sessionHeaders(response)
        const { user } = await response.json()
        userId = user.id
      } else {
        username = role === 'unauthenticated' ? 'local-editor' : role
        userId = context.seedCatalog!.users.find(
          (user) => user.slug === username
        )!.id
        if (role !== 'unauthenticated') headers = await login(role)
      }
      const lists = await context.client.query<{ id: string }>(
        'SELECT id FROM lists WHERE user_id = $1 AND NOT deletable',
        [userId]
      )
      expect(lists.rows).toHaveLength(1)
      const listId = lists.rows[0].id
      const imageId = context.seedCatalog!.images[0].id
      const requests = [
        { method: 'GET', path: '/lists' },
        { method: 'POST', path: '/lists', body: { name: 'Forbidden' } },
        { method: 'GET', path: `/lists/${listId}` },
        {
          method: 'PATCH',
          path: `/lists/${listId}`,
          body: { name: 'Renamed' }
        },
        { method: 'POST', path: `/lists/${listId}/items`, body: { imageId } },
        {
          method: 'POST',
          path: `/lists/${listId}/items/url`,
          body: { url: `https://annotations.allmaps.org/images/${imageId}` }
        },
        { method: 'DELETE', path: `/lists/${listId}/items?imageId=${imageId}` },
        { method: 'DELETE', path: `/lists/${listId}` }
      ]
      for (const { method, path, body } of requests) {
        const response = await rest(path, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        })
        expect(response.status, `${method} ${path}`).toBe(401)
      }
      for (const suffix of [
        '',
        `/${listId}`,
        `/${listId}/georeference-annotations`
      ]) {
        const path = `/@${username}/lists${suffix}`
        expect((await annotations(path, headers)).status, path).toBe(401)
      }
      const remaining = await context.client.query(
        'SELECT name, deletable FROM lists WHERE id = $1',
        [listId]
      )
      expect(remaining.rows).toEqual([{ name: 'Starred', deletable: false }])
    }
  )

  it('lets admins manage their own custom lists and items', async () => {
    const created = await rest('/lists', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Admin research' })
    })
    expect(created.status).toBe(200)
    const list = await created.json()
    const listed = await rest('/lists', { headers: adminHeaders })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: list.id })])
    )
    const duplicateStarred = await rest(`/lists/${list.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Starred' })
    })
    expect(duplicateStarred.status).toBe(403)
    const renamed = await rest(`/lists/${list.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Renamed research' })
    })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({ name: 'Renamed research' })

    const images = context.seedCatalog!.images.slice(0, 2)
    for (const [index, image] of images.entries()) {
      const response = await rest(
        `/lists/${list.id}/items${index ? '/url' : ''}`,
        {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(
            index
              ? { url: `https://annotations.allmaps.org/images/${image.id}` }
              : { imageId: image.id }
          )
        }
      )
      expect(response.status).toBe(200)
    }
    const detail = await rest(`/lists/${list.id}`, { headers: adminHeaders })
    expect(detail.status).toBe(200)
    expect((await detail.json()).items).toHaveLength(2)
    for (const image of images) {
      const response = await rest(
        `/lists/${list.id}/items?imageId=${image.id}`,
        {
          method: 'DELETE',
          headers: adminHeaders
        }
      )
      expect(response.status).toBe(200)
    }
    expect(
      (
        await rest(`/lists/${list.id}`, {
          method: 'DELETE',
          headers: adminHeaders
        })
      ).status
    ).toBe(200)
    expect(
      (await rest(`/lists/${list.id}`, { headers: adminHeaders })).status
    ).toBe(404)
  })

  it('keeps exactly one protected Starred list for admins', async () => {
    const list = context.seedCatalog!.lists.find(
      (list) => list.key === 'local-admin-starred'
    )!
    for (const name of ['Starred', ' starred ']) {
      expect(
        (
          await rest('/lists', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({ name })
          })
        ).status
      ).toBe(403)
    }
    expect(
      (
        await rest(`/lists/${list.id}`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({ name: 'Renamed' })
        })
      ).status
    ).toBe(403)
    expect(
      (
        await rest(`/lists/${list.id}`, {
          method: 'DELETE',
          headers: adminHeaders
        })
      ).status
    ).toBe(403)
    const lists = await rest('/lists', { headers: adminHeaders })
    expect(await lists.json()).toEqual([
      expect.objectContaining({
        id: list.id,
        name: 'Starred',
        deletable: false
      })
    ])
  })

  it('allows admins to read user annotations while retaining REST ownership checks', async () => {
    const list = context.seedCatalog!.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    for (const suffix of [
      '',
      `/${list.id}`,
      `/${list.id}/georeference-annotations`
    ]) {
      expect(
        (await annotations(`/@local-editor/lists${suffix}`, adminHeaders))
          .status
      ).toBe(200)
    }
    expect(
      (await rest(`/lists/${list.id}`, { headers: adminHeaders })).status
    ).toBe(404)
  })
})
