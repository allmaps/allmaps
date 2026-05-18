import { eq } from 'drizzle-orm'

import { generateRandomId } from '@allmaps/id/sync'

import * as authSchema from '@allmaps/db/schema/auth'
import * as organizationsSchema from '@allmaps/db/schema/organizations'
import {
  queryAllOrganizationUsers,
  queryOrganizationMembersById
} from './auth.js'

import { clampLimit } from '../shared/limits.js'

import type { Db, DbOrTx } from '@allmaps/db'

type DbOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
  homepage: string | null
  plan: string | null
  createdAt: Date
  updatedAt?: Date
  urls: {
    url: string
    type: 'domain'
  }[]
}

export function normalizeDomain(value: string): string | undefined {
  const input = value.trim()

  if (!input) {
    return
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)
  let hostname = input

  if (withProtocol) {
    try {
      const url = new URL(input)
      if (
        url.username ||
        url.password ||
        (url.pathname && url.pathname !== '/') ||
        url.search ||
        url.hash ||
        url.port
      ) {
        return
      }
      hostname = url.hostname
    } catch {
      return
    }
  }

  const domain = hostname.toLowerCase()
  if (
    /[/?#@:]/.test(domain) ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return
  }

  const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
  const domainRegex = new RegExp(`^(?:${label})(?:\\.(?:${label}))*$`)

  return domainRegex.test(domain) ? domain : undefined
}

export function normalizeOrganizationSlug(value: string): string | undefined {
  const slug = value.trim()

  if (!slug) {
    return
  }

  return /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) ? slug : undefined
}

export function normalizeHomepageUrl(value: string): string | undefined {
  const homepage = value.trim()

  if (!homepage) {
    return
  }

  try {
    const url = new URL(homepage)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return
  }
}

export function normalizeDomains(domains: string[] | undefined) {
  if (domains === undefined) {
    return {
      validDomains: undefined as string[] | undefined,
      invalidDomains: []
    }
  }

  const valid = new Set<string>()
  const invalid: string[] = []

  for (const domain of domains) {
    const normalized = normalizeDomain(domain)
    if (normalized) {
      valid.add(normalized)
    } else {
      invalid.push(domain)
    }
  }

  return { validDomains: [...valid], invalidDomains: invalid }
}

export function fromDbOrganization(
  restBaseUrl: string,
  dbOrganization: DbOrganization
) {
  const id = `${restBaseUrl}/organizations/${dbOrganization.id}`

  return {
    id,
    name: dbOrganization.name,
    slug: dbOrganization.slug,
    logo: dbOrganization.logo,
    homepage: dbOrganization.homepage,
    plan: dbOrganization.plan,
    createdAt: dbOrganization.createdAt,
    domains: dbOrganization.urls
      .filter(({ type }) => type === 'domain')
      .map(({ url }) => url),
    images: `${id}/images`,
    canvases: `${id}/canvases`,
    manifests: `${id}/manifests`
  }
}

export function fromDbOrganizationWithUsers(
  restBaseUrl: string,
  dbOrganization: DbOrganization,
  users: {
    role: string
    createdAt: Date
    user: {
      id: string
      name: string
      email: string
    }
  }[]
) {
  return {
    ...fromDbOrganization(restBaseUrl, dbOrganization),
    users
  }
}

export async function queryOrganizationUrls(
  db: DbOrTx,
  organizationId: string
) {
  return db
    .select()
    .from(organizationsSchema.organizationUrls)
    .where(
      eq(organizationsSchema.organizationUrls.organizationId, organizationId)
    )
}

export async function replaceOrganizationUrls(
  db: DbOrTx,
  organizationId: string,
  domains: string[] = []
) {
  await db.transaction(async (tx) => {
    await tx
      .delete(organizationsSchema.organizationUrls)
      .where(
        eq(organizationsSchema.organizationUrls.organizationId, organizationId)
      )

    const rows = domains.map((url) => ({
      id: generateRandomId(),
      organizationId,
      url,
      type: 'domain' as const
    }))

    if (rows.length > 0) {
      await tx.insert(organizationsSchema.organizationUrls).values(rows)
    }
  })
}

export async function listOrganizations(
  db: Db,
  restBaseUrl: string,
  limit?: number
) {
  const dbOrganizations = await db.query.organizations.findMany({
    with: {
      urls: true
    },
    orderBy: (organizations, { asc }) => asc(organizations.name),
    limit: clampLimit(limit)
  })

  return dbOrganizations.map((dbOrganization) =>
    fromDbOrganization(restBaseUrl, dbOrganization)
  )
}

export async function listOrganizationsWithUsers(
  db: Db,
  restBaseUrl: string,
  limit?: number
) {
  const [dbOrganizations, usersByOrganizationId] = await Promise.all([
    db.query.organizations.findMany({
      with: {
        urls: true
      },
      orderBy: (organizations, { asc }) => asc(organizations.name),
      limit: clampLimit(limit)
    }),
    queryAllOrganizationUsers(db, restBaseUrl)
  ])

  return dbOrganizations.map((dbOrganization) =>
    fromDbOrganizationWithUsers(
      restBaseUrl,
      dbOrganization,
      usersByOrganizationId[dbOrganization.id] ?? []
    )
  )
}

export async function queryOrganizationById(
  db: Db,
  restBaseUrl: string,
  organizationId: string
) {
  const organization = await db.query.organizations.findFirst({
    with: {
      urls: true
    },
    where: {
      id: {
        eq: organizationId
      }
    }
  })

  if (!organization) {
    return
  }

  return fromDbOrganization(restBaseUrl, organization)
}

export async function queryOrganizationByIdWithUsers(
  db: Db,
  restBaseUrl: string,
  organizationId: string
) {
  const [organization, users] = await Promise.all([
    queryOrganizationById(db, restBaseUrl, organizationId),
    queryOrganizationMembersById(db, restBaseUrl, organizationId)
  ])

  if (!organization) {
    return
  }

  return {
    ...organization,
    users
  }
}

export async function queryOrganizationBySlug(
  db: Db,
  restBaseUrl: string,
  organizationSlug: string
) {
  const organization = await db.query.organizations.findFirst({
    with: {
      urls: true
    },
    where: {
      slug: {
        eq: organizationSlug
      }
    }
  })

  if (!organization) {
    return
  }

  return fromDbOrganization(restBaseUrl, organization)
}

export async function createOrganization(
  db: Db,
  restBaseUrl: string,
  data: {
    name: string
    slug: string
    logo?: string | null
    homepage?: string | null
    plan?: 'supporter' | 'innovator' | null
    domains?: string[]
  }
) {
  const existing = await db
    .select({ id: authSchema.organizations.id })
    .from(authSchema.organizations)
    .where(eq(authSchema.organizations.slug, data.slug))

  if (existing.length > 0) {
    return null
  }

  const id = generateRandomId()
  const [organization] = await db
    .insert(authSchema.organizations)
    .values({
      id,
      name: data.name,
      slug: data.slug,
      logo: data.logo ?? null,
      homepage: data.homepage ?? null,
      plan: data.plan ?? null,
      createdAt: new Date()
    })
    .returning()

  await replaceOrganizationUrls(db, id, data.domains)

  const urls = await queryOrganizationUrls(db, id)
  return fromDbOrganization(restBaseUrl, { ...organization, urls })
}

export async function updateOrganization(
  db: Db,
  restBaseUrl: string,
  organizationId: string,
  patch: Partial<{
    name: string
    slug: string
    logo: string | null
    homepage: string | null
    plan: 'supporter' | 'innovator' | null
  }>,
  domains?: string[]
) {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(authSchema.organizations)
      .where(eq(authSchema.organizations.id, organizationId))

    if (!existing) {
      return
    }

    const [organization] = await tx
      .update(authSchema.organizations)
      .set(patch)
      .where(eq(authSchema.organizations.id, organizationId))
      .returning()

    if (domains !== undefined) {
      await replaceOrganizationUrls(tx, organizationId, domains)
    }

    const urls = await queryOrganizationUrls(tx, organizationId)
    return fromDbOrganization(restBaseUrl, { ...organization, urls })
  })
}

export async function deleteOrganization(db: Db, organizationId: string) {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: authSchema.organizations.id })
      .from(authSchema.organizations)
      .where(eq(authSchema.organizations.id, organizationId))

    if (!existing) {
      return false
    }

    await tx
      .delete(authSchema.organizations)
      .where(eq(authSchema.organizations.id, organizationId))

    return true
  })
}
