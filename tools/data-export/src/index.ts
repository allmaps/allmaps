#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

import { parseDataExportEnv } from '@allmaps/env/data-export'

import { exportData } from './export.ts'

async function main() {
  const command = process.argv[2]
  const profile = process.argv[3]
  const env = parseDataExportEnv(loadEnvProfile(profile))

  if (command === 'export') {
    await exportData(env)
  } else {
    throw new Error(`Unknown command: ${command ?? ''}. Expected: export`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

function loadEnvProfile(profile?: string) {
  if (!profile) {
    return process.env
  }

  if (!isValidProfile(profile)) {
    throw new Error(`Invalid env profile: ${profile}`)
  }

  const env = { ...process.env }

  for (const envPath of getEnvPaths(profile)) {
    if (existsSync(envPath)) {
      Object.assign(env, parseEnv(readFileSync(envPath, 'utf8')))
    }
  }

  return env
}

function isValidProfile(profile: string) {
  return ['dev', 'localhost', 'production'].includes(profile)
}

function getEnvPaths(profile: string) {
  const root = join(import.meta.dirname, '..', '..', '..')

  return [join(root, `.env.${profile}`), join(root, `.env.${profile}.local`)]
}
