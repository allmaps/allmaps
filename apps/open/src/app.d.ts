declare global {
  namespace App {
    interface Platform {
      ctx: { waitUntil(promise: Promise<unknown>): void }
    }
  }
}

export {}
