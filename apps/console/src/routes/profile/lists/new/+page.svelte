<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'

  const apiBaseUrl = $derived(page.data.env.PUBLIC_REST_BASE_URL)

  let name = $state('')
  let error = $state<string | null>(null)
  let submitting = $state(false)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = null
    submitting = true

    try {
      const r = await fetch(`${apiBaseUrl}/lists`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim()
        })
      })

      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        error = (data as { error?: string }).error ?? `Error ${r.status}`
        return
      }

      goto('/profile/lists')
    } catch {
      error = 'Network error. Please try again.'
    } finally {
      submitting = false
    }
  }
</script>

<div class="max-w-xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">New List</h1>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          bind:value={name}
          required
          placeholder="My List"
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="mt-1 text-xs text-gray-500">
          Display name. Spaces and capital letters are allowed.
        </p>
      </div>

      {#if error}
        <p class="text-sm text-red-600">{error}</p>
      {/if}

      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating...' : 'Create List'}
        </button>
        <a
          href="/profile/lists"
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  </div>
</div>
