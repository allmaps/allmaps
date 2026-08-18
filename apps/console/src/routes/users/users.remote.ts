import { command, form, query } from '$app/server'
import { redirect } from '@sveltejs/kit'

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

const userRoleSchema = z.enum(['user', 'admin'])
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
  email: z.string().email(),
  banned: z
    .union([z.literal('true'), z.literal('on'), z.literal(true)])
    .optional()
    .transform(Boolean)
})

const setUserRoleSchema = z.object({
  userId: userIdSchema,
  role: userRoleSchema
})

export const updateUserForm = form(
  updateUserFormSchema,
  async ({ userId, name, slug, email, banned }) => {
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

export const setUserRole = command<
  typeof setUserRoleSchema,
  Promise<ConsoleUser>
>(setUserRoleSchema, async (body) => {
  const result = await restFetch<{ user: ConsoleUser }>(
    '/auth/admin/set-role',
    {
      method: 'POST',
      json: body
    }
  )
  return result.user
})
