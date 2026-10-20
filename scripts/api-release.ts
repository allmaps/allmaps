import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout } from 'node:timers/promises'

const railwayCli = ['--reporter=silent', 'dlx', '@railway/cli@5.71.0']
const railwayApi = 'https://backboard.railway.com/graphql/v2'
type Environment = Record<string, string | undefined>
type Command = (args: string[], environment: Environment) => Promise<string>
type Request = typeof fetch

function required(environment: Environment, name: string) {
  const value = environment[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function releaseTarget(environment: Environment) {
  const branch = required(environment, 'GITHUB_REF')
  if (!['refs/heads/develop', 'refs/heads/main'].includes(branch))
    throw new Error('API releases only support develop and main')
  if (
    !['push', 'workflow_dispatch'].includes(
      required(environment, 'GITHUB_EVENT_NAME')
    )
  )
    throw new Error('API releases require a push or workflow_dispatch event')
  const sha = required(environment, 'GITHUB_SHA')
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid GITHUB_SHA')
  const development = branch === 'refs/heads/develop'
  return {
    branch: development ? 'develop' : 'main',
    sha,
    workers: development
      ? ['rest-develop', 'annotations-develop']
      : ['rest', 'annotations'],
    wranglerArguments: ['--env', development ? 'dev' : ''],
    healthUrls: [
      `https://${development ? 'dev.' : ''}api.allmaps.org/`,
      `https://${development ? 'dev.' : ''}annotations.allmaps.org/`,
      `https://${development ? 'dev.' : ''}live.allmaps.org/`
    ]
  }
}

function releaseConfiguration(environment: Environment) {
  return {
    target: releaseTarget(environment),
    cloudflareAccountId: required(environment, 'CLOUDFLARE_ACCOUNT_ID'),
    cloudflareApiToken: required(environment, 'CLOUDFLARE_API_TOKEN'),
    railwayProjectId: required(environment, 'RAILWAY_PROJECT_ID'),
    railwayEnvironmentId: required(environment, 'RAILWAY_ENVIRONMENT_ID'),
    railwayServiceId: required(environment, 'RAILWAY_SERVICE_ID'),
    railwayToken: required(environment, 'RAILWAY_TOKEN')
  }
}

async function jsonResponse(response: Response, service: string) {
  if (!response.ok)
    throw new Error(`${service} returned HTTP ${response.status}`)
  return response.json()
}

async function railwayQuery(
  railwayToken: string,
  query: string,
  variables: Record<string, string>,
  request: Request
) {
  const result = await jsonResponse(
    await request(railwayApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Project-Access-Token': railwayToken
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000)
    }),
    'Railway'
  )
  if (result.errors?.length || !result.data)
    throw new Error(
      'Railway could not verify the release; inspect its dashboard'
    )
  return result.data
}

export async function preflight(
  environment: Environment,
  request: Request = fetch
) {
  const configuration = releaseConfiguration(environment)
  const { target } = configuration
  required(environment, 'DATABASE_URL')
  const githubToken = required(environment, 'GITHUB_TOKEN')
  const repository = required(environment, 'GITHUB_REPOSITORY')
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error('Invalid GITHUB_REPOSITORY')

  const token = await railwayQuery(
    configuration.railwayToken,
    `query ($environmentId: String!, $serviceId: String!) {
      projectToken { projectId environmentId }
      serviceInstance(environmentId: $environmentId, serviceId: $serviceId) { id }
    }`,
    {
      environmentId: configuration.railwayEnvironmentId,
      serviceId: configuration.railwayServiceId
    },
    request
  )
  if (
    token.projectToken?.projectId !== configuration.railwayProjectId ||
    token.projectToken?.environmentId !== configuration.railwayEnvironmentId
  )
    throw new Error(
      'Railway token does not match the configured project and environment'
    )
  if (!token.serviceInstance?.id)
    throw new Error(
      'Railway service does not exist in the configured environment'
    )

  for (const worker of target.workers) {
    const settings = await jsonResponse(
      await request(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(configuration.cloudflareAccountId)}/workers/scripts/${worker}/settings`,
        {
          headers: {
            Authorization: `Bearer ${configuration.cloudflareApiToken}`
          },
          signal: AbortSignal.timeout(30_000)
        }
      ),
      'Cloudflare'
    )
    if (
      !settings.success ||
      !settings.result?.bindings?.some(
        (binding: { name: string }) => binding.name === 'DATABASE_URL'
      )
    )
      throw new Error(
        `Worker ${worker} must have a runtime DATABASE_URL before release`
      )
  }

  // Check last, immediately before migration, after waiting for the release lock.
  const head = await jsonResponse(
    await request(
      `https://api.github.com/repos/${repository}/git/ref/heads/${target.branch}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json'
        },
        signal: AbortSignal.timeout(30_000)
      }
    ),
    'GitHub'
  )
  if (head.object?.sha !== target.sha)
    throw new Error(
      'This release is stale. Run the workflow for the current branch head.'
    )
}

export async function waitForRailway(
  railwayToken: string,
  deploymentId: string,
  request: Request = fetch,
  sleep: (milliseconds: number) => Promise<unknown> = setTimeout,
  attempts = 80
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { deployment } = await railwayQuery(
      railwayToken,
      'query ($id: String!) { deployment(id: $id) { id status } }',
      { id: deploymentId },
      request
    )
    if (!deployment || deployment.id !== deploymentId)
      throw new Error('Railway did not return the submitted deployment')
    if (deployment.status === 'SUCCESS') return
    if (
      !['INITIALIZING', 'QUEUED', 'WAITING', 'BUILDING', 'DEPLOYING'].includes(
        deployment.status
      )
    )
      throw new Error(
        `Railway deployment ${deploymentId}: ${deployment.status}`
      )
    await sleep(15_000)
  }
  throw new Error(`Timed out waiting for Railway deployment ${deploymentId}`)
}

export async function checkHealth(
  urls: string[],
  request: Request = fetch,
  sleep: (milliseconds: number) => Promise<unknown> = setTimeout
) {
  for (const url of urls) {
    let healthy = false
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const response = await request(url, {
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
          headers: { 'Cache-Control': 'no-cache' }
        })
        const body = response.ok ? await response.json() : undefined
        healthy = typeof body?.version === 'string'
      } catch {
        healthy = false
      }
      if (healthy) break
      await sleep(5_000)
    }
    if (!healthy) throw new Error(`API health check failed: ${url}`)
  }
}

async function runCommand(args: string[], environment: Environment) {
  const { stdout } = await promisify(execFile)('pnpm', args, {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, ...environment },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 20 * 60 * 1000
  })
  return stdout
}

export async function deploy(
  environment: Environment,
  command: Command = runCommand,
  request: Request = fetch,
  sleep: (milliseconds: number) => Promise<unknown> = setTimeout
) {
  const configuration = releaseConfiguration(environment)
  const { target } = configuration
  for (const api of ['rest', 'annotations']) {
    console.log(
      await command(
        [
          '--filter',
          `@allmaps/api-${api}`,
          'exec',
          'wrangler',
          'deploy',
          '--keep-vars',
          ...target.wranglerArguments
        ],
        {
          CLOUDFLARE_ACCOUNT_ID: configuration.cloudflareAccountId,
          CLOUDFLARE_API_TOKEN: configuration.cloudflareApiToken
        }
      )
    )
  }
  // Upload this checkout, never "deploy latest commit" from a moving Git branch.
  const output = await command(
    [
      ...railwayCli,
      'up',
      '--detach',
      '--json',
      '--project',
      configuration.railwayProjectId,
      '--environment',
      configuration.railwayEnvironmentId,
      '--service',
      configuration.railwayServiceId,
      '--message',
      `Allmaps ${target.branch} ${target.sha}`
    ],
    { RAILWAY_TOKEN: configuration.railwayToken }
  )
  const { deploymentId } = JSON.parse(output)
  if (typeof deploymentId !== 'string' || !deploymentId)
    throw new Error('Railway upload did not return a deployment ID')
  console.log(`Waiting for Railway deployment ${deploymentId}`)
  await waitForRailway(configuration.railwayToken, deploymentId, request, sleep)
  await checkHealth(target.healthUrls, request, sleep)
}

if (import.meta.main) {
  const action = process.argv[2]
  if (action === 'preflight') await preflight(process.env)
  else if (action === 'deploy') await deploy(process.env)
  else throw new Error('Usage: node scripts/api-release.ts preflight|deploy')
}
