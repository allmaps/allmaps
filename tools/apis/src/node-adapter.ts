import { node } from '@elysia/node'
import { WebStandardAdapter } from 'elysia/adapter/web-standard'

export function nodeAdapter() {
  // @elysia/node 1.4.6 bundles an older response mapper that collapses multiple
  // Set-Cookie headers. Use Elysia's current mapper while retaining Node's
  // listener and shutdown implementation.
  return { ...node(), handler: WebStandardAdapter.handler }
}
