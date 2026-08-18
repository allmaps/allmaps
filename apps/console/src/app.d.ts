// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      getConsoleSession: () => Promise<
        import('$lib/types.js').ConsoleSessionData
      >
    }

    interface Platform {
      env: Env
      ctx: ExecutionContext
      caches: CacheStorage
      cf?: IncomingRequestCfProperties
    }

    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
