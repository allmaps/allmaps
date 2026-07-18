import { setContext, getContext } from 'svelte'

const AUTH_CONTEXT_KEY = Symbol('allmaps-auth')

export type AuthSession = {
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    role?: string
  }
}

export type AuthSessionState = {
  data: AuthSession | null
  isPending: boolean
  error: unknown
}

// Minimal interface — only what the components actually use.
// Compatible with ReturnType<typeof createAuthClient> from better-auth/svelte.
export type AllmapsAuthClient = {
  useSession(): { subscribe(run: (value: unknown) => void): () => void }
  signOut(options?: { callbackURL?: string }): Promise<unknown>
}

export interface AuthContext {
  client: AllmapsAuthClient
  apiBaseURL: string
}

export const setAuthContext = (ctx: AuthContext) =>
  setContext(AUTH_CONTEXT_KEY, ctx)

export const getAuthContext = (): AuthContext => getContext(AUTH_CONTEXT_KEY)
