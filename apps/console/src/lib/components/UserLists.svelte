<script lang="ts">
  import { getLists } from '$lib/lists.remote.js'
  import { queryResult } from '$lib/query-result.js'

  import type { ListSummary } from '$lib/lists.remote.js'

  const listsResult = $derived(await queryResult<ListSummary[]>(getLists()))
</script>

{#if listsResult.data}
  {@const lists = listsResult.data}
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">My Lists</h2>
      <a
        href="/profile/lists/new"
        class="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        New List
      </a>
    </div>
    {#if lists.length === 0}
      <p class="text-sm text-gray-500 italic">No lists yet.</p>
    {:else}
      <div class="space-y-2">
        {#each lists as list (list.id)}
          <a
            href="/profile/lists/{list.id}"
            class="flex items-center justify-between px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
          >
            <span class="text-sm font-medium">{list.label || list.name}</span>
            {#if list.label}
              <span class="text-xs text-gray-400 font-mono">{list.name}</span>
            {/if}
          </a>
        {/each}
        <div class="pt-1">
          <a
            href="/profile/lists"
            class="text-sm text-blue-600 hover:underline"
          >
            View all lists &rarr;
          </a>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold mb-4">My Lists</h2>
    <p class="text-sm text-red-600">Failed to load lists.</p>
  </div>
{/if}
