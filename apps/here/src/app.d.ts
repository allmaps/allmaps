declare global {
  namespace App {
    interface Platform {
      env: Env
      cf: CfProperties
      ctx: ExecutionContext
    }

    interface Error {
      description?: string
      url?: string
    }
  }
}
