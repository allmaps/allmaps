declare module 'json0-ot-diff' {
  import type DiffMatchPatch from 'diff-match-patch'
  import type { Operation } from '@allmaps/db'

  export default function diff(
    a: unknown,
    b: unknown,
    diffMatchPatch: typeof DiffMatchPatch,
    json1: typeof import('ot-json1')
  ): Operation[]
}
