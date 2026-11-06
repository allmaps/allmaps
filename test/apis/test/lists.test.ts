import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestContext, type TestContext } from './helpers/context.ts'

describe('list access and Starred item limits', () => {
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

  it.each(['unauthenticated', 'anonymous'])(
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

  function starredList(slug: string) {
    return context.seedCatalog!.lists.find(
      (list) => list.key === `${slug}-starred`
    )!
  }

  it.each(['local-editor', 'local-member'])(
    'lets %s manage their own Starred items without managing lists',
    async (slug) => {
      const headers = await login(slug)
      const list = starredList(slug)
      const listed = await rest('/lists', { headers })
      expect(listed.status).toBe(200)
      expect(await listed.json()).toEqual([
        expect.objectContaining({
          id: list.id,
          name: 'Starred',
          deletable: false
        })
      ])

      for (const [method, path, body] of [
        ['POST', '/lists', { name: 'Another list' }],
        ['POST', '/lists', { name: 'Starred' }],
        ['PATCH', `/lists/${list.id}`, { name: 'Renamed' }],
        ['DELETE', `/lists/${list.id}`, undefined]
      ] as const) {
        expect(
          (
            await rest(path, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined
            })
          ).status
        ).toBe(401)
      }

      const images = context.seedCatalog!.images.slice(0, 2)
      for (const [index, image] of images.entries()) {
        const response = await rest(
          `/lists/${list.id}/items${index ? '/url' : ''}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(
              index
                ? { url: `https://annotations.allmaps.org/images/${image.id}` }
                : { imageId: image.id }
            )
          }
        )
        expect(response.status).toBe(200)
      }
      const detail = await rest(`/lists/${list.id}`, { headers })
      expect(detail.status).toBe(200)
      expect((await detail.json()).items).toEqual(
        expect.arrayContaining(
          images.map((image) => expect.objectContaining({ imageId: image.id }))
        )
      )
      for (const image of images) {
        expect(
          (
            await rest(`/lists/${list.id}/items?imageId=${image.id}`, {
              method: 'DELETE',
              headers
            })
          ).status
        ).toBe(200)
      }
      const remaining = await rest(`/lists/${list.id}`, { headers })
      expect(
        (await remaining.json()).items.every(
          (item: { imageId: string | null }) =>
            !images.some((image) => image.id === item.imageId)
        )
      ).toBe(true)

      for (const suffix of [
        '',
        `/${list.id}`,
        `/${list.id}/georeference-annotations`
      ]) {
        expect(
          (await annotations(`/@${slug}/lists${suffix}`, headers)).status
        ).toBe(401)
      }
    }
  )

  it('rejects custom lists and other users’ Starred lists for regular users', async () => {
    const headers = await login('local-editor')
    const customList = context.seedCatalog!.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    const imageId = context.seedCatalog!.images[0].id
    for (const list of [
      customList,
      starredList('local-member'),
      starredList('local-admin')
    ]) {
      const before = await context.client.query(
        'SELECT * FROM list_items WHERE list_id = $1',
        [list.id]
      )
      for (const [method, path, body] of [
        ['GET', `/lists/${list.id}`, undefined],
        ['POST', `/lists/${list.id}/items`, { imageId }],
        [
          'POST',
          `/lists/${list.id}/items/url`,
          { url: `https://annotations.allmaps.org/images/${imageId}` }
        ],
        ['DELETE', `/lists/${list.id}/items?imageId=${imageId}`, undefined]
      ] as const) {
        expect(
          (
            await rest(path, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined
            })
          ).status,
          `${method} ${path}`
        ).toBe(404)
      }
      const after = await context.client.query(
        'SELECT * FROM list_items WHERE list_id = $1',
        [list.id]
      )
      expect(after.rows).toEqual(before.rows)
    }
  })

  async function fillList(listId: string, amount: number) {
    await context.client.query(`
      INSERT INTO iiif.images (id, uri)
      SELECT 'starred-limit-' || value, 'https://fixtures.allmaps.test/images/' || value
      FROM generate_series(1, 502) AS value
      ON CONFLICT DO NOTHING
    `)
    await context.client.query('DELETE FROM list_items WHERE list_id = $1', [
      listId
    ])
    await context.client.query(
      `
      INSERT INTO list_items (list_id, image_id)
      SELECT $1, 'starred-limit-' || value FROM generate_series(1, $2::integer) AS value
    `,
      [listId, amount]
    )
  }

  async function itemCount(listId: string) {
    const result = await context.client.query<{ count: number }>(
      'SELECT count(*)::integer AS count FROM list_items WHERE list_id = $1',
      [listId]
    )
    return result.rows[0].count
  }

  it('caps regular users at 500 items across both add routes, including simultaneous requests', async () => {
    const headers = await login('local-member')
    const { id: listId } = starredList('local-member')
    await fillList(listId, 499)
    const responses = await Promise.all([
      rest(`/lists/${listId}/items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageId: 'starred-limit-500' })
      }),
      rest(`/lists/${listId}/items/url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: 'https://annotations.allmaps.org/images/starred-limit-501'
        })
      })
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409
    ])
    expect(await itemCount(listId)).toBe(500)

    for (const suffix of ['', '/url']) {
      const full = await rest(`/lists/${listId}/items${suffix}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          suffix
            ? {
                url: 'https://annotations.allmaps.org/images/starred-limit-502'
              }
            : { imageId: 'starred-limit-502' }
        )
      })
      expect(full.status).toBe(409)
      expect(await full.json()).toMatchObject({
        error: 'List cannot contain more than 500 items'
      })
      const duplicate = await rest(`/lists/${listId}/items${suffix}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          suffix
            ? { url: 'https://annotations.allmaps.org/images/starred-limit-1' }
            : { imageId: 'starred-limit-1' }
        )
      })
      expect(duplicate.status).toBe(200)
    }
    // Every supported resource type uses the same limit.
    const catalog = context.seedCatalog!
    const map = await context.client.query<{
      mapId: string
      mapImageId: string
      mapChecksum: string
      mapVersion: number
    }>(
      `SELECT id AS "mapId", image_id AS "mapImageId", checksum AS "mapChecksum", version AS "mapVersion"
        FROM maps_latest WHERE id = $1`,
      [catalog.maps[0].id]
    )
    for (const [resourceType, resourceId, item] of [
      [
        'canvases',
        catalog.images[0].canvasId,
        { canvasId: catalog.images[0].canvasId }
      ],
      [
        'manifests',
        catalog.manifests[0].id,
        { manifestId: catalog.manifests[0].id }
      ],
      ['maps', catalog.maps[0].id, map.rows[0]]
    ] as const) {
      for (const suffix of ['', '/url']) {
        expect(
          (
            await rest(`/lists/${listId}/items${suffix}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(
                suffix
                  ? {
                      url: `https://annotations.allmaps.org/${resourceType}/${resourceId}`
                    }
                  : item
              )
            })
          ).status
        ).toBe(409)
      }
    }
    expect(await itemCount(listId)).toBe(500)
    expect(
      (
        await rest(`/lists/${listId}/items?imageId=starred-limit-1`, {
          method: 'DELETE',
          headers
        })
      ).status
    ).toBe(200)
    expect(await itemCount(listId)).toBe(499)
    expect(
      (
        await rest(`/lists/${listId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageId: 'starred-limit-502' })
        })
      ).status
    ).toBe(200)
    expect(await itemCount(listId)).toBe(500)
  })

  it('allows removals and duplicates in existing over-limit lists and leaves admins uncapped', async () => {
    for (const slug of ['local-member', 'local-admin']) {
      const headers = await login(slug)
      const { id: listId } = starredList(slug)
      await fillList(listId, 501)
      expect(
        (
          await rest(`/lists/${listId}/items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ imageId: 'starred-limit-1' })
          })
        ).status
      ).toBe(200)
      for (const suffix of ['', '/url']) {
        expect(
          (
            await rest(`/lists/${listId}/items${suffix}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(
                suffix
                  ? {
                      url: 'https://annotations.allmaps.org/images/starred-limit-502'
                    }
                  : { imageId: 'starred-limit-502' }
              )
            })
          ).status
        ).toBe(slug === 'local-admin' ? 200 : 409)
      }
      expect(await itemCount(listId)).toBe(slug === 'local-admin' ? 502 : 501)
      expect(
        (
          await rest(`/lists/${listId}/items?imageId=starred-limit-1`, {
            method: 'DELETE',
            headers
          })
        ).status
      ).toBe(200)
      expect(await itemCount(listId)).toBe(slug === 'local-admin' ? 501 : 500)
    }
  })

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
