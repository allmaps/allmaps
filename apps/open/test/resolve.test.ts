import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { generateId } from '@allmaps/id'

import { resolveResource } from '../src/lib/resolve.ts'
import { getResourcePreview } from '../src/lib/preview.ts'

import type { ResourcePreview } from '../src/lib/preview.ts'

const restBaseUrl = 'https://api.example.org'
const annotationsBaseUrl = 'https://annotations.example.org'
const manifestUrl = 'https://publisher.example.org/manifest'
const imageServiceId = 'https://publisher.example.org/image'
const annotationPageId = manifestUrl + '/georeferencing'
const manifestStatusUrl =
  restBaseUrl +
  '/manifests/' +
  (await generateId(manifestUrl)) +
  '/georeferenced'
const imageStatusUrl =
  restBaseUrl +
  '/images/' +
  (await generateId(imageServiceId)) +
  '/georeferenced'
const annotation = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/annotation/test/input/annotation.parse-generate.json',
      import.meta.url
    ),
    'utf8'
  )
)
const imageInfo = {
  id: imageServiceId,
  type: 'ImageService3',
  protocol: 'http://iiif.io/api/image',
  profile: 'level1',
  width: 100,
  height: 100
}

function manifest(annotations: object[] = []) {
  return {
    id: manifestUrl,
    type: 'Manifest',
    items: [
      {
        id: manifestUrl + '/canvas',
        type: 'Canvas',
        width: 100,
        height: 100,
        annotations,
        items: [
          {
            id: manifestUrl + '/painting',
            type: 'AnnotationPage',
            items: [
              {
                type: 'Annotation',
                body: { type: 'Image', service: [imageInfo] }
              }
            ]
          }
        ]
      }
    ]
  }
}

async function lookup(url: string, responses: Record<string, unknown>) {
  const requests: string[] = []
  let preview: ResourcePreview | undefined
  const fetchResource: typeof fetch = async (input) => {
    const href = String(input)
    requests.push(href)
    if (!(href in responses)) return new Response(null, { status: 404 })
    return Response.json(responses[href])
  }
  const result = await resolveResource(new URL(url), {
    restBaseUrl,
    annotationsBaseUrl,
    signal: AbortSignal.timeout(1000),
    fetchResource,
    onResource: (resource) => {
      preview = getResourcePreview(resource)
    }
  })

  return { result, requests, preview }
}

test('uses the canonical manifest ID and opens covered manifests in Allmaps Viewer', async () => {
  const alias = manifestUrl + '?alias=1'
  const updatedAt = '2026-11-15T12:00:00.000Z'

  for (const [georeferencedCanvasCount, status] of [
    [1, 'partly'],
    [2, 'georeferenced']
  ] as const) {
    const { result, requests } = await lookup(alias, {
      [alias]: manifest(),
      [manifestStatusUrl]: {
        canvasCount: 2,
        georeferencedCanvasCount,
        georeferencingUpdatedAt: updatedAt
      }
    })

    assert.deepEqual(requests, [alias, manifestStatusUrl])
    assert.deepEqual(result, {
      state: 'ready',
      georeferencing: { status, updatedAt },
      handoff: {
        destination: 'viewer',
        source: manifestStatusUrl
          .replace(restBaseUrl, annotationsBaseUrl)
          .replace('/georeferenced', '')
      }
    })
  }
})

test('recognizes a valid linked canvas annotation when Allmaps has no maps', async () => {
  const { result } = await lookup(manifestUrl, {
    [manifestUrl]: manifest([{ id: annotationPageId, type: 'AnnotationPage' }]),
    [manifestStatusUrl]: { canvasCount: 1, georeferencedCanvasCount: 0 },
    [annotationPageId]: {
      id: annotationPageId,
      type: 'AnnotationPage',
      items: [annotation]
    }
  })

  assert.deepEqual(result, {
    state: 'ready',
    handoff: { destination: 'viewer', source: manifestUrl },
    georeferencing: { status: 'contains-georeferencing' }
  })
})

test('a failed linked annotation check keeps the outcome uncertain', async () => {
  const { result } = await lookup(manifestUrl, {
    [manifestUrl]: manifest([{ id: annotationPageId, type: 'AnnotationPage' }]),
    [manifestStatusUrl]: { canvasCount: 1, georeferencedCanvasCount: 0 }
  })

  assert.deepEqual(result, { state: 'unknown', source: manifestUrl })
})

test('manifest coverage must be known to automatically open Allmaps Editor', async () => {
  const unknown = { state: 'unknown', source: manifestUrl }
  const editor = {
    state: 'ready',
    handoff: { destination: 'editor', source: manifestUrl },
    georeferencing: { status: 'not-georeferenced' }
  }
  for (const [coverage, expected] of [
    [{}, unknown],
    [{ canvasCount: 1, georeferencedCanvasCount: 2 }, unknown],
    [{ canvasCount: 1, georeferencedCanvasCount: 0 }, editor],
    [{ canvasCount: 0, georeferencedCanvasCount: 0 }, editor],
    [{ canvasCount: null, georeferencedCanvasCount: 0 }, editor]
  ] as const) {
    const { result } = await lookup(manifestUrl, {
      [manifestUrl]: manifest(),
      [manifestStatusUrl]: coverage
    })

    assert.deepEqual(result, expected)
  }
})

test('falls back to info.json for an image service ID', async () => {
  const infoUrl = imageServiceId + '/info.json'
  const { result, requests } = await lookup(imageServiceId, {
    [infoUrl]: imageInfo,
    [imageStatusUrl]: { georeferenced: false }
  })

  assert.deepEqual(requests, [imageServiceId, infoUrl, imageStatusUrl])
  assert.deepEqual(result, {
    state: 'ready',
    handoff: { destination: 'editor', source: infoUrl },
    georeferencing: { status: 'not-georeferenced' }
  })
})

test('a failed publisher lookup returns the original URL', async () => {
  const { result } = await lookup(manifestUrl, {})
  assert.deepEqual(result, { state: 'unknown', source: manifestUrl })
})

test('identifies standalone canvases and collections', async () => {
  for (const type of ['Canvas', 'Collection']) {
    const { result, requests } = await lookup(manifestUrl, {
      [manifestUrl]: { id: manifestUrl, type, items: [] }
    })

    assert.deepEqual(result, { state: 'unsupported' })
    assert.deepEqual(requests, [manifestUrl])
  }
})

test('previews the manifest title without additional requests', async () => {
  const resource = {
    ...manifest(),
    label: { en: ['Historic map'] }
  }
  const { result, requests, preview } = await lookup(manifestUrl, {
    [manifestUrl]: resource
  })

  assert.equal(result.state, 'unknown')
  assert.deepEqual(requests, [manifestUrl, manifestStatusUrl])
  assert.equal(preview?.title, 'Historic map')
  assert.equal(preview?.imageCount, 1)
  assert.equal(
    preview?.imageUrl,
    imageServiceId + '/full/100,100/0/default.jpg'
  )
  assert.equal(preview?.resourceUrl, manifestUrl)
})

test('previews an image from the already loaded info.json', async () => {
  const infoUrl = imageServiceId + '/info.json'
  const { requests, preview } = await lookup(infoUrl, {
    [infoUrl]: imageInfo,
    [imageStatusUrl]: { georeferenced: false }
  })

  assert.deepEqual(requests, [infoUrl, imageStatusUrl])
  assert.equal(preview?.resourceType, 'image')
  assert.equal(
    preview?.imageUrl,
    imageServiceId + '/full/100,100/0/default.jpg'
  )
  assert.equal(preview?.resourceUrl, imageServiceId)
})
