import { fetchConsoleSession } from '$lib/server/session.js'

import { error, redirect } from '@sveltejs/kit'

import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  let sessionPromise: ReturnType<typeof fetchConsoleSession> | undefined

  event.locals.getConsoleSession = () => {
    sessionPromise ??= fetchConsoleSession(event)
    return sessionPromise
  }

  const routeId = event.route.id
  const isProfileRoute = routeId?.startsWith('/profile')
  const isOrganizationRoute = routeId?.startsWith('/organizations')
  const isUserIndexRoute = routeId === '/users'

  if (isProfileRoute || isOrganizationRoute || isUserIndexRoute) {
    const session = await event.locals.getConsoleSession()

    if (isProfileRoute && !session?.user?.id) {
      redirect(302, '/')
    }

    if (
      (isOrganizationRoute || isUserIndexRoute) &&
      session?.user?.role !== 'admin'
    ) {
      error(403, 'Administrator access required')
    }
  }

  return resolve(event)
}
