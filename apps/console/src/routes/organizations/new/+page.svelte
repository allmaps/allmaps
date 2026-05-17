<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  const apiBaseUrl = $derived(page.data.env.PUBLIC_REST_BASE_URL)

  let newOrganizationName = $state('')
  let newOrganizationSlug = $state('')
  let isCreating = $state(false)
  let error = $state<string | null>(null)

  function isValidSlug(value: string) {
    return /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value.trim())
  }

  async function createOrganization() {
    if (!newOrganizationName || !newOrganizationSlug) {
      return
    }

    if (!isValidSlug(newOrganizationSlug)) {
      error =
        'Invalid slug. Use lowercase letters, numbers, and hyphens, starting with a letter.'
      return
    }

    isCreating = true
    error = null
    try {
      const response = await fetch(`${apiBaseUrl}/organizations`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newOrganizationName,
          slug: newOrganizationSlug,
          plan: null
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        error = errorText || 'Failed to create organization'
        return
      }

      goto('/organizations')
    } catch (err) {
      console.error('Failed to create organization:', err)
      error =
        err instanceof Error ? err.message : 'Failed to create organization'
    } finally {
      isCreating = false
    }
  }
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">Create New Organization</h1>
  </div>

  {#if error}
    <div
      class="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-lg border border-red-200 font-sans text-sm"
    >
      {error}
    </div>
  {/if}

  <div class="bg-white rounded-lg shadow p-6">
    <div class="space-y-4">
      <div>
        <label
          for="orgName"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Organization Name
        </label>
        <input
          id="orgName"
          type="text"
          bind:value={newOrganizationName}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="New Organization"
        />
      </div>
      <div>
        <label
          for="orgSlug"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Slug (URL-friendly identifier)
        </label>
        <input
          id="orgSlug"
          type="text"
          bind:value={newOrganizationSlug}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="new-organization"
        />
        <p class="mt-1 text-sm text-gray-500">
          This will be used in URLs and must be unique
        </p>
      </div>
    </div>
    <div class="flex gap-3 justify-end mt-6">
      <a
        href="/organizations"
        class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition inline-block"
      >
        Cancel
      </a>
      <button
        onclick={createOrganization}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        disabled={!newOrganizationName || !newOrganizationSlug || isCreating}
      >
        {isCreating ? 'Creating...' : 'Create Organization'}
      </button>
    </div>
  </div>
</div>
