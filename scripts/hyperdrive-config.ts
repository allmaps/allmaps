import { fileURLToPath } from 'node:url'
import { experimental_readRawConfig, type Unstable_RawConfig } from 'wrangler'

export type HyperdriveTarget = { workerName: string; id: string }

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

export function readWorkerConfiguration(
  path: string | URL
): Unstable_RawConfig {
  return experimental_readRawConfig({
    config: path instanceof URL ? fileURLToPath(path) : path
  }).rawConfig
}

/** Select bindings from the environment being deployed, without falling back to production. */
export function hyperdriveTarget(
  configuration: ReturnType<typeof readWorkerConfiguration>,
  environment?: string
): HyperdriveTarget {
  const target = environment ? configuration.env?.[environment] : configuration
  const bindings =
    target?.hyperdrive?.filter((binding) => binding.binding === 'HYPERDRIVE') ??
    []
  const id = bindings[0]?.id
  if (
    bindings.length !== 1 ||
    typeof id !== 'string' ||
    !/^[a-f0-9]{32}$/.test(id) ||
    /^0+$/.test(id)
  ) {
    throw new Error(
      'Configure a real HYPERDRIVE ID for the selected environment before deploying. See apis/HYPERDRIVE.md.'
    )
  }
  if (typeof target?.name !== 'string' || !target.name.trim()) {
    throw new Error('Configure the Worker name for the selected environment.')
  }
  return { workerName: target.name, id }
}

function databaseTarget(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    const database = decodeURIComponent(url.pathname.slice(1))
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !database ||
      url.hostname.includes('-pooler.') ||
      ['host', 'port', 'database', 'dbname'].some((key) =>
        url.searchParams.has(key)
      )
    )
      throw new Error()
    return {
      host: url.hostname.toLowerCase(),
      database,
      port: Number(url.port || 5432)
    }
  } catch {
    // Do not include a connection string or URL parser error containing credentials.
    throw new Error(
      'DATABASE_URL must identify the direct PostgreSQL migration database, without connection target overrides.'
    )
  }
}

/** Verify the checked-in bindings, including on the first deployment from the old driver. */
export async function verifyHyperdriveTargets(
  targets: HyperdriveTarget[],
  options: { accountId: string; token: string; databaseUrl: string },
  request: typeof fetch = fetch
) {
  const expected = databaseTarget(options.databaseUrl)
  for (const id of new Set(targets.map((target) => target.id))) {
    const response = await request(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(options.accountId)}/hyperdrive/configs/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${options.token}` },
        signal: AbortSignal.timeout(30_000)
      }
    )
    if (!response.ok)
      throw new Error(
        `Cloudflare Hyperdrive verification returned HTTP ${response.status}`
      )
    const data = object(await response.json())
    const config = object(data.result)
    if (data.success !== true || config.id !== id) {
      throw new Error(
        'Cloudflare did not return the selected Hyperdrive configuration.'
      )
    }
    if (object(config.caching).disabled !== true) {
      throw new Error(
        'Hyperdrive SQL query caching must be disabled before release.'
      )
    }
    const origin = object(config.origin)
    if (
      !['postgres', 'postgresql'].includes(String(origin.scheme)) ||
      typeof origin.host !== 'string' ||
      origin.host.toLowerCase() !== expected.host ||
      origin.database !== expected.database ||
      origin.port !== expected.port
    ) {
      throw new Error(
        'Hyperdrive origin does not match this environment’s migration DATABASE_URL (host, port and database).'
      )
    }
  }
}
