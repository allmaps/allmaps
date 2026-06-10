import { eq, sql } from 'drizzle-orm'

import { generateRandomId } from '@allmaps/id/sync'

import * as authSchema from '@allmaps/db/schema/auth'
import * as organizationsSchema from '@allmaps/db/schema/organizations'
import {
  queryAllOrganizationUsers,
  queryOrganizationUsersByOrganizationIds,
  queryOrganizationMembersById
} from './auth.js'

import { clampLimit } from '../shared/limits.js'

import type { Db, DbOrTx } from '@allmaps/db'
import type { SQL } from 'drizzle-orm'
import type { UserRole } from '../shared/limits.js'
import type { OrganizationPlan } from '../types.js'
import type { OrganizationLocation } from '@allmaps/db/schema/auth'

type DbOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
  homepage: string | null
  plan: string | null
  location: OrganizationLocation | null
  createdAt: Date
  updatedAt?: Date
  urls: {
    url: string
    type: 'domain'
  }[]
}

type ListOrganizationsOptions = {
  limit?: number
  plans?: OrganizationPlan[]
  userRole?: UserRole
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

export function normalizeOrganizationLocation(
  location: unknown
): OrganizationLocation | null | undefined {
  if (location === undefined) {
    return
  }

  if (location === null) {
    return null
  }

  if (
    typeof location !== 'object' ||
    !location ||
    !('type' in location) ||
    !('coordinates' in location)
  ) {
    return
  }

  const { type, coordinates } = location

  if (
    type !== 'Point' ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return
  }

  const [longitude, latitude] = coordinates

  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude]
  }
}

export function organizationLocationGeographySql(
  location: SQL = sql`${authSchema.organizations.location}`
) {
  return sql`
    CASE
      WHEN ${location} IS NULL THEN NULL
      ELSE ST_SetSRID(
        ST_MakePoint(
          ((${location}->'coordinates'->>0))::double precision,
          ((${location}->'coordinates'->>1))::double precision
        ),
        4326
      )::geography
    END
  `
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
    location: dbOrganization.location,
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

function getOrganizationPlanWhere(plans?: OrganizationPlan[]) {
  if (plans && plans.length > 0) {
    return {
      plan: {
        in: plans
      }
    }
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
  options: ListOrganizationsOptions = {}
) {
  const dbOrganizations = await db.query.organizations.findMany({
    with: {
      urls: true
    },
    where: getOrganizationPlanWhere(options.plans),
    orderBy: (organizations, { asc }) => asc(organizations.name),
    limit: clampLimit(options.limit, options.userRole)
  })

  return dbOrganizations.map((dbOrganization) =>
    fromDbOrganization(restBaseUrl, dbOrganization)
  )
}

export async function listOrganizationsWithUsers(
  db: Db,
  restBaseUrl: string,
  options: ListOrganizationsOptions = {}
) {
  const [dbOrganizations, usersByOrganizationId] = await Promise.all([
    db.query.organizations.findMany({
      with: {
        urls: true
      },
      where: getOrganizationPlanWhere(options.plans),
      orderBy: (organizations, { asc }) => asc(organizations.name),
      limit: clampLimit(options.limit, options.userRole)
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

export async function listOrganizationsWithUsersByOrganizationIds(
  db: Db,
  restBaseUrl: string,
  organizationIds: string[],
  options: ListOrganizationsOptions = {}
) {
  const [dbOrganizations, usersByOrganizationId] = await Promise.all([
    db.query.organizations.findMany({
      with: {
        urls: true
      },
      where: getOrganizationPlanWhere(options.plans),
      orderBy: (organizations, { asc }) => asc(organizations.name),
      limit: clampLimit(options.limit, options.userRole)
    }),
    queryOrganizationUsersByOrganizationIds(db, restBaseUrl, organizationIds)
  ])

  const organizationIdSet = new Set(organizationIds)

  return dbOrganizations.map((dbOrganization) => {
    const organization = fromDbOrganization(restBaseUrl, dbOrganization)

    if (!organizationIdSet.has(dbOrganization.id)) {
      return organization
    }

    return {
      ...organization,
      users: usersByOrganizationId[dbOrganization.id] ?? []
    }
  })
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
    location?: OrganizationLocation | null
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
      location: data.location ?? null,
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
    location: OrganizationLocation | null
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
