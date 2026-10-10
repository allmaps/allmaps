import { command, form, query, getRequestEvent } from '$app/server'
import { error, redirect } from '@sveltejs/kit'

import { routes } from '$lib/routes.js'
import { restFetch } from '$lib/server/rest.js'
import { z } from 'zod'

import type { ConsoleUser } from '$lib/types.js'

const userIdSchema = z.string()
const userLimitSchema = z.number().finite().optional()

export const getUsers = query(userLimitSchema, async (limit) => {
  const params = new URLSearchParams()

  if (limit !== undefined) {
    params.set('limit', String(limit))
  }

  const queryString = params.toString()
  return restFetch<ConsoleUser[]>(
    `/users${queryString ? `?${queryString}` : ''}`
  )
})

const userSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z](?:[a-z0-9-]*[a-z0-9])?$/, 'Invalid slug')
  .or(z.literal(''))
  .transform((value) => value || null)

const updateUserFormSchema = z.object({
  userId: userIdSchema,
  name: z.string(),
  slug: userSlugSchema,
  email: z.string().email().optional(),
  banned: z
    .union([z.literal('true'), z.literal('on'), z.literal(true)])
    .optional()
    .transform(Boolean)
})

export const updateUserForm = form(
  updateUserFormSchema,
  async ({ userId, name, slug, email, banned }) => {
    const session = await getRequestEvent().locals.getConsoleSession()
    const isAdmin = session?.user?.role === 'admin'
    if (!isAdmin && session?.user?.id !== userId) error(403, 'Forbidden')
    if (!isAdmin) {
      await restFetch('/auth/update-user', {
        method: 'POST',
        json: { name, slug }
      })
      redirect(303, routes.user(userId))
    }
    await restFetch<{ user: ConsoleUser }>('/auth/admin/update-user', {
      method: 'POST',
      json: {
        userId,
        data: {
          name,
          slug,
          email,
          banned
        }
      }
    })

    redirect(303, routes.users())
  }
)

export const updateUserRole = command(
  z.object({ userId: z.string(), role: z.enum(['user', 'collaborator']) }),
  async ({ userId, role }) => {
    await restFetch(`/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      json: { role }
    })
  }
)
