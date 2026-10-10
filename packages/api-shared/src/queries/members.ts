import { and, eq } from 'drizzle-orm'
import * as authSchema from '@allmaps/db/schema/auth'
import type { Db } from '@allmaps/db'
import { getOrganizationPermissions } from '../shared/permissions.js'
import { ResponseError } from '../shared/errors.js'

// Better Auth's update/remove APIs require the actor to be an organization
// member. Allmaps also permits global managers without membership and needs
// an organization lock to protect the last owner from concurrent changes.
export async function changeOrganizationMember(
  db: Db,
  organizationId: string,
  userId: string,
  role: 'owner' | 'member' | null,
  actor: { id: string; role?: string | null }
) {
  return db.transaction(async (tx) => {
    // Serialize membership changes so concurrent requests cannot remove
    // the last owner. Recheck the caller after acquiring the lock.
    const [organization] = await tx
      .select({ id: authSchema.organizations.id })
      .from(authSchema.organizations)
      .where(eq(authSchema.organizations.id, organizationId))
      .for('update')
    if (!organization) {
      throw new ResponseError('Organization not found', 404)
    }

    const members = await tx
      .select()
      .from(authSchema.members)
      .where(eq(authSchema.members.organizationId, organizationId))
    const actorMember = members.find((member) => member.userId === actor.id)
    const permissions = getOrganizationPermissions(
      actor.role,
      actorMember?.role
    )
    if (!permissions.canManageMembers) {
      throw new ResponseError('Forbidden', 403)
    }
    const member = members.find((member) => member.userId === userId)
    if (!member) {
      throw new ResponseError('Organization member not found', 404)
    }
    if (
      !permissions.canAssignOwner &&
      (member.role === 'owner' || role === 'owner')
    ) {
      throw new ResponseError(
        'Only Allmaps admins and collaborators can manage owners',
        403
      )
    }
    if (
      member.role === 'owner' &&
      role !== 'owner' &&
      members.filter((member) => member.role === 'owner').length <= 1
    ) {
      throw new ResponseError('The organization must retain an Owner', 409)
    }
    const where = and(
      eq(authSchema.members.organizationId, organizationId),
      eq(authSchema.members.id, member.id)
    )
    if (role === null) {
      await tx.delete(authSchema.members).where(where)
      return { success: true }
    }
    const [updatedMember] = await tx
      .update(authSchema.members)
      .set({ role })
      .where(where)
      .returning()
    return updatedMember
  })
}
