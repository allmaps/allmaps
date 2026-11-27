import { describe, expect, it, vi } from 'vitest'
import { sourceFromUrl } from '../src/lib/shared/source.js'

import {
  changeStarredItem,
  getStarredList,
  getStarredResource,
  matchesResource
} from '../src/lib/shared/starred.js'
import {
  getStarredOpenAllHref,
  viewerHref
} from '../src/lib/shared/starred-dialog.js'

const urls = {
  restBaseUrl: 'https://api.example.test',
  annotationsBaseUrl: 'https://annotations.example.test',
  viewerPath: '/'
}

const listUrl = urls.annotationsBaseUrl + '/@reader/lists/abc123'
const exportUrl = listUrl + '/georeference-annotations?edition=1&lang=en'
const collection = {
  georeferenceAnnotations: exportUrl,
  type: 'AnnotationCollection',
  id: listUrl,
  label: 'Starred',
  first: {
    items: [0, 2].map((count) => ({
      id: listUrl + '#' + count,
      created: '2026-01-01T00:00:00.000Z',
      allmapsUrl: urls.annotationsBaseUrl + '/manifests/abc' + count,
      georeferencedMapCount: count,
      target: {
        id: 'https://example.test/manifest/' + count,
        'dcterms:title': 'Atlas ' + count,
        imageService: 'https://example.test/image/' + count
      }
    }))
  }
}

describe('Viewer Starred lists', () => {
  it('uses the supplied export URL when at least one bookmark has maps', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json([
          { id: 'abc123', url: listUrl, name: 'Starred', deletable: false }
        ])
      )
      .mockResolvedValueOnce(Response.json(collection))
    vi.stubGlobal('fetch', fetchMock)
    try {
      const { signal } = new AbortController()
      const list = await getStarredList(
        urls.annotationsBaseUrl,
        'reader',
        signal
      )
      expect(list?.georeferenceAnnotations).toBe(exportUrl)
      expect(getStarredOpenAllHref(list, '/')).toBe(viewerHref('/', exportUrl))
      expect(
        getStarredOpenAllHref({ ...list!, items: [list!.items[0]] }, '/')
      ).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('matches a canonical map across revisions and a versioned map by checksum', () => {
    const source = {
      sourceType: 'url' as const,
      url: `${urls.annotationsBaseUrl}/maps/a1234@b5678`,
      hash: 'hash',
      data: {},
      parsed: { type: 'annotation' as const, maps: [] }
    }
    const version = getStarredResource(source, urls.annotationsBaseUrl)
    expect(version).toEqual({ type: 'map', id: 'a1234', checksum: 'b5678' })
    const item = {
      resource: { type: 'map', id: 'a1234', checksum: 'abc123' } as const
    }
    expect(matchesResource(item.resource, { type: 'map', id: 'a1234' })).toBe(
      true
    )
    expect(
      matchesResource(item.resource, {
        type: 'map',
        id: 'a1234',
        checksum: 'b5678'
      })
    ).toBe(false)
    expect(
      matchesResource(item.resource, {
        type: 'map',
        id: 'a1234',
        checksum: 'abc123'
      })
    ).toBe(true)
    for (const origin of [
      urls.restBaseUrl,
      'https://annotations.allmaps.org',
      'https://api.allmaps.org',
      'https://elsewhere.test'
    ]) {
      expect(
        getStarredResource(
          { ...source, url: origin + '/maps/a1234' },
          urls.annotationsBaseUrl
        )
      ).toBeUndefined()
    }
  })

  it('saves a revision with credentials and removes only that revision', async () => {
    const item = {
      ...collection.first.items[0],
      resource: { type: 'map', id: 'a1234', checksum: 'abc123' } as const
    }
    const list = {
      id: 'starred',
      name: 'Starred',
      georeferenceAnnotations: exportUrl,
      items: [item]
    }
    const target = { type: 'map' as const, id: 'a1234', checksum: 'b5678' }
    const bookmark = {
      ...collection.first.items[1],
      allmapsUrl: urls.annotationsBaseUrl + '/maps/a1234@b5678',
      created: '2026-01-02T00:00:00.000Z'
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ bookmark, mapChecksum: target.checksum })
      )
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(
        Response.json({ error: 'List is full' }, { status: 409 })
      )
    vi.stubGlobal('fetch', fetchMock)
    try {
      const { signal } = new AbortController()
      const items = await changeStarredItem(
        urls.restBaseUrl,
        urls.annotationsBaseUrl,
        list,
        target,
        true,
        signal
      )
      expect(items).toEqual([{ ...bookmark, resource: target }, item])
      expect(
        await changeStarredItem(
          urls.restBaseUrl,
          urls.annotationsBaseUrl,
          { ...list, items },
          target,
          false,
          signal
        )
      ).toEqual([item])
      expect(fetchMock.mock.calls).toEqual([
        [
          `${urls.restBaseUrl}/lists/starred/items/url`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: `${urls.annotationsBaseUrl}/maps/a1234@b5678`
            }),
            signal
          }
        ],
        [
          `${urls.restBaseUrl}/lists/starred/items?mapId=a1234&mapChecksum=b5678`,
          {
            method: 'DELETE',
            credentials: 'include',
            signal
          }
        ]
      ])
      await expect(
        changeStarredItem(
          urls.restBaseUrl,
          urls.annotationsBaseUrl,
          list,
          target,
          true,
          signal
        )
      ).rejects.toThrow('Starred is full.')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('loads a titled list export in one request', async () => {
    const annotation = (
      await import('../../../packages/annotation/examples/annotation.example.json')
    ).default
    const fetch = vi.fn().mockResolvedValueOnce(
      Response.json({
        type: 'AnnotationPage',
        id: exportUrl,
        label: 'My historical maps',
        items: [annotation]
      })
    )
    const source = await sourceFromUrl(
      urls.annotationsBaseUrl,
      exportUrl,
      fetch
    )
    expect(source.parsed).toMatchObject({
      type: 'annotation',
      label: 'My historical maps',
      maps: [expect.anything()]
    })
    expect(fetch.mock.calls).toEqual([[exportUrl]])
  })

  it('reports an empty list export and preserves HTTP errors for missing exports', async () => {
    for (const [status, expected] of [
      [
        204,
        {
          code: 'list-without-maps',
          message: 'This list has no georeferenced maps.'
        }
      ],
      [404, { status: 404 }]
    ] as const) {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status }))
      await expect(
        sourceFromUrl(urls.annotationsBaseUrl, exportUrl, fetch)
      ).rejects.toMatchObject(expected)
      expect(fetch.mock.calls).toEqual([[exportUrl]])
    }
  })
})
