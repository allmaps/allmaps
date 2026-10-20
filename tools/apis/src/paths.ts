import { resolve } from 'node:path'

import { root } from '@allmaps/tools-setup'
export { root } from '@allmaps/tools-setup'
export { migrationsDirectory } from '@allmaps/db/migrations'
// Preserve the populated POC database at its original location.
export const defaultDataDirectory = resolve(root, 'test/apis/.pglite')
