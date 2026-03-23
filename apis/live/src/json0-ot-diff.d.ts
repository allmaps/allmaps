declare module 'json0-ot-diff' {
  import type DiffMatchPatch from 'diff-match-patch'
  import type JSON1 from 'ot-json1'
  import type { Operation } from '@allmaps/api-shared/types'

  export default function diff(
    a: unknown,
    b: unknown,
    diffMatchPatch: typeof DiffMatchPatch,
    josn1: JSON1
  ): Operation[]
}
