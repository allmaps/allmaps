export const usersListPageState = $state({
  searchValue: '',
  searchField: 'email' as 'email' | 'name',
  offset: 0,
  sortBy: 'createdAt' as 'name' | 'email' | 'createdAt',
  sortDir: 'desc' as 'asc' | 'desc'
})

export const organizationsListPageState = $state({
  searchValue: '',
  searchField: 'all' as 'all' | 'name' | 'slug' | 'domain',
  sortBy: 'plan' as 'name' | 'slug' | 'plan' | 'createdAt',
  sortDir: 'desc' as 'asc' | 'desc'
})
