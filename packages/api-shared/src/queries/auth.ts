import { eq, inArray } from 'drizzle-orm'

import * as authSchema from '@allmaps/db/schema/auth'

import { clampLimit } from '../shared/limits.js'

import type { Db } from '@allmaps/db'
import type { UserRole } from '../shared/limits.js'

type DbUser = typeof authSchema.users.$inferSelect & {
  members?: {
    role: string
    createdAt?: Date
    organization: {
      id: string
      name: string
      slug: string
      logo: string | null
      createdAt: Date
    } | null
  }[]
}

function fromDbOrganizationMembership(
  restBaseUrl: string,
  memberCreatedAt: Date | undefined,
  organization: {
    id: string
    name: string
    slug: string
    logo?: string | null
    createdAt?: Date
  },
  userRole: string
) {
  return {
    userRole,
    createdAt: memberCreatedAt,
    organization: {
      id: `${restBaseUrl}/organizations/${organization.id}`,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo ?? null,
      createdAt: organization.createdAt
    }
  }
}

export function fromDbUser(restBaseUrl: string, user: DbUser) {
  return {
    id: `${restBaseUrl}/users/${user.id}`,
    name: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isAnonymous: user.isAnonymous,
    role: user.role,
    banned: user.banned,
    banReason: user.banReason,
    banExpires: user.banExpires,
    slug: user.slug,
    ...(user.members
      ? {
          organizations: user.members
            .filter(
              (
                member
              ): member is typeof member & {
                organization: NonNullable<typeof member.organization>
              } => member.organization !== null
            )
            .map((member) =>
              fromDbOrganizationMembership(
                restBaseUrl,
                member.createdAt,
                member.organization,
                member.role
              )
            )
        }
      : {})
  }
}

export async function queryAdminOrganizationById(
  db: Db,
  organizationId: string
) {
  const [organization] = await db
    .select()
    .from(authSchema.organizations)
    .where(eq(authSchema.organizations.id, organizationId))
    .limit(1)

  return organization
}

// Returns all org memberships for a single user — used on the user detail page
export async function queryUserOrganizationsWithRoles(
  db: Db,
  restBaseUrl: string,
  userId: string
) {
  const rows = await db.query.members.findMany({
    columns: { role: true, createdAt: true },
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
      organizationsWithRows.push(
        fromDbOrganizationMembership(
          restBaseUrl,
          row.createdAt,
          row.organization,
          row.role
        )
      )
    }
  }
  return organizationsWithRows
}

export async function queryAllOrganizationUsers(db: Db, restBaseUrl: string) {
  const rows = await db.query.members.findMany({
    columns: { organizationId: true, role: true, createdAt: true },
    with: {
      user: {
        columns: { id: true, fullName: true, email: true }
      }
    }
  })

  const usersByOrganizationId: Record<
    string,
    {
      role: string
      createdAt: Date
      user: { id: string; name: string; email: string }
    }[]
  > = {}

  for (const row of rows) {
    if (!usersByOrganizationId[row.organizationId]) {
      usersByOrganizationId[row.organizationId] = []
    }

    if (row.user) {
      usersByOrganizationId[row.organizationId].push({
        role: row.role,
        createdAt: row.createdAt,
        user: {
          id: `${restBaseUrl}/users/${row.user.id}`,
          name: row.user.fullName,
          email: row.user.email
        }
      })
    }
  }

  return usersByOrganizationId
}

export async function queryOrganizationIdsByUserId(db: Db, userId: string) {
  const rows = await db.query.members.findMany({
    columns: { organizationId: true },
    where: { userId: { eq: userId } }
  })

  return rows.map((row) => row.organizationId)
}

export async function queryOrganizationUsersByOrganizationIds(
  db: Db,
  restBaseUrl: string,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) {
    return {}
  }

  const rows = await db
    .select({
      organizationId: authSchema.members.organizationId,
      role: authSchema.members.role,
      createdAt: authSchema.members.createdAt,
      userId: authSchema.users.id,
      userName: authSchema.users.fullName,
      userEmail: authSchema.users.email
    })
    .from(authSchema.members)
    .innerJoin(
      authSchema.users,
      eq(authSchema.members.userId, authSchema.users.id)
    )
    .where(inArray(authSchema.members.organizationId, organizationIds))

  const usersByOrganizationId: Record<
    string,
    {
      role: string
      createdAt: Date
      user: { id: string; name: string; email: string }
    }[]
  > = {}

  for (const row of rows) {
    if (!usersByOrganizationId[row.organizationId]) {
      usersByOrganizationId[row.organizationId] = []
    }

    usersByOrganizationId[row.organizationId].push({
      role: row.role,
      createdAt: row.createdAt,
      user: {
        id: `${restBaseUrl}/users/${row.userId}`,
        name: row.userName,
        email: row.userEmail
      }
    })
  }

  return usersByOrganizationId
}

export async function queryOrganizationMembersById(
  db: Db,
  restBaseUrl: string,
  organizationId: string
) {
  const rows = await db.query.members.findMany({
    columns: {
      id: true,
      userId: true,
      role: true,
      createdAt: true
    },
    with: {
      user: {
        columns: {
          fullName: true,
          email: true
        }
      }
    },
    where: {
      organizationId: {
        eq: organizationId
      }
    },
    orderBy: (members, { asc }) => asc(members.createdAt)
  })

  return rows
    .filter(
      (
        row
      ): row is typeof row & {
        user: NonNullable<typeof row.user>
      } => row.user !== null
    )
    .map((row) => ({
      role: row.role,
      createdAt: row.createdAt,
      user: {
        id: `${restBaseUrl}/users/${row.userId}`,
        name: row.user.fullName,
        email: row.user.email
      }
    }))
}

export async function queryOrganizationMemberByUserId(
  db: Db,
  organizationId: string,
  userId: string
) {
  return db.query.members.findFirst({
    columns: {
      id: true,
      userId: true,
      role: true,
      createdAt: true
    },
    where: {
      organizationId: {
        eq: organizationId
      },
      userId: {
        eq: userId
      }
    }
  })
}

export async function queryUserByEmail(db: Db, email: string) {
  const [user] = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.email, email))
  return user ?? null
}

export async function queryUserById(
  db: Db,
  restBaseUrl: string,
  userId: string
) {
  const [user] = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.id, userId))
    .limit(1)

  if (!user) {
    return null
  }

  return fromDbUser(restBaseUrl, user)
}

export async function queryUserWithOrganizationsById(
  db: Db,
  restBaseUrl: string,
  userId: string
) {
  const [user, organizations] = await Promise.all([
    queryUserById(db, restBaseUrl, userId),
    queryUserOrganizationsWithRoles(db, restBaseUrl, userId)
  ])

  if (!user) {
    return null
  }

  return {
    ...user,
    organizations
  }
}

export async function queryUsers(
  db: Db,
  restBaseUrl: string,
  limit?: number,
  includeOrganizations = false,
  userRole?: UserRole
) {
  if (includeOrganizations) {
    const users = await db.query.users.findMany({
      with: {
        members: {
          columns: {
            role: true,
            createdAt: true
          },
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
          }
        }
      },
      where: {
        isAnonymous: {
          eq: false
        }
      },
      orderBy: (users, { asc }) => asc(users.createdAt),
      limit: clampLimit(limit, userRole)
    })

    return users.map((user) => fromDbUser(restBaseUrl, user))
  }

  const users = await db
    .select()
    .from(authSchema.users)
    .where(eq(authSchema.users.isAnonymous, false))
    .orderBy(authSchema.users.createdAt)
    .limit(clampLimit(limit, userRole))

  return users.map((user) => fromDbUser(restBaseUrl, user))
}
