<script lang="ts">
  import { page } from '$app/state'
  import type { PageProps } from './$types'

  const apiBaseUrl = $derived(page.data.env.PUBLIC_REST_BASE_URL)

  let { data }: PageProps = $props()

  type List = {
    id: string
    name: string
    label: string | null
    createdAt: string
  }

  async function fetchLists(): Promise<List[]> {
    const r = await fetch(`${apiBaseUrl}/lists`, {
      credentials: 'include'
    })
    return r.ok ? r.json() : []
  }
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">My Lists</h1>
      <a
        href="/profile/lists/new"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        New List
      </a>
    </div>
  </div>

  {#await data.sessionData}
    <p class="text-gray-500">Loading...</p>
  {:then sessionData}
    {@const user = sessionData.data?.user}

    {#if user?.id}
      {#await fetchLists()}
        <div class="bg-white rounded-lg shadow p-6">
          <p class="text-sm text-gray-500">Loading lists...</p>
        </div>
      {:then lists}
        <div class="bg-white rounded-lg shadow p-6">
          {#if lists.length === 0}
            <p class="text-sm text-gray-500 italic">
              No lists yet. <a
                href="/profile/lists/new"
                class="text-blue-600 hover:underline">Create your first list.</a
              >
            </p>
          {:else}
            <div class="space-y-2">
              {#each lists as list (list.id)}
                <a
                  href="/profile/lists/{list.id}"
                  class="flex items-center justify-between px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
                >
                  <div>
                    <span class="text-sm font-medium"
                      >{list.label || list.name}</span
                    >
                    {#if list.label}
                      <span class="ml-2 text-xs text-gray-400 font-mono"
                        >{list.name}</span
                      >
                    {/if}
                  </div>
                  <span class="text-xs text-gray-400">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </span>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/await}
    {:else}
      <p class="text-gray-500">Not signed in.</p>
    {/if}
  {/await}
</div>
