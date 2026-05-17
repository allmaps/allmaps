export const usersListPageState = $state({
  searchValue: '',
  searchField: 'email' as 'email' | 'name',
  offset: 0,
  sortBy: 'createdAt' as 'name' | 'email' | 'createdAt',
  sortDir: 'desc' as 'asc' | 'desc'
})

export const organizationsListPageState = $state({
  searchValue: '',
  searchField: 'name' as 'name' | 'slug',
  sortBy: 'plan' as 'name' | 'slug' | 'plan' | 'createdAt',
  sortDir: 'desc' as 'asc' | 'desc'
})
