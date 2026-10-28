import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getResourceIds } from '../src/lib/iiif-ids.ts'

function fixture(name) {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/iiif-parser/test/input/${name}`,
        import.meta.url
      ),
      'utf8'
    )
  )
}

test('IIIF 2: includes all map images and hashes service IDs, not image requests', () => {
  const resources = getResourceIds(
    fixture('manifest.2.gallica.bnf.12148.btv1b53243704g.f1.json')
  )
  assert.equal(resources.filter(({ type }) => type === 'canvas').length, 5)
  assert.equal(resources.filter(({ type }) => type === 'image').length, 5)
  assert.equal(
    resources[2].uri,
    'https://gallica.bnf.fr/iiif/ark:/12148/btv1b53243704g/f70'
  )
  assert.equal(resources[2].allmapsId, 'f3393357245b5af6')
  for (const resource of resources) {
    assert.equal(
      resource.hash,
      createHash('sha1').update(resource.uri).digest('hex')
    )
  }
})

test('IIIF 3: includes Manifest, Canvas and image service IDs', () => {
  const resources = getResourceIds(
    fixture('manifest.3.ncsu-unccmc00094-002-ff0001_1-002-004_0001.json')
  )
  assert.deepEqual(
    resources.map(({ type }) => type),
    ['manifest', 'canvas', 'image']
  )
  assert.equal(
    resources[2].uri,
    'https://iiif.lib.ncsu.edu/iiif/unccmc00094-002-ff0001_1-002-004_0001'
  )
  assert.equal(resources[2].allmapsId, 'b103c475b3fa38cc')
})

test('Collections expose linked Manifest IDs without fetching them', () => {
  const resources = getResourceIds(
    fixture('collection.2.theberlage-river-maps.json')
  )
  assert.equal(resources[0].type, 'collection')
  assert.equal(resources.length, 21)
  assert.ok(resources.slice(1).every(({ type }) => type === 'manifest'))
})

test('Image IDs retain their exact spelling, including trailing slashes', () => {
  const document = fixture('image.2.rp-rtsa-4001-1985-1014-01.json')
  document['@id'] = 'https://example.org/IIIF/café/'
  const [resource] = getResourceIds(document)
  assert.equal(resource.uri, document['@id'])
  assert.equal(
    resource.hash,
    createHash('sha1').update(document['@id']).digest('hex')
  )
  assert.equal(resource.allmapsId.length, 16)
  document['@id'] = document['@id'].slice(0, -1)
  assert.notEqual(getResourceIds(document)[0].allmapsId, resource.allmapsId)
})

test('Rejects documents that are not IIIF resources', () => {
  assert.throws(() =>
    getResourceIds({ id: 'https://example.org/', type: 'WebPage' })
  )
})
