import { command, query } from '$app/server'

import {
  assertNonEmptyString,
  assertObject,
  assertString,
  schema,
  stringSchema
} from '$lib/remote-schema.js'
import { restFetch } from '$lib/server/rest.js'

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

function assertOrganizationRole(
  value: unknown
): asserts value is OrganizationRole {
  if (value !== 'admin' && value !== 'member' && value !== 'owner') {
    throw new Error('Invalid member role')
  }
}

function assertOrganizationPlan(
  value: unknown
): asserts value is OrganizationPlan | null {
  if (value !== null && value !== 'supporter' && value !== 'innovator') {
    throw new Error('Invalid organization plan')
  }
}

function assertOrganizationBody(
  value: unknown
): asserts value is OrganizationBody {
  assertObject(value, 'organization')

  const organization = value

  assertNonEmptyString(organization.name, 'organization name')
  assertNonEmptyString(organization.slug, 'organization slug')
  assertOrganizationPlan(organization.plan)

  if (
    organization.homepage !== null &&
    typeof organization.homepage !== 'string'
  ) {
    throw new Error('Invalid organization homepage')
  }

  if (
    !Array.isArray(organization.domains) ||
    !organization.domains.every((domain) => typeof domain === 'string')
  ) {
    throw new Error('Invalid organization domains')
  }
}

const createOrganizationSchema = schema<CreateOrganizationInput>((value) => {
  assertObject(value, 'organization')
  assertNonEmptyString(value.name, 'organization name')
  assertNonEmptyString(value.slug, 'organization slug')

  return {
    name: value.name,
    slug: value.slug
  }
})

const updateOrganizationSchema = schema<UpdateOrganizationInput>((value) => {
  assertObject(value, 'organization update')
  assertString(value.organizationId, 'organization id')
  assertOrganizationBody(value.organization)

  return {
    organizationId: value.organizationId,
    organization: value.organization
  }
})

const addOrganizationMemberSchema = schema<AddOrganizationMemberInput>(
  (value) => {
    assertObject(value, 'organization member')
    assertString(value.organizationId, 'organization id')
    assertNonEmptyString(value.email, 'member email')
    assertOrganizationRole(value.role)

    return {
      organizationId: value.organizationId,
      email: value.email,
      role: value.role
    }
  }
)

const organizationMemberSchema = schema<OrganizationMemberInput>((value) => {
  assertObject(value, 'organization member')
  assertString(value.organizationId, 'organization id')
  assertString(value.userId, 'user id')

  return {
    organizationId: value.organizationId,
    userId: value.userId
  }
})

const updateOrganizationMemberRoleSchema =
  schema<UpdateOrganizationMemberRoleInput>((value) => {
    assertObject(value, 'organization member role')
    assertString(value.organizationId, 'organization id')
    assertString(value.userId, 'user id')
    assertOrganizationRole(value.role)

    return {
      organizationId: value.organizationId,
      userId: value.userId,
      role: value.role
    }
  })

export const getOrganizations = query(async () => {
  return restFetch<Organization[]>('/organizations')
})

export const getOrganization = query(
  stringSchema('organization id'),
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
  ReturnType<typeof stringSchema>,
  Promise<void>
>(stringSchema('organization id'), async (organizationId) => {
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
