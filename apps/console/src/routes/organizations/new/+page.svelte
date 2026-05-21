<script lang="ts">
  import { routes } from '$lib/routes.js'
  import { createOrganizationForm } from '../organizations.remote.js'

  const slugPattern = '^[a-z](?:[a-z0-9-]*[a-z0-9])?$'
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">Create New Organization</h1>
  </div>

  {#if createOrganizationForm.result}
    <div
      class="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-lg border border-red-200 font-sans text-sm"
    >
      Could not create organization. Check the fields and try again.
    </div>
  {/if}

  <div class="bg-white rounded-lg shadow p-6">
    <form {...createOrganizationForm} class="space-y-4">
      <div>
        <label
          for="orgName"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          Organization Name
        </label>
        <input
          id="orgName"
          {...createOrganizationForm.fields.name.as('text')}
          required
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
          {...createOrganizationForm.fields.slug.as('text')}
          required
          pattern={slugPattern}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="new-organization"
        />
        <p class="mt-1 text-sm text-gray-500">
          This will be used in URLs and must be unique
        </p>
      </div>

      <div class="flex gap-3 justify-end mt-6">
        <a
          href={routes.organizations()}
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition inline-block"
        >
          Cancel
        </a>
        <button
          type="submit"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          disabled={!!createOrganizationForm.pending}
        >
          {createOrganizationForm.pending
            ? 'Creating...'
            : 'Create Organization'}
        </button>
      </div>
    </form>
  </div>
</div>
