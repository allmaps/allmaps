import { eq } from 'drizzle-orm'

import * as authSchema from '@allmaps/db/schema/auth'

import type { Db } from '@allmaps/db'

export async function queryAdminOrganizations(db: Db) {
  return db
    .select()
    .from(authSchema.organizations)
    .orderBy(authSchema.organizations.createdAt)
}

// Returns all org memberships for a single user — used on the user detail page
export async function queryUserOrganizationsWithRoles(db: Db, userId: string) {
  const rows = await db.query.members.findMany({
    columns: { role: true },
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true
        }
      }
    },
    where: { userId: { eq: userId } },
    orderBy: (members, { asc }) => asc(members.createdAt)
  })

  const organizationsWithRows = []

  for (const row of rows) {
    if (row.organization) {
      organizationsWithRows.push({
        id: row.organization.id,
        name: row.organization.name,
        slug: row.organization.slug,
        logo: row.organization.logo,
        createdAt: row.organization.createdAt,
        memberRole: row.role
      })
    }
  }
  return organizationsWithRows
}

// Returns all memberships grouped by userId — used for bulk loading on the users list page
export async function queryAllUserOrganizations(db: Db) {
  const rows = await db.query.members.findMany({
    columns: { userId: true, role: true },
    with: {
      organization: {
        columns: { id: true, name: true, slug: true }
      }
    }
  })

  const organizationsByUserId: Record<
    string,
    { id: string; name: string; slug: string; memberRole: string }[]
  > = {}

  for (const row of rows) {
    if (!organizationsByUserId[row.userId]) {
      organizationsByUserId[row.userId] = []
    }

    if (row.organization) {
      organizationsByUserId[row.userId].push({
        id: row.organization.id,
        name: row.organization.name,
        slug: row.organization.slug,
        memberRole: row.role
      })
    }
  }

  return organizationsByUserId
}

// Returns all memberships grouped by organizationId — used for bulk loading on the orgs list page
export async function queryAllOrganizationMembers(db: Db) {
  const rows = await db.query.members.findMany({
    columns: { organizationId: true, role: true },
    with: {
      user: {
        columns: { id: true, fullName: true, email: true }
      }
    }
  })

  const mambersByOrganizationId: Record<
    string,
    { id: string; name: string; email: string; memberRole: string }[]
  > = {}
  for (const row of rows) {
    if (!mambersByOrganizationId[row.organizationId]) {
      mambersByOrganizationId[row.organizationId] = []
    }

    if (row.user) {
      mambersByOrganizationId[row.organizationId].push({
        id: row.user.id,
        name: row.user.fullName,
        email: row.user.email,
        memberRole: row.role
      })
    }
  }
  return mambersByOrganizationId
}

export async function queryOrganizationBySlug(db: Db, slug: string) {
  const [organization] = await db
    .select()
    .from(authSchema.organizations)
    .where(eq(authSchema.organizations.slug, slug))
    .limit(1)

  return organization ?? null
}

export async function queryUserByEmail(db: Db, email: string) {
  const [user] = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.email, email))
  return user ?? null
}

export async function queryUsers(db: Db) {
  return db.select().from(authSchema.users).orderBy(authSchema.users.createdAt)
}

export async function queryUserBySlug(db: Db, slug: string) {
  const [user] = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.slug, slug))
    .limit(1)
  return user ?? null
}
