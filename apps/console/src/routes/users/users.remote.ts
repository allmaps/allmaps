import { command, query } from '$app/server'

import { restFetch } from '$lib/server/rest.js'
import { z } from 'zod'

export type ConsoleUser = {
  id: string
  name?: string | null
  slug?: string | null
  email?: string | null
  banned?: boolean | null
  role?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
  emailVerified?: boolean | null
  organizations?: {
    userRole: string
    createdAt?: string
    organization: {
      id: string
      slug: string
      name: string
      logo?: string | null
      createdAt?: string
    }
  }[]
}

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

const updateUserSchema = z.object({
  userId: userIdSchema,
  data: z.object({
    name: z.string(),
    slug: z.string().nullable(),
    email: z.string().email(),
    banned: z.boolean()
  })
})

const setUserRoleSchema = z.object({
  userId: userIdSchema,
  role: userRoleSchema
})

export const getUser = query(userIdSchema, async (userId) => {
  return restFetch<ConsoleUser>(`/users/${userId}`)
})

export const updateUser = command<
  typeof updateUserSchema,
  Promise<ConsoleUser>
>(updateUserSchema, async (body) => {
  const result = await restFetch<{ user: ConsoleUser }>(
    '/auth/admin/update-user',
    {
      method: 'POST',
      json: body
    }
  )

  void getUsers(10000).refresh()
  void getUser(body.userId).refresh()

  return result.user
})

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

  void getUsers(10000).refresh()
  void getUser(body.userId).refresh()

  return result.user
})
