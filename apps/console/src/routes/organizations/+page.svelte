<script lang="ts">
  import { replaceState } from '$app/navigation'
  import { page } from '$app/state'
  import { Tooltip } from 'bits-ui'
  import {
    GpsFix as GpsFixIcon,
    Image as ImageIcon,
    Stack as StackIcon
  } from 'phosphor-svelte'

  import SearchFilter from '$lib/components/SearchFilter.svelte'
  import DataTable from '$lib/components/DataTable.svelte'
  import StatusIconTooltip from '$lib/components/StatusIconTooltip.svelte'
  import { getOrganizationId, getUserId } from '$lib/organizations.js'
  import {
    organizationPlanDetails,
    organizationPlanOrder
  } from '$lib/organization-plans.js'
  import { routes } from '$lib/routes.js'
  import {
    getSearchField,
    getSortDirection,
    getSortField,
    matchesSearch as matchesSearchValue,
    tableStatePath
  } from '$lib/table.js'

  import type { PageProps } from './$types.js'
  import type { Organization } from '$lib/types.js'

  let { data }: PageProps = $props()

  const organizationSearchFields = ['name', 'slug', 'domain'] as const
  const organizationSortFields = ['name', 'slug', 'plan', 'createdAt'] as const
  type OrganizationSearchField =
    'all' | (typeof organizationSearchFields)[number]
  type OrganizationSortField = (typeof organizationSortFields)[number]

  let searchValue = $state(page.url.searchParams.get('q') ?? '')
  let searchField = $state(getSearchField(page.url, organizationSearchFields))

  let sortBy = $state(getSortField(page.url, organizationSortFields, 'plan'))
  let sortDir = $state(getSortDirection(page.url, 'desc'))

  function replaceTableState({
    nextSearchValue = searchValue,
    nextSearchField = searchField,
    nextSortBy = sortBy,
    nextSortDir = sortDir
  }: {
    nextSearchValue?: string
    nextSearchField?: OrganizationSearchField
    nextSortBy?: OrganizationSortField
    nextSortDir?: typeof sortDir
  } = {}) {
    const path = tableStatePath('/organizations', {
      searchValue: nextSearchValue,
      searchField: nextSearchField,
      sortBy: nextSortBy === 'plan' ? undefined : nextSortBy,
      sortDir: nextSortDir === 'desc' ? undefined : nextSortDir
    })

    if (path !== `${page.url.pathname}${page.url.search}`) {
      // eslint-disable-next-line svelte/no-navigation-without-resolve -- table state paths are constructed from the active route
      replaceState(path, page.state)
    }
  }

  function sort(col: OrganizationSortField) {
    const nextSortBy = col
    const nextSortDir =
      sortBy === col
        ? sortDir === 'asc'
          ? 'desc'
          : 'asc'
        : col === 'createdAt'
          ? 'desc'
          : 'asc'

    sortBy = nextSortBy
    sortDir = nextSortDir
    replaceTableState({ nextSortBy, nextSortDir })
  }

  function search(value: string, field: string) {
    const nextSearchField =
      field === 'name' || field === 'slug' || field === 'domain' ? field : 'all'

    searchValue = value
    searchField = nextSearchField
    replaceTableState({
      nextSearchValue: value,
      nextSearchField
    })
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

  const organizations = $derived(data.organizations)
  const displayedOrganizations = $derived.by(() => {
    const nextOrganizations = organizations.filter(organizationMatchesSearch)

    nextOrganizations.sort((a: Organization, b: Organization) => {
      let av: number | string
      let bv: number | string
      if (sortBy === 'createdAt') {
        av = new Date(a.createdAt).getTime()
        bv = new Date(b.createdAt).getTime()
      } else if (sortBy === 'plan') {
        av = a.plan ? organizationPlanOrder[a.plan] : 0
        bv = b.plan ? organizationPlanOrder[b.plan] : 0
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

    return nextOrganizations
  })
</script>

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

  {#if organizations}
    <DataTable>
      {#snippet thead()}
        <th class="px-3 py-2 @lg:px-4 text-left">
          <button
            type="button"
            onclick={() => sort('name')}
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-black cursor-pointer"
          >
            Name
            {#if sortBy === 'name'}
              <span class="ml-1 text-blue-500"
                >{sortDir === 'asc' ? '↑' : '↓'}</span
              >
            {:else}
              <span class="ml-1 text-gray-300">↕</span>
            {/if}
          </button>
        </th>
        <th class="px-3 py-2 @lg:px-4 text-left">
          <button
            type="button"
            onclick={() => sort('plan')}
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-black cursor-pointer"
          >
            Plan
            {#if sortBy === 'plan'}
              <span class="ml-1 text-blue-500"
                >{sortDir === 'asc' ? '↑' : '↓'}</span
              >
            {:else}
              <span class="ml-1 text-gray-300">↕</span>
            {/if}
          </button>
        </th>
        <th class="px-3 py-2 @lg:px-4 text-left">
          <button
            type="button"
            onclick={() => sort('slug')}
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-black cursor-pointer"
          >
            Slug
            {#if sortBy === 'slug'}
              <span class="ml-1 text-blue-500"
                >{sortDir === 'asc' ? '↑' : '↓'}</span
              >
            {:else}
              <span class="ml-1 text-gray-300">↕</span>
            {/if}
          </button>
        </th>
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
        <th class="px-3 py-2 @lg:px-4 text-left">
          <button
            type="button"
            onclick={() => sort('createdAt')}
            class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-black cursor-pointer"
          >
            Created
            {#if sortBy === 'createdAt'}
              <span class="ml-1 text-blue-500"
                >{sortDir === 'asc' ? '↑' : '↓'}</span
              >
            {:else}
              <span class="ml-1 text-gray-300">↕</span>
            {/if}
          </button>
        </th>
      {/snippet}

      {#snippet tbody()}
        {#if displayedOrganizations.length > 0}
          {#each displayedOrganizations as organization (organization.id)}
            <tr class="hover:bg-gray-50 transition">
              <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <a
                    href={routes.organization(
                      getOrganizationId(organization.id)
                    )}
                    class="font-sans text-sm font-medium hover:text-pink"
                  >
                    {organization.name}
                  </a>
                  <Tooltip.Provider delayDuration={200}>
                    <div class="flex items-center gap-1">
                      {#if organization.location}
                        <StatusIconTooltip
                          label={`Location: ${organization.location.coordinates[1]}, ${organization.location.coordinates[0]}`}
                        >
                          <GpsFixIcon
                            size="14"
                            weight="bold"
                            class="text-blue-500"
                            aria-hidden="true"
                          />
                        </StatusIconTooltip>
                      {/if}
                      {#if organization.displayCollections}
                        <StatusIconTooltip
                          label="Collections are visible in public discovery"
                        >
                          <StackIcon
                            size="14"
                            weight="bold"
                            class="text-green-600"
                            aria-hidden="true"
                          />
                        </StatusIconTooltip>
                      {/if}
                      {#if organization.logo}
                        <StatusIconTooltip
                          label={`Logo URL: ${organization.logo}`}
                          imageUrl={organization.logo}
                          imageAlt={`${organization.name} logo`}
                          showLabel={false}
                        >
                          <ImageIcon
                            size="14"
                            weight="bold"
                            class="text-purple-500"
                            aria-hidden="true"
                          />
                        </StatusIconTooltip>
                      {/if}
                    </div>
                  </Tooltip.Provider>
                </div>
              </td>
              <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
                {#if organization.plan}
                  {@const planDetails =
                    organizationPlanDetails[organization.plan]}
                  <span
                    class="rounded px-2 py-0.5 font-sans text-xs font-medium {planDetails.class}"
                  >
                    {planDetails.icon}
                    {planDetails.label}
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
