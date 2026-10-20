import { resolve } from 'node:path'

import { root } from '@allmaps/tools-setup'
export { root } from '@allmaps/tools-setup'
export const migrationsDirectory = resolve(root, 'packages/db/drizzle')
// Preserve the populated POC database at its original location.
export const defaultDataDirectory = resolve(root, 'test/apis/.pglite')
