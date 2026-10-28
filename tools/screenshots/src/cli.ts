import { access, mkdir, writeFile } from 'node:fs/promises'
import {
  Command,
  CommanderError,
  InvalidArgumentError,
  Option
} from '@commander-js/extra-typings'
import path from 'node:path'

import { chromium } from 'playwright'

import { captureScreenshot } from './capture.ts'
import { readManifest } from './manifest.ts'
import { publishScreenshot } from './upload.ts'
import { screenshotKey } from '@allmaps/ui/screenshots'

const program = new Command()
  .name('pnpm screenshots')
  .description('Capture screenshots declared by Allmaps Screenshot components.')
  .exitOverride()
  .allowExcessArguments(false)
  .option('--manifest <path>', 'Build manifest', '.screenshots/manifest.json')
  .option('--output <path>', 'Local capture directory', '.screenshots/captures')
  .option('--slug <slug>', 'Capture one slug')
  .option('--refresh', 'Recapture even when local settings and image match')
  .option('--upload', 'Publish through the Allmaps Assets CLI')
  .addOption(
    new Option('--assets-cli <path>', 'Path to assets/scripts/assets.ts').env(
      'ALLMAPS_ASSETS_CLI'
    )
  )
  .option(
    '--overwrite',
    'Allow replacing an existing published object (requires --upload)'
  )
  .option('--chrome', 'Use installed Google Chrome instead of managed Chromium')
  .option('--headed', 'Show the capture browser')
  .option(
    '--timeout <ms>',
    'Navigation/readiness timeout',
    (value) => {
      const timeout = Number(value)
      if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 120_000) {
        throw new InvalidArgumentError(
          'must be between 1 and 120000 milliseconds'
        )
      }
      return timeout
    },
    30_000
  )
  .addHelpText(
    'after',
    `
Build the app first. Capture produces WebP images; upload is opt-in.
Install the browser: pnpm --filter @allmaps/screenshots exec playwright install chromium
Assets authentication: node /path/to/assets/scripts/assets.ts login
`
  )

async function main() {
  const values = program.opts()
  if (values.overwrite && !values.upload)
    throw new Error('--overwrite requires --upload')
  const { timeout } = values
  const manifest = await readManifest(path.resolve(values.manifest))
  const definitions = manifest.screenshots.filter(
    (definition) => !values.slug || definition.slug === values.slug
  )
  if (values.slug && !definitions.length)
    throw new Error(`Unknown screenshot slug: ${values.slug}`)
  if (!definitions.length) {
    process.stdout.write(
      'No screenshots were registered during prerendering.\n'
    )
    return
  }
  const assetsCli = values.assetsCli
  if (values.upload) {
    if (!assetsCli)
      throw new Error(
        'Set ALLMAPS_ASSETS_CLI or pass --assets-cli with the path to scripts/assets.ts'
      )
    await access(path.resolve(assetsCli))
  }
  const directory = path.resolve(values.output)
  const browser = await chromium.launch({
    headless: !values.headed,
    ...(values.chrome ? { channel: 'chrome' } : {})
  })
  const results: {
    slug: string
    filename?: string
    publicUrl?: string
    geometryPublicUrl?: string
    error?: string
  }[] = []
  try {
    for (const definition of definitions) {
      try {
        const capture = await captureScreenshot(browser, definition, {
          directory,
          refresh: values.refresh,
          timeout
        })
        process.stderr.write(
          `${capture.cached ? 'Cached' : 'Captured'} ${screenshotKey(definition)}\n`
        )
        const published =
          values.upload && assetsCli
            ? await publishScreenshot(definition, {
                directory,
                assetsCli,
                overwrite: values.overwrite
              })
            : undefined
        if (published) {
          for (const url of [
            published.publicUrl,
            published.geometryPublicUrl
          ]) {
            if (url) process.stderr.write(`Published ${url}\n`)
          }
        }
        results.push({
          slug: definition.slug,
          filename: capture.filename,
          ...published
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        results.push({ slug: definition.slug, error: message })
        process.stderr.write(`Failed ${definition.slug}: ${message}\n`)
        process.exitCode = 1
      }
    }
  } finally {
    await browser.close()
  }
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(directory, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`
  )
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
}

try {
  await program.action(main).parseAsync(process.argv)
} catch (error) {
  if (error instanceof CommanderError) {
    // Commander already printed help or a parsing error. Preserve its exit code.
    process.exitCode = error.exitCode
  } else {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
  }
}
