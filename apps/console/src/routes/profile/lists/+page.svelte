<script lang="ts">
  import { routes } from '$lib/routes.js'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">My Lists</h1>
      <a
        href={routes.newProfileList()}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        New List
      </a>
    </div>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    {#if data.lists.length === 0}
      <p class="text-sm text-gray-500 italic">
        No lists yet. <a
          href={routes.newProfileList()}
          class="text-blue-600 hover:underline">Create your first list.</a
        >
      </p>
    {:else}
      <div class="space-y-2">
        {#each data.lists as list (list.id)}
          <a
            href={routes.profileList(list.id)}
            class="flex items-center justify-between px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
          >
            <div>
              <span class="text-sm font-medium">{list.label || list.name}</span>
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
</div>
