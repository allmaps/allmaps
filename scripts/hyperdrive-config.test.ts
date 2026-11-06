import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  hyperdriveTarget,
  readWorkerConfiguration,
  verifyHyperdriveTargets
} from './hyperdrive-config.ts'

const id = '1'.repeat(32)
const target = { workerName: 'rest-develop', id }
const options = {
  accountId: 'account',
  token: 'test-token',
  databaseUrl: 'postgresql://migration:secret@database.invalid/maps'
}
const origin = {
  scheme: 'postgres',
  host: 'database.invalid',
  database: 'maps',
  port: 5432,
  user: 'api-role'
}
const response = (result: unknown) => Response.json({ success: true, result })
const valid = { id, origin, caching: { disabled: true } }

test('reads JSONC without inheriting production bindings into other environments', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'allmaps-hyperdrive-config-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const path = join(directory, 'wrangler.jsonc')
  writeFileSync(
    path,
    `{
    // Production configuration must not leak into dev.
    "name": "rest",
    "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "${id}" }],
    "env": { "dev": { "name": "rest-develop", }, },
  }`
  )
  for (const input of [path, pathToFileURL(path)]) {
    const config = readWorkerConfiguration(input)
    assert.deepEqual(hyperdriveTarget(config), { workerName: 'rest', id })
    assert.throws(() => hyperdriveTarget(config, 'dev'), /real HYPERDRIVE ID/)
  }
  writeFileSync(path, '{ "name": invalid }')
  assert.throws(() => readWorkerConfiguration(path))
})

test('environment selection never inherits a production binding', () => {
  const config = {
    name: 'rest',
    hyperdrive: [{ binding: 'HYPERDRIVE', id }],
    env: { dev: { name: 'rest-develop' } }
  }
  assert.deepEqual(hyperdriveTarget(config), { workerName: 'rest', id })
  assert.throws(() => hyperdriveTarget(config, 'dev'), /real HYPERDRIVE ID/)
  assert.throws(() => hyperdriveTarget(config, 'missing'), /real HYPERDRIVE ID/)
  for (const badId of [undefined, '', '0'.repeat(32), 'not-an-id']) {
    assert.throws(
      () =>
        hyperdriveTarget({
          name: 'rest',
          // @ts-expect-error Raw JSONC can omit a required binding ID.
          hyperdrive: [{ binding: 'HYPERDRIVE', id: badId }]
        }),
      /real HYPERDRIVE ID/
    )
  }
  assert.throws(
    () =>
      hyperdriveTarget({
        name: 'rest',
        hyperdrive: [
          { binding: 'HYPERDRIVE', id },
          { binding: 'HYPERDRIVE', id }
        ]
      }),
    /real HYPERDRIVE ID/
  )
})

test('verification allows a dedicated API role and reads a shared configuration only once', async () => {
  const urls: string[] = []
  await verifyHyperdriveTargets(
    [target, { ...target, workerName: 'annotations-develop' }],
    options,
    async (input, init) => {
      urls.push(String(input))
      assert.equal(
        new Headers(init?.headers).get('Authorization'),
        'Bearer test-token'
      )
      return response(valid)
    }
  )
  assert.deepEqual(urls, [
    `https://api.cloudflare.com/client/v4/accounts/account/hyperdrive/configs/${id}`
  ])
})

test('missing or enabled SQL caching and every origin mismatch fail closed', async () => {
  for (const result of [
    { ...valid, caching: undefined },
    { ...valid, caching: { disabled: false } },
    { ...valid, caching: { disabled: 'true' } },
    { ...valid, id: '2'.repeat(32) },
    ...[
      { host: 'other.invalid' },
      { database: 'other' },
      { port: 5433 },
      { scheme: 'mysql' },
      { port: undefined }
    ].map((change) => ({ ...valid, origin: { ...origin, ...change } }))
  ]) {
    await assert.rejects(
      verifyHyperdriveTargets([target], options, async () => response(result)),
      /caching must be disabled|origin does not match|selected Hyperdrive/
    )
  }
})

test('permission failures and malformed API responses prevent release', async () => {
  for (const result of [
    new Response('denied', { status: 403 }),
    Response.json({ success: false }),
    Response.json(null)
  ]) {
    await assert.rejects(
      verifyHyperdriveTargets([target], options, async () => result),
      /HTTP 403|selected Hyperdrive/
    )
  }
})

test('invalid or pooled migration URLs fail before requests without exposing credentials', async () => {
  for (const databaseUrl of [
    'invalid-secret',
    'https://user:secret@database.invalid/maps',
    'postgres://user:secret@ep-test-pooler.eu-central-1.aws.neon.tech/maps',
    'postgres://user:secret@database.invalid/',
    'postgres://user:secret@database.invalid/maps?host=other.invalid'
  ]) {
    await assert.rejects(
      verifyHyperdriveTargets([target], { ...options, databaseUrl }, async () =>
        assert.fail('must not request')
      ),
      (error: Error) => {
        assert.match(error.message, /direct PostgreSQL/)
        assert.doesNotMatch(error.message, /secret|postgres:\/\//)
        return true
      }
    )
  }
})
