import { query } from '$app/server'

import { optionalNumberSchema, stringSchema } from '$lib/remote-schema.js'
import { restFetch } from '$lib/server/rest.js'

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

export const getUsers = query(
  optionalNumberSchema('user limit'),
  async (limit) => {
    const params = new URLSearchParams()

    if (limit !== undefined) {
      params.set('limit', String(limit))
    }

    const queryString = params.toString()
    return restFetch<ConsoleUser[]>(
      `/users${queryString ? `?${queryString}` : ''}`
    )
  }
)

export const getUser = query(stringSchema('user id'), async (userId) => {
  return restFetch<ConsoleUser>(`/users/${userId}`)
})
