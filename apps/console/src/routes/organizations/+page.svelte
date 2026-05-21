<script lang="ts">
  import { replaceState } from '$app/navigation'
  import { page } from '$app/state'

  import SearchFilter from '$lib/components/SearchFilter.svelte'
  import DataTable from '$lib/components/DataTable.svelte'
  import { getOrganizationId, getUserId } from '$lib/organizations.js'
  import { queryResult } from '$lib/query-result.js'
  import { routes } from '$lib/routes.js'
  import {
    getSearchField,
    getSortDirection,
    getSortField,
    matchesSearch as matchesSearchValue,
    tableStatePath
  } from '$lib/table.js'
  import { getOrganizations } from './organizations.remote.js'

  import type { Organization } from '$lib/types.js'

  const organizationSearchFields = ['name', 'slug', 'domain'] as const
  const organizationSortFields = ['name', 'slug', 'plan', 'createdAt'] as const

  let searchValue = $state(page.url.searchParams.get('q') ?? '')
  let searchField = $state(getSearchField(page.url, organizationSearchFields))

  let sortBy = $state(getSortField(page.url, organizationSortFields, 'plan'))
  let sortDir = $state(getSortDirection(page.url, 'desc'))

  const planOrder: Record<string, number> = { supporter: 1, innovator: 2 }

  function replaceTableState() {
    const path = tableStatePath('/organizations', {
      searchValue,
      searchField,
      sortBy: sortBy === 'plan' ? undefined : sortBy,
      sortDir: sortDir === 'desc' ? undefined : sortDir
    })

    if (path !== `${page.url.pathname}${page.url.search}`) {
      replaceState(path, page.state)
    }
  }

  function sort(col: typeof sortBy) {
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy = col
      sortDir = col === 'createdAt' ? 'desc' : 'asc'
    }
    replaceTableState()
  }

  function search(value: string, field: string) {
    searchValue = value
    searchField =
      field === 'name' || field === 'slug' || field === 'domain' ? field : 'all'
    replaceTableState()
  }

  function organizationMatchesSearch(organization: Organization) {
    const normalizedSearchValue = searchValue.trim().toLowerCase()

    if (!normalizedSearchValue) {
      return true
    }

    if (searchField === 'slug') {
      return matchesSearchValue(normalizedSearchValue, [organization.slug])
    }

    if (searchField === 'domain') {
      return matchesSearchValue(
        normalizedSearchValue,
        organization.domains ?? []
      )
    }

    if (searchField === 'name') {
      return matchesSearchValue(normalizedSearchValue, [organization.name])
    }

    const searchableValues = [
      organization.name,
      organization.slug,
      organization.plan,
      organization.homepage,
      ...(organization.domains ?? [])
    ]

    return matchesSearchValue(normalizedSearchValue, searchableValues)
  }

  function getDisplayedOrganizations(allOrganizations: Organization[]) {
    let organizations = allOrganizations.filter(organizationMatchesSearch)

    organizations.sort((a: Organization, b: Organization) => {
      let av: number | string
      let bv: number | string
      if (sortBy === 'createdAt') {
        av = new Date(a.createdAt).getTime()
        bv = new Date(b.createdAt).getTime()
      } else if (sortBy === 'plan') {
        av = planOrder[a.plan ?? ''] ?? 0
        bv = planOrder[b.plan ?? ''] ?? 0
      } else {
        av = a[sortBy] ?? ''
        bv = b[sortBy] ?? ''
      }

      if (av < bv) {
        return sortDir === 'asc' ? -1 : 1
      } else if (av > bv) {
        return sortDir === 'asc' ? 1 : -1
      } else {
        return 0
      }
    })

    return organizations
  }

  const organizationsResult = $derived(await queryResult(getOrganizations()))
</script>

{#snippet sortIcon(col: string)}
  {#if sortBy === col}
    <span class="ml-1 text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
  {:else}
    <span class="ml-1 text-gray-300">↕</span>
  {/if}
{/snippet}

{#snippet sortBtn(col: typeof sortBy, label: string)}
  <button
    onclick={() => sort(col)}
    class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-black cursor-pointer"
  >
    {label}{@render sortIcon(col)}
  </button>
{/snippet}

<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-sans font-medium text-black">
        Manage Organizations
      </h1>
    </div>
    <a
      href={routes.newOrganization()}
      class="px-4 py-2 bg-blue-500 text-white rounded-lg font-sans text-sm hover:bg-blue-600 transition"
    >
      Create Organization
    </a>
  </div>

  <div class="mb-4">
    <SearchFilter
      fields={[
        { value: 'all', label: 'All' },
        { value: 'name', label: 'Name' },
        { value: 'slug', label: 'Slug' },
        { value: 'domain', label: 'Domain' }
      ]}
      bind:value={searchValue}
      bind:field={searchField}
      onsearch={search}
    />
  </div>

  {#if organizationsResult.data}
    {@const organizations = organizationsResult.data}
    {@const displayedOrganizations = getDisplayedOrganizations(organizations)}
    <DataTable>
      {#snippet thead()}
        <th class="px-3 py-2 @lg:px-4 text-left"
          >{@render sortBtn('name', 'Name')}</th
        >
        <th class="px-3 py-2 @lg:px-4 text-left"
          >{@render sortBtn('plan', 'Plan')}</th
        >
        <th class="px-3 py-2 @lg:px-4 text-left"
          >{@render sortBtn('slug', 'Slug')}</th
        >
        <th class="px-3 py-2 @lg:px-4 text-left">
          <span
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Domains</span
          >
        </th>
        <th class="px-3 py-2 @lg:px-4 text-left">
          <span
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider"
            >Members</span
          >
        </th>
        <th class="px-3 py-2 @lg:px-4 text-left"
          >{@render sortBtn('createdAt', 'Created')}</th
        >
      {/snippet}

      {#snippet tbody()}
        {#if displayedOrganizations.length > 0}
          {#each displayedOrganizations as organization (organization.id)}
            <tr class="hover:bg-gray-50 transition">
              <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
                <a
                  href={routes.organization(getOrganizationId(organization.id))}
                  class="font-sans text-sm font-medium hover:text-pink"
                >
                  {organization.name}
                </a>
              </td>
              <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
                {#if organization.plan === 'supporter'}
                  <span
                    class="rounded px-2 py-0.5 font-sans text-xs font-medium bg-green-100 text-green-700"
                  >
                    🌱 Supporter
                  </span>
                {:else if organization.plan === 'innovator'}
                  <span
                    class="rounded px-2 py-0.5 font-sans text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    🚀 Innovator
                  </span>
                {:else}
                  <span class="font-sans text-xs text-gray-300">—</span>
                {/if}
              </td>
              <td
                class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap font-sans text-sm text-gray-500"
              >
                {organization.slug}
              </td>
              <td class="px-3 py-2 @lg:px-4 @lg:py-3">
                <div class="flex flex-wrap gap-1">
                  {#each organization.domains ?? [] as domain (domain)}
                    <span
                      class="rounded px-2 py-0.5 font-sans text-xs bg-gray-100 text-gray-600"
                    >
                      {domain}
                    </span>
                  {/each}
                </div>
              </td>
              <td class="px-3 py-2 @lg:px-4 @lg:py-3">
                <div class="flex flex-wrap gap-1">
                  {#each organization.users ?? [] as member (member.user.id)}
                    <a
                      href={routes.user(getUserId(member.user.id))}
                      class="rounded px-2 py-0.5 font-sans text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                    >
                      {member.user.name || member.user.id}
                    </a>
                  {/each}
                </div>
              </td>
              <td
                class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap font-sans text-sm text-gray-500"
              >
                {new Date(organization.createdAt).toLocaleDateString()}
              </td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td
              colspan="6"
              class="px-6 py-12 text-center text-gray-400 font-sans text-sm"
            >
              No organizations found
            </td>
          </tr>
        {/if}
      {/snippet}
    </DataTable>
  {:else}
    <p class="px-6 py-12 text-center text-gray-400 font-sans text-sm">
      Failed to load organizations
    </p>
  {/if}
</div>
