<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { getOrganizationId } from '$lib/organizations.js'

  import SearchFilter from '$lib/components/SearchFilter.svelte'
  import DataTable from '$lib/components/DataTable.svelte'

  type User = {
    id: string
    name?: string | null
    email?: string | null
    role?: string | null
    createdAt: string
    organizations?: {
      userRole: string
      createdAt?: string
      organization: {
        id: string
        name: string
        slug: string
        logo?: string | null
        createdAt?: string
      }
    }[]
  }

  function getUserId(userIdOrUrl: string) {
    try {
      const url = new URL(userIdOrUrl)
      return url.pathname.split('/').filter(Boolean).at(-1) ?? userIdOrUrl
    } catch {
      return userIdOrUrl
    }
  }

  const apiBaseUrl = $derived(page.data.env.PUBLIC_REST_BASE_URL)

  const PAGE_SIZE = 20

  let searchValue = $state('')
  let searchField = $state('email')
  let offset = $state(0)
  let allUsers = $state<User[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)

  let sortBy = $state<'name' | 'email' | 'createdAt'>('createdAt')
  let sortDir = $state<'asc' | 'desc'>('desc')

  let isFiltering = $derived(searchValue.length > 0)

  let filteredUsers = $derived(
    allUsers.filter((user) => {
      if (!isFiltering) {
        return true
      }

      const normalizedSearchValue = searchValue.toLowerCase()

      if (searchField === 'name') {
        return (user.name ?? '').toLowerCase().includes(normalizedSearchValue)
      }

      return (user.email ?? '').toLowerCase().includes(normalizedSearchValue)
    })
  )

  let total = $derived(filteredUsers.length)

  let displayedUsers = $derived.by(() => {
    const users = [...filteredUsers]

    users.sort((userA, userB) => {
      let valueA: number | string = ''
      let valueB: number | string = ''

      if (sortBy === 'createdAt') {
        valueA = new Date(userA.createdAt).getTime()
        valueB = new Date(userB.createdAt).getTime()
      } else if (sortBy === 'name') {
        valueA = userA.name ?? ''
        valueB = userB.name ?? ''
      } else {
        valueA = userA.email ?? ''
        valueB = userB.email ?? ''
      }

      if (valueA < valueB) {
        return sortDir === 'asc' ? -1 : 1
      }

      if (valueA > valueB) {
        return sortDir === 'asc' ? 1 : -1
      }

      return 0
    })

    return users.slice(offset, offset + PAGE_SIZE)
  })

  async function loadUsers() {
    loading = true
    error = null
    try {
      const response = await fetch(`${apiBaseUrl}/users?limit=10000`, {
        credentials: 'include'
      })

      if (!response.ok) {
        error = 'Failed to load users'
      } else {
        allUsers = await response.json()
      }
    } finally {
      loading = false
    }
  }

  onMount(async () => {
    await loadUsers()
  })

  function search(value: string, field: string) {
    searchValue = value
    searchField = field
    offset = 0
  }

  function sort(col: typeof sortBy) {
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy = col
      sortDir = 'asc'
    }
    offset = 0
  }

  function prevPage() {
    offset = Math.max(0, offset - PAGE_SIZE)
  }

  function nextPage() {
    offset = offset + PAGE_SIZE
  }
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
  <div class="mb-8">
    <h1 class="text-2xl font-sans font-medium text-black">Manage Users</h1>
  </div>

  <div class="mb-4">
    <SearchFilter
      fields={[
        { value: 'email', label: 'Email' },
        { value: 'name', label: 'Name' }
      ]}
      bind:value={searchValue}
      bind:field={searchField}
      onsearch={search}
    />
  </div>

  {#if error}
    <div
      class="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-lg border border-red-200 font-sans text-sm"
    >
      {error}
    </div>
  {/if}

  <DataTable>
    {#snippet thead()}
      <th class="px-3 py-2 @lg:px-4 text-left"
        >{@render sortBtn('name', 'Name')}</th
      >
      <th class="px-3 py-2 @lg:px-4 text-left"
        >{@render sortBtn('email', 'Email')}</th
      >
      <th class="px-3 py-2 @lg:px-4 text-left">
        <span
          class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider"
          >Role</span
        >
      </th>
      <th class="px-3 py-2 @lg:px-4 text-left">
        <span
          class="font-sans text-xs font-medium text-gray-500 uppercase tracking-wider"
          >Organizations</span
        >
      </th>
      <th class="px-3 py-2 @lg:px-4 text-left"
        >{@render sortBtn('createdAt', 'Created')}</th
      >
    {/snippet}

    {#snippet tbody()}
      {#if loading}
        <tr>
          <td
            colspan="5"
            class="px-6 py-12 text-center text-gray-400 font-sans text-sm"
            >Loading...</td
          >
        </tr>
      {:else if displayedUsers.length}
        {#each displayedUsers as user (user.id)}
          <tr class="hover:bg-gray-50 transition">
            <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
              <a
                href="/users/{getUserId(user.id)}"
                class="font-sans text-sm font-medium hover:text-pink"
              >
                {user.name || 'N/A'}
              </a>
            </td>
            <td
              class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap font-sans text-sm text-gray-500"
            >
              {user.email}
            </td>
            <td class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap">
              {#if user.role === 'admin'}
                <span
                  class="rounded px-2 py-0.5 font-sans text-xs font-medium bg-pink-100 text-pink-700"
                >
                  🛡️ Admin
                </span>
              {:else}
                <span
                  class="rounded px-2 py-0.5 font-sans text-xs font-medium bg-gray-100 text-gray-600"
                >
                  👤 User
                </span>
              {/if}
            </td>
            <td class="px-3 py-2 @lg:px-4 @lg:py-3">
              <div class="flex flex-wrap gap-1">
                {#each user.organizations ?? [] as membership (membership.organization.slug)}
                  <a
                    href="/organizations/{getOrganizationId(membership.organization.id)}"
                    class="rounded px-2 py-0.5 font-sans text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    {membership.organization.name}
                  </a>
                {/each}
              </div>
            </td>
            <td
              class="px-3 py-2 @lg:px-4 @lg:py-3 whitespace-nowrap font-sans text-sm text-gray-500"
            >
              {new Date(user.createdAt).toLocaleDateString()}
            </td>
          </tr>
        {/each}
      {:else}
        <tr>
          <td
            colspan="5"
            class="px-6 py-12 text-center text-gray-400 font-sans text-sm"
            >No users found</td
          >
        </tr>
      {/if}
    {/snippet}
  </DataTable>

  {#if !isFiltering && total > PAGE_SIZE}
    <div
      class="mt-4 flex items-center justify-between font-sans text-sm text-gray-500"
    >
      <span
        >Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span
      >
      <div class="flex gap-2">
        <button
          onclick={prevPage}
          disabled={offset === 0}
          class="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
        >
          Previous
        </button>
        <button
          onclick={nextPage}
          disabled={offset + PAGE_SIZE >= total}
          class="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
        >
          Next
        </button>
      </div>
    </div>
  {/if}
</div>
