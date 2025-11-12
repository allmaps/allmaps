// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Env } from '$lib/types/env'

declare global {
  namespace App {
    interface Platform {
      env: Env
    }
  }
}

export {}
