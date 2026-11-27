import {
  needsElevatedLimitRole,
  normalizeMapsQueryParams,
  type UserRole
} from '@allmaps/api-shared'

export async function readAnnotationQuery(
  request: Request,
  getLimitRole: () => Promise<UserRole>
) {
  const filters = normalizeMapsQueryParams(request)
  const userRole = needsElevatedLimitRole(filters.limit)
    ? await getLimitRole()
    : 'public'
  return { filters, userRole }
}
