import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '../../packages/db/node_modules/@electric-sql/pglite/dist/index.js'

test('domain counts avoid version and manifest-link duplication', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      CREATE SCHEMA iiif;
      CREATE TABLE iiif.images (id text, domain text, archived boolean, created_at timestamptz DEFAULT now());
      CREATE TABLE maps (image_id text, latest boolean, archived boolean, geo_mask text);
      CREATE TABLE iiif.manifests (id text, domain text, created_at timestamptz DEFAULT now());
      CREATE TABLE iiif.canvases_images (canvas_id text, image_id text);
      CREATE TABLE iiif.manifests_canvases (manifest_id text, canvas_id text);
      INSERT INTO iiif.images VALUES ('a','a.org',false),('b','a.org',false),('c','b.org',false),('d','a.org',true);
      INSERT INTO maps VALUES ('a',false,false,'old'),('a',true,false,'one'),('a',true,false,'two'),('b',true,true,'archived'),('c',true,false,NULL),('d',true,false,'hidden');
      INSERT INTO iiif.manifests VALUES ('m1','a.org'),('m2','a.org'),('m3','only-manifests.org');
      INSERT INTO iiif.canvases_images VALUES ('c1','a'),('c2','a');
      INSERT INTO iiif.manifests_canvases VALUES ('m1','c1'),('m2','c2');
    `)
    const query = await readFile(new URL('./by-domain.sql', import.meta.url), 'utf8')
    const { rows } = await db.query(query)
    const a = rows.find(row => row.domain === 'a.org')
    assert.equal(Number(a.images), 2)
    assert.equal(Number(a.maps), 2)
    assert.equal(Number(a.georeferenced_images), 1)
    assert.equal(Number(a.images_without_manifest), 1)
    assert.equal(Number(a.manifests), 2)
    assert.equal(Number(rows.find(row => row.domain === 'only-manifests.org').images), 0)
    const periods = await readFile(new URL('./created-by-period.sql', import.meta.url), 'utf8')
    const result = await db.query(periods, ['day', '2000-01-01', '2100-01-01'])
    assert.equal(result.rows.reduce((sum, row) => sum + Number(row.added), 0), 7)
  } finally {
    await db.close()
  }
})
