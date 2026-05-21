import { resolve } from '$app/paths'

export type SearchField<T extends string> = 'all' | T
export type SortDirection = 'asc' | 'desc'

export function getSearchField<T extends string>(
  url: URL,
  allowedFields: readonly T[],
  fallback: SearchField<T> = 'all'
): SearchField<T> {
  const field = url.searchParams.get('field')

  if (field === 'all' || allowedFields.includes(field as T)) {
    return field as SearchField<T>
  }

  return fallback
}

export function getSortDirection(
  url: URL,
  fallback: SortDirection
): SortDirection {
  return url.searchParams.get('dir') === 'asc' ? 'asc' : fallback
}

export function getSortField<T extends string>(
  url: URL,
  allowedFields: readonly T[],
  fallback: T
): T {
  const sort = url.searchParams.get('sort')
  return allowedFields.includes(sort as T) ? (sort as T) : fallback
}

export function getOffset(url: URL) {
  const offset = Number(url.searchParams.get('offset') ?? 0)
  return Number.isFinite(offset) && offset > 0 ? offset : 0
}

export function matchesSearch(
  searchValue: string,
  searchableValues: unknown[]
) {
  const normalizedSearchValue = searchValue.trim().toLowerCase()

  if (!normalizedSearchValue) {
    return true
  }

  return searchableValues.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(normalizedSearchValue)
  )
}

export function tableStatePath(
  routeId: string,
  state: {
    searchValue?: string
    searchField?: string
    sortBy?: string
    sortDir?: SortDirection
    offset?: number
  }
) {
  const params = new URLSearchParams()

  if (state.searchValue) {
    params.set('q', state.searchValue)
  }

  if (state.searchField && state.searchField !== 'all') {
    params.set('field', state.searchField)
  }

  if (state.sortBy) {
    params.set('sort', state.sortBy)
  }

  if (state.sortDir) {
    params.set('dir', state.sortDir)
  }

  if (state.offset) {
    params.set('offset', String(state.offset))
  }

  const queryString = params.toString()
  const path = resolve(routeId as '/')

  return queryString ? `${path}?${queryString}` : path
}
