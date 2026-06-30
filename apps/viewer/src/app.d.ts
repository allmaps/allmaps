import type { SourceLoadErrorCode } from '$lib/shared/source-errors.js'

declare global {
  namespace App {
    interface Error {
      message: string
      title?: string
      details?: string
      code?: SourceLoadErrorCode
    }
  }
}

export {}
