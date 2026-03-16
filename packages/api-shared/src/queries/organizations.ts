import { eq } from 'drizzle-orm'

import { generateRandomId } from '@allmaps/id/sync'

import * as authSchema from '@allmaps/db/schema/auth'
import * as organizationsSchema from '@allmaps/db/schema/organizations'

import type { Db, DbOrTx } from '@allmaps/db'

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

export function formatOrganization(
  org: typeof authSchema.organizations.$inferSelect,
  urls: (typeof organizationsSchema.organizationUrls.$inferSelect)[]
) {
  return {
    ...org,
    domains: urls.filter((u) => u.type === 'domain').map((u) => u.url)
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

export async function listOrganizations(db: Db) {
  const orgs = await db
    .select()
    .from(authSchema.organizations)
    .orderBy(authSchema.organizations.name)

  const urls = await db.select().from(organizationsSchema.organizationUrls)

  return orgs.map((org) =>
    formatOrganization(
      org,
      urls.filter((u) => u.organizationId === org.id)
    )
  )
}

export async function queryOrganizationByIdOrSlug(
  db: Db,
  organizationId: string
) {
  const isId = /^[0-9a-f]+$/.test(organizationId)
  const [organization] = await db
    .select()
    .from(authSchema.organizations)
    .where(
      isId
        ? eq(authSchema.organizations.id, organizationId)
        : eq(authSchema.organizations.slug, organizationId)
    )

  if (!organization) {
    return
  }

  const urls = await queryOrganizationUrls(db, organization.id)
  return formatOrganization(organization, urls)
}

export async function createOrganization(
  db: Db,
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
  return formatOrganization(organization, urls)
}

export async function updateOrganization(
  db: Db,
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
    return formatOrganization(organization, urls)
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
