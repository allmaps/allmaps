import { command, query } from '$app/server'

import { restFetch } from '$lib/server/rest.js'
import { z } from 'zod'

import type { Organization } from '$lib/types.js'

type OrganizationRole = 'admin' | 'member' | 'owner'

type OrganizationPlan = 'supporter' | 'innovator'

type OrganizationBody = {
  name: string
  slug: string
  homepage: string | null
  plan: OrganizationPlan | null
  domains: string[]
}

type CreateOrganizationInput = {
  name: string
  slug: string
}

type UpdateOrganizationInput = {
  organizationId: string
  organization: OrganizationBody
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
const organizationRoleSchema = z.enum(['admin', 'member', 'owner'])
const organizationPlanSchema = z.enum(['supporter', 'innovator']).nullable()
const organizationBodySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  homepage: z.string().nullable(),
  plan: organizationPlanSchema,
  domains: z.array(z.string())
}) satisfies z.ZodType<OrganizationBody>

const createOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1)
}) satisfies z.ZodType<CreateOrganizationInput>

const updateOrganizationSchema = z.object({
  organizationId: organizationIdSchema,
  organization: organizationBodySchema
}) satisfies z.ZodType<UpdateOrganizationInput>

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

export const createOrganization = command<
  typeof createOrganizationSchema,
  Promise<Organization>
>(createOrganizationSchema, async (body) => {
  const organization = await restFetch<Organization>('/organizations', {
    method: 'POST',
    json: {
      ...body,
      plan: null
    }
  })

  void getOrganizations().refresh()

  return organization
})

export const updateOrganization = command<
  typeof updateOrganizationSchema,
  Promise<Organization>
>(updateOrganizationSchema, async ({ organizationId, organization: body }) => {
  const organization = await restFetch<Organization>(
    `/organizations/${organizationId}`,
    {
      method: 'PATCH',
      json: body
    }
  )

  void getOrganizations().refresh()
  void getOrganization(organizationId).refresh()

  return organization
})

export const deleteOrganization = command<
  typeof organizationIdSchema,
  Promise<void>
>(organizationIdSchema, async (organizationId) => {
  await restFetch<{ success: true }>(`/organizations/${organizationId}`, {
    method: 'DELETE'
  })

  void getOrganizations().refresh()
})

export const addOrganizationMember = command<
  typeof addOrganizationMemberSchema,
  Promise<void>
>(addOrganizationMemberSchema, async ({ organizationId, email, role }) => {
  await restFetch(`/organizations/${organizationId}/users`, {
    method: 'POST',
    json: { email, role }
  })

  void getOrganizations().refresh()
  void getOrganization(organizationId).refresh()
})

export const removeOrganizationMember = command<
  typeof organizationMemberSchema,
  Promise<void>
>(organizationMemberSchema, async ({ organizationId, userId }) => {
  await restFetch(`/organizations/${organizationId}/users/${userId}`, {
    method: 'DELETE'
  })

  void getOrganizations().refresh()
  void getOrganization(organizationId).refresh()
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

    void getOrganizations().refresh()
    void getOrganization(organizationId).refresh()
  }
)
