import { serializeSignedCookie } from 'better-call'
import type { BetterAuthContext } from '@allmaps/db/auth'
import type { SeedCatalog } from '@allmaps/tools-seed'

// Mounted only by the local PGlite harness, never by a production API factory.
// This creates a real Better Auth session for one of the synthetic seed users.
export async function loginSeedUser(
  betterAuth: BetterAuthContext,
  catalog: SeedCatalog,
  slug: string
) {
  const user = catalog.users.find((user) => user.slug === slug)
  if (!user)
    return Response.json({ error: 'Seed user not found' }, { status: 404 })

  const authContext = await betterAuth.auth.$context
  const session = await authContext.internalAdapter.createSession(user.id)
  if (!session) throw new Error('Failed to create local seed session')
  const cookie = authContext.authCookies.sessionToken
  const setCookie = await serializeSignedCookie(
    cookie.name,
    session.token,
    authContext.secret,
    { ...cookie.attributes, maxAge: authContext.sessionConfig.expiresIn }
  )
  return Response.json(
    { id: user.id, slug: user.slug, role: user.role },
    { headers: { 'Set-Cookie': setCookie, 'Cache-Control': 'no-store' } }
  )
}
