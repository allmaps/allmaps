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
  const isUserRoute = routeId?.startsWith('/users')

  if (isProfileRoute || isOrganizationRoute || isUserRoute) {
    const session = await event.locals.getConsoleSession()

    if (!session?.user?.id) {
      redirect(302, '/')
    }

    if (routeId === '/organizations/new' && session?.user?.role !== 'admin') {
      error(403, 'Allmaps admin access required')
    }
    if (
      isUserIndexRoute &&
      session?.user?.role !== 'admin' &&
      session?.user?.role !== 'collaborator'
    ) {
      error(403, 'Admin or collaborator access required')
    }
  }

  return resolve(event)
}
