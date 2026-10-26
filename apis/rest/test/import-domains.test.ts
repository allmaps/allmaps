import { afterEach, expect, test, vi } from 'vitest'
import type { Db } from '@allmaps/db'
import {
  createImageFromUrl,
  createManifestFromUrl
} from '@allmaps/api-shared/db'

afterEach(() => vi.unstubAllGlobals())
const options = {
  allowedUrlDomains: ['iiif.example'],
  allowedParsedUriDomains: ['iiif.example']
}
test.each([createImageFromUrl, createManifestFromUrl])(
  'rejects a URL outside organization domains before fetching',
  async (create) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(
      create({} as Db, 'https://foreign.example/resource', options)
    ).rejects.toMatchObject({ status: 403 })
    expect(fetch).not.toHaveBeenCalled()
  }
)
function manifest(domain: 'manifest' | 'canvas' | 'image' | null) {
  const url = (kind: string) =>
    `https://${domain === kind ? 'foreign.example' : 'iiif.example'}/${kind}`
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: url('manifest'),
    type: 'Manifest',
    label: { en: ['Map'] },
    items: [
      {
        id: url('canvas'),
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: url('page'),
            type: 'AnnotationPage',
            items: [
              {
                id: url('annotation'),
                type: 'Annotation',
                motivation: 'painting',
                target: url('canvas'),
                body: {
                  id: url('pixels'),
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 1000,
                  height: 1000,
                  service: [
                    {
                      id: url('image'),
                      type: 'ImageService3',
                      profile: 'level2'
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
test.each(['manifest', 'canvas', 'image'] as const)(
  'an allowed manifest URL cannot overwrite a foreign %s',
  async (domain) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(manifest(domain)))
    )
    const transaction = vi.fn()
    await expect(
      createManifestFromUrl(
        { transaction } as unknown as Db,
        'https://iiif.example/manifest',
        options
      )
    ).rejects.toMatchObject({ status: 403 })
    expect(transaction).not.toHaveBeenCalled()
  }
)
test('a manifest whose resources match organization domains reaches the database', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(manifest(null)))
  )
  const transaction = vi.fn(async () => undefined)
  await createManifestFromUrl(
    { transaction } as unknown as Db,
    'https://iiif.example/manifest',
    options
  )
  expect(transaction).toHaveBeenCalledOnce()
})
