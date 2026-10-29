import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  checkHealth,
  deploy as deployRelease,
  preflight as preflightRelease,
  releaseTarget,
  waitForRailway
} from './api-release.ts'

const sha = 'a'.repeat(40)
const environment = {
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REF: 'refs/heads/develop',
  GITHUB_SHA: sha,
  GITHUB_REPOSITORY: 'allmaps/allmaps',
  GITHUB_TOKEN: 'test-github-token',
  DATABASE_URL: 'postgresql://test:unused@database.invalid/test',
  CLOUDFLARE_ACCOUNT_ID: 'test-account',
  CLOUDFLARE_API_TOKEN: 'test-cloudflare-token',
  RAILWAY_PROJECT_ID: 'test-project',
  RAILWAY_ENVIRONMENT_ID: 'test-environment',
  RAILWAY_SERVICE_ID: 'test-service',
  RAILWAY_TOKEN: 'test-railway-token'
}
const noSleep = async () => {}
const developmentHyperdriveId = '1'.repeat(32)
const productionHyperdriveId = '2'.repeat(32)
const readFixtureConfig = (api: 'rest' | 'annotations') => ({
  name: api,
  hyperdrive: [{ binding: 'HYPERDRIVE', id: productionHyperdriveId }],
  env: {
    dev: {
      name: `${api}-develop`,
      hyperdrive: [{ binding: 'HYPERDRIVE', id: developmentHyperdriveId }]
    }
  }
})
const preflight: typeof preflightRelease = (
  env,
  request,
  config = readFixtureConfig
) => preflightRelease(env, request, config)
const deploy: typeof deployRelease = (
  env,
  command,
  request,
  sleep,
  config = readFixtureConfig
) => deployRelease(env, command, request, sleep, config)

test('CI migration runs directly from TypeScript and fails before connecting without a URL', () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL('../packages/db/src/migrate-ci.ts', import.meta.url)
      )
    ],
    { env: { CI: 'true', DATABASE_URL: '' }, encoding: 'utf8', timeout: 10_000 }
  )
  assert.equal(result.status, 1)
  assert.match(
    result.stderr,
    /Set DATABASE_URL to a direct PostgreSQL connection URL/
  )
  assert.doesNotMatch(
    result.stderr,
    /ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION/
  )
})

const success: typeof fetch = async (input, options) => {
  const url = String(input)
  if (url.includes('backboard.railway.com')) {
    assert.equal(
      (options?.headers as Record<string, string>)['Project-Access-Token'],
      environment.RAILWAY_TOKEN
    )
    const { query, variables } = JSON.parse(String(options?.body))
    return Response.json({
      data: query.includes('projectToken')
        ? {
            serviceInstance: { id: 'test-service-instance' },
            projectToken: {
              projectId: 'test-project',
              environmentId: 'test-environment'
            }
          }
        : { deployment: { id: variables.id, status: 'SUCCESS' } }
    })
  }
  if (url.includes('/hyperdrive/configs/')) {
    return Response.json({
      success: true,
      result: {
        id: url.split('/').at(-1),
        caching: { disabled: true },
        origin: {
          scheme: 'postgres',
          host: 'database.invalid',
          port: 5432,
          database: 'test'
        }
      }
    })
  }
  if (url.includes('api.cloudflare.com'))
    return Response.json({ success: true, result: { bindings: [] } })
  if (url.includes('api.github.com')) return Response.json({ object: { sha } })
  return Response.json({ version: 'test-version' })
}

test('only branch pushes and manual branch releases can select deployment targets', () => {
  assert.deepEqual(releaseTarget(environment).workers, [
    'rest-develop',
    'annotations-develop'
  ])
  assert.deepEqual(
    releaseTarget({ ...environment, GITHUB_REF: 'refs/heads/main' }).workers,
    ['rest', 'annotations']
  )
  for (const ref of [
    'refs/heads/auto-migrate',
    'refs/tags/main',
    'refs/pull/1/merge'
  ])
    assert.throws(
      () => releaseTarget({ ...environment, GITHUB_REF: ref }),
      /only support/
    )
  assert.throws(
    () => releaseTarget({ ...environment, GITHUB_EVENT_NAME: 'pull_request' }),
    /require a push/
  )
  assert.throws(
    () => releaseTarget({ ...environment, GITHUB_SHA: 'main' }),
    /Invalid GITHUB_SHA/
  )
})

test('preflight checks credentials, target Workers, Railway token scope and the current head', async () => {
  const urls: string[] = []
  await preflight(environment, async (url, options) => {
    urls.push(String(url))
    return success(url, options)
  })
  assert.ok(urls.some((url) => url.includes('/rest-develop/settings')))
  assert.ok(urls.some((url) => url.includes('/annotations-develop/settings')))
  assert.ok(urls.at(-1)?.endsWith('/git/ref/heads/develop'))
  await assert.rejects(
    preflight({ ...environment, RAILWAY_SERVICE_ID: '' }, success),
    /Missing RAILWAY_SERVICE_ID/
  )
  await assert.rejects(
    preflight(environment, async (url, options) =>
      String(url).includes('api.github.com')
        ? Response.json({ object: { sha: 'b'.repeat(40) } })
        : success(url, options)
    ),
    /release is stale/
  )
  await assert.rejects(
    preflight(
      { ...environment, RAILWAY_ENVIRONMENT_ID: 'wrong-environment' },
      success
    ),
    /does not match/
  )
  await assert.rejects(
    preflight(environment, async (url, options) =>
      String(url).endsWith('/settings')
        ? Response.json({ success: false })
        : success(url, options)
    ),
    /must exist before release/
  )
})

for (const branch of ['develop', 'main']) {
  test(`${branch} deploy uses the checkout, selects the right Workers and waits for the submitted Railway deployment`, async () => {
    const commands: string[][] = []
    const polledIds: string[] = []
    const healthUrls: string[] = []
    await deploy(
      {
        ...environment,
        GITHUB_REF: `refs/heads/${branch}`
      },
      async (args) => {
        commands.push(args)
        return args.includes('up')
          ? JSON.stringify({ deploymentId: 'submitted-deployment' })
          : ''
      },
      async (url, options) => {
        if (String(url).includes('backboard.railway.com'))
          polledIds.push(JSON.parse(String(options?.body)).variables.id)
        else if (!String(url).includes('api.cloudflare.com'))
          healthUrls.push(String(url))
        return success(url, options)
      },
      noSleep
    )
    assert.equal(commands.length, 3)
    assert.ok(commands[0].includes('@allmaps/api-rest'))
    assert.ok(commands[1].includes('@allmaps/api-annotations'))
    for (const command of commands.slice(0, 2)) {
      assert.ok(command.includes('--keep-vars'))
      assert.equal(
        command[command.indexOf('--env') + 1],
        branch === 'develop' ? 'dev' : ''
      )
    }
    assert.ok(commands[2].includes('@railway/cli@5.71.0'))
    assert.ok(commands[2].includes(`Allmaps ${branch} ${sha}`))
    assert.ok(commands[2].includes('--project'))
    assert.ok(commands[2].includes('--environment'))
    assert.ok(commands[2].includes('--service'))
    assert.deepEqual(polledIds, ['submitted-deployment'])
    assert.equal(healthUrls.length, 3)
    assert.ok(
      healthUrls.every(
        (url) => url.includes('https://dev.') === (branch === 'develop')
      )
    )
  })
}

test('failed Worker deployment stops the release before uploading to Railway', async () => {
  let commands = 0
  await assert.rejects(
    deploy(
      environment,
      async () => {
        commands++
        throw new Error('Worker deploy failed')
      },
      success,
      noSleep
    ),
    /Worker deploy failed/
  )
  assert.equal(commands, 1)
})

test('missing release configuration fails before any deploy command', async () => {
  await assert.rejects(
    deploy(
      { ...environment, RAILWAY_TOKEN: '' },
      async () => {
        assert.fail('must not deploy')
      },
      success,
      noSleep
    ),
    /Missing RAILWAY_TOKEN/
  )
})

test('Railway build completion alone does not finish the release', async () => {
  let requests = 0
  const delays: number[] = []
  await waitForRailway(
    environment.RAILWAY_TOKEN,
    'submitted',
    async () =>
      Response.json({
        data: {
          deployment: {
            id: 'submitted',
            status: ++requests === 1 ? 'DEPLOYING' : 'SUCCESS'
          }
        }
      }),
    async (delay) => {
      delays.push(delay)
    }
  )
  assert.equal(requests, 2)
  assert.deepEqual(delays, [15_000])
})

test('Railway failures, GraphQL errors, mismatched IDs and timeouts cannot report success', async () => {
  for (const status of [
    'FAILED',
    'CRASHED',
    'REMOVED',
    'SKIPPED',
    'NEEDS_APPROVAL'
  ]) {
    await assert.rejects(
      waitForRailway(
        environment.RAILWAY_TOKEN,
        'submitted',
        async () =>
          Response.json({ data: { deployment: { id: 'submitted', status } } }),
        noSleep
      ),
      new RegExp(status)
    )
  }
  await assert.rejects(
    waitForRailway(
      environment.RAILWAY_TOKEN,
      'submitted',
      async () =>
        Response.json({
          data: { deployment: { id: 'another', status: 'SUCCESS' } }
        }),
      noSleep
    ),
    /submitted deployment/
  )
  await assert.rejects(
    waitForRailway(
      environment.RAILWAY_TOKEN,
      'submitted',
      async () => Response.json({ errors: [{ message: 'denied' }] }),
      noSleep
    ),
    /could not verify/
  )
  await assert.rejects(
    waitForRailway(
      environment.RAILWAY_TOKEN,
      'submitted',
      async () =>
        Response.json({
          data: { deployment: { id: 'submitted', status: 'BUILDING' } }
        }),
      noSleep,
      2
    ),
    /Timed out/
  )
})

test('health checks retry transient errors and reject successful HTML/error responses', async () => {
  let requests = 0
  await checkHealth(
    ['https://api.invalid/'],
    async () =>
      ++requests === 1
        ? new Response('', { status: 503 })
        : Response.json({ version: 'test' }),
    noSleep
  )
  assert.equal(requests, 2)
  await assert.rejects(
    checkHealth(
      ['https://api.invalid/'],
      async () => Response.json({ error: 'unavailable' }),
      noSleep
    ),
    /health check failed/
  )
})

test('release configuration normalizes values for HTTP requests and deployment commands', async () => {
  const padded = Object.fromEntries(
    Object.entries(environment).map(([name, value]) => [name, ` ${value} `])
  )
  const request: typeof fetch = async (url, options) => {
    if (String(url).includes('api.cloudflare.com')) {
      assert.ok(String(url).includes('/accounts/test-account/'))
      assert.equal(
        (options?.headers as Record<string, string>).Authorization,
        'Bearer test-cloudflare-token'
      )
    }
    if (String(url).includes('backboard.railway.com')) {
      const { variables } = JSON.parse(String(options?.body))
      if (variables.environmentId) {
        assert.equal(variables.environmentId, 'test-environment')
        assert.equal(variables.serviceId, 'test-service')
      }
    }
    return success(url, options)
  }
  await preflight(padded, request)
  await deploy(
    { ...padded, GITHUB_TOKEN: undefined },
    async (args, commandEnvironment) => {
      assert.equal(commandEnvironment.DATABASE_URL, undefined)
      if (args.includes('up')) {
        assert.equal(
          commandEnvironment.RAILWAY_TOKEN,
          environment.RAILWAY_TOKEN
        )
        assert.equal(args[args.indexOf('--project') + 1], 'test-project')
        assert.equal(
          args[args.indexOf('--environment') + 1],
          'test-environment'
        )
        assert.equal(args[args.indexOf('--service') + 1], 'test-service')
        return JSON.stringify({ deploymentId: 'submitted' })
      }
      assert.equal(commandEnvironment.CLOUDFLARE_ACCOUNT_ID, 'test-account')
      assert.equal(
        commandEnvironment.CLOUDFLARE_API_TOKEN,
        'test-cloudflare-token'
      )
      return ''
    },
    request,
    noSleep
  )
})

test('preflight verifies the selected Hyperdrive once before other infrastructure checks', async () => {
  for (const branch of ['develop', 'main']) {
    const urls: string[] = []
    await preflight(
      { ...environment, GITHUB_REF: `refs/heads/${branch}` },
      async (input, options) => {
        urls.push(String(input))
        return success(input, options)
      }
    )
    const checks = urls.filter((url) => url.includes('/hyperdrive/configs/'))
    assert.equal(checks.length, 1, 'Both APIs share the same configuration')
    assert.ok(
      checks[0].endsWith(
        branch === 'develop' ? developmentHyperdriveId : productionHyperdriveId
      )
    )
    assert.equal(urls[0], checks[0])
    assert.ok(urls.at(-1)?.endsWith(`/git/ref/heads/${branch}`))
  }
})

test('placeholder IDs and wrong Worker names fail before network or deployments', async () => {
  for (const config of [
    () => ({
      name: 'rest',
      hyperdrive: [{ binding: 'HYPERDRIVE', id: '0'.repeat(32) }]
    }),
    () => ({
      env: {
        dev: {
          name: 'rest',
          hyperdrive: [{ binding: 'HYPERDRIVE', id: developmentHyperdriveId }]
        }
      }
    })
  ]) {
    const noRequest: typeof fetch = async () =>
      assert.fail('must not make requests')
    await assert.rejects(
      preflight(environment, noRequest, config),
      /HYPERDRIVE ID|Worker name/
    )
    await assert.rejects(
      deploy(
        environment,
        async () => assert.fail('must not deploy'),
        noRequest,
        noSleep,
        config
      ),
      /HYPERDRIVE ID|Worker name/
    )
  }
  // Production placeholders must fail even when development is fully configured.
  await assert.rejects(
    preflightRelease(
      { ...environment, GITHUB_REF: 'refs/heads/main' },
      async () => assert.fail('must not request'),
      (api) => ({
        ...readFixtureConfig(api),
        hyperdrive: [{ binding: 'HYPERDRIVE', id: '0'.repeat(32) }]
      })
    ),
    /HYPERDRIVE ID/
  )
})

test('SQL caching or origin drift blocks both preflight and direct deploy', async () => {
  for (const change of [
    { caching: { disabled: false } },
    {
      origin: {
        scheme: 'postgres',
        host: 'wrong-database.invalid',
        port: 5432,
        database: 'test'
      }
    }
  ]) {
    const request: typeof fetch = async (input, options) => {
      assert.ok(
        String(input).includes('/hyperdrive/configs/'),
        'Fail before any other infrastructure operation'
      )
      const data = await (await success(input, options)).json()
      return Response.json({ ...data, result: { ...data.result, ...change } })
    }
    await assert.rejects(
      preflight(environment, request),
      /caching must be disabled|origin does not match/
    )
    await assert.rejects(
      deploy(
        environment,
        async () => assert.fail('must not deploy'),
        request,
        noSleep
      ),
      /caching must be disabled|origin does not match/
    )
  }
})

test('deploy requires the migration database for its second verification without passing it as a Worker variable', async () => {
  await assert.rejects(
    deploy(
      { ...environment, DATABASE_URL: undefined },
      async () => assert.fail('must not deploy'),
      success,
      noSleep
    ),
    /Missing DATABASE_URL/
  )
})
