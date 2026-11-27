import { describe, expect, it, vi } from 'vitest'
import { sourceFromUrl } from '../src/lib/shared/source.js'

import { getStarredList } from '../src/lib/shared/starred.js'
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
