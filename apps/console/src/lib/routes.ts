import { resolve } from '$app/paths'

export const routes = {
  home: () => resolve('/'),
  users: () => resolve('/users'),
  user: (userId: string) => resolve('/users/[userId]', { userId }),
  organizations: () => resolve('/organizations'),
  newOrganization: () => resolve('/organizations/new'),
  organization: (organizationId: string) =>
    resolve('/organizations/[organizationId]', { organizationId }),
  profileLists: () => resolve('/profile/lists'),
  newProfileList: () => resolve('/profile/lists/new'),
  profileList: (listId: string) =>
    resolve('/profile/lists/[listId]', { listId })
}
