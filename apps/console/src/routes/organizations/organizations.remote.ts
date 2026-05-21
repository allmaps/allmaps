import { command, form, query } from '$app/server'
import { redirect } from '@sveltejs/kit'

import { restFetch } from '$lib/server/rest.js'
import { routes } from '$lib/routes.js'
import { z } from 'zod'

import type { Organization } from '$lib/types.js'

type OrganizationRole = 'admin' | 'member' | 'owner'

type CreateOrganizationInput = {
  name: string
  slug: string
}

type OrganizationMemberInput = {
  organizationId: string
  userId: string
}

type AddOrganizationMemberInput = {
  organizationId: string
  email: string
  role: OrganizationRole
}

type UpdateOrganizationMemberRoleInput = OrganizationMemberInput & {
  role: OrganizationRole
}

const organizationIdSchema = z.string()
const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z](?:[a-z0-9-]*[a-z0-9])?$/, 'Invalid slug')
const organizationRoleSchema = z.enum(['admin', 'member', 'owner'])

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: slugSchema
}) satisfies z.ZodType<CreateOrganizationInput>

const updateOrganizationFormSchema = z.object({
  organizationId: organizationIdSchema,
  name: z.string().trim().min(1),
  slug: slugSchema,
  homepage: z
    .string()
    .trim()
    .transform((value) => value || null),
  plan: z
    .union([z.enum(['supporter', 'innovator']), z.literal('')])
    .transform((value) => value || null),
  domains: z.string().transform((value) =>
    value
      .split('\n')
      .map((domain) => domain.trim())
      .filter(Boolean)
  )
})

const addOrganizationMemberSchema = z.object({
  organizationId: organizationIdSchema,
  email: z.string().trim().min(1),
  role: organizationRoleSchema
}) satisfies z.ZodType<AddOrganizationMemberInput>

const organizationMemberSchema = z.object({
  organizationId: organizationIdSchema,
  userId: z.string()
}) satisfies z.ZodType<OrganizationMemberInput>

const updateOrganizationMemberRoleSchema = z.object({
  organizationId: organizationIdSchema,
  userId: z.string(),
  role: organizationRoleSchema
}) satisfies z.ZodType<UpdateOrganizationMemberRoleInput>

export const getOrganizations = query(async () => {
  return restFetch<Organization[]>('/organizations')
})

export const getOrganization = query(
  organizationIdSchema,
  async (organizationId) => {
    return restFetch<Organization>(`/organizations/${organizationId}`)
  }
)

export const createOrganizationForm = form(
  createOrganizationSchema,
  async (body) => {
    await restFetch<Organization>('/organizations', {
      method: 'POST',
      json: {
        ...body,
        plan: null
      }
    })

    await getOrganizations().refresh()

    redirect(303, routes.organizations())
  }
)

export const updateOrganizationForm = form(
  updateOrganizationFormSchema,
  async ({ organizationId, ...organization }) => {
    await restFetch<Organization>(`/organizations/${organizationId}`, {
      method: 'PATCH',
      json: organization
    })

    await Promise.all([
      getOrganizations().refresh(),
      getOrganization(organizationId).refresh()
    ])

    redirect(303, routes.organizations())
  }
)

export const deleteOrganization = command<
  typeof organizationIdSchema,
  Promise<void>
>(organizationIdSchema, async (organizationId) => {
  await restFetch<{ success: true }>(`/organizations/${organizationId}`, {
    method: 'DELETE'
  })

  await getOrganizations().refresh()
})

export const addOrganizationMember = command<
  typeof addOrganizationMemberSchema,
  Promise<void>
>(addOrganizationMemberSchema, async ({ organizationId, email, role }) => {
  await restFetch(`/organizations/${organizationId}/users`, {
    method: 'POST',
    json: { email, role }
  })

  await Promise.all([
    getOrganizations().refresh(),
    getOrganization(organizationId).refresh()
  ])
})

export const removeOrganizationMember = command<
  typeof organizationMemberSchema,
  Promise<void>
>(organizationMemberSchema, async ({ organizationId, userId }) => {
  await restFetch(`/organizations/${organizationId}/users/${userId}`, {
    method: 'DELETE'
  })

  await Promise.all([
    getOrganizations().refresh(),
    getOrganization(organizationId).refresh()
  ])
})

export const updateOrganizationMemberRole = command<
  typeof updateOrganizationMemberRoleSchema,
  Promise<void>
>(
  updateOrganizationMemberRoleSchema,
  async ({ organizationId, userId, role }) => {
    await restFetch(`/organizations/${organizationId}/users/${userId}`, {
      method: 'PATCH',
      json: { role }
    })

    await Promise.all([
      getOrganizations().refresh(),
      getOrganization(organizationId).refresh()
    ])
  }
)
