<script lang="ts">
  import { goto } from '$app/navigation'
  import { getAbortSignal } from 'svelte'

  import AppSelect from '$lib/components/AppSelect.svelte'
  import { planItems, orgMemberRoleItems } from '$lib/select-items'
  import { getUserId } from '$lib/organizations.js'
  import { queryResult } from '$lib/query-result.js'
  import { routes } from '$lib/routes.js'
  import {
    addOrganizationMember,
    deleteOrganization as deleteOrganizationCommand,
    getOrganization,
    removeOrganizationMember,
    updateOrganizationForm,
    updateOrganizationMemberRole
  } from '../organizations.remote.js'
  import type { Organization } from '$lib/types.js'
  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()
  const organizationId = $derived(data.organizationId)

  let organization = $state<Organization | null>(null)
  let isLoadingOrganization = $state(true)
  let loadError = $state<unknown>(null)

  let editOrgName = $state('')
  let editOrgSlug = $state('')
  let editHomepage = $state('')
  let editPlan = $state<'supporter' | 'innovator' | ''>('')
  let editDomains = $state<string[]>([])
  let error = $state<string | null>(null)
  let initializedOrganizationId = $state<string | null>(null)

  let showAddMemberModal = $state(false)
  let newMemberEmail = $state('')
  let newMemberRole = $state<'admin' | 'member' | 'owner'>('member')
  let isAddingMember = $state(false)

  let removingMemberId = $state<string | null>(null)
  let updatingRoleId = $state<string | null>(null)

  let showDeleteModal = $state(false)
  let deleteConfirmName = $state('')
  let isDeleting = $state(false)

  const slugPattern = String.raw`^[a-z](?:[a-z0-9\-]*[a-z0-9])?$`

  function initializeOrganizationForm(nextOrganization: Organization) {
    editOrgName = nextOrganization.name
    editOrgSlug = nextOrganization.slug
    editHomepage = nextOrganization.homepage ?? ''
    editPlan = nextOrganization.plan ?? ''
    editDomains = nextOrganization.domains ?? []
    initializedOrganizationId = organizationId
  }

  async function loadOrganization(signal?: AbortSignal) {
    isLoadingOrganization = true
    loadError = null

    const result = await queryResult<Organization>(
      getOrganization(organizationId)
    )

    if (signal?.aborted) {
      return
    }

    isLoadingOrganization = false

    if (result.error || !result.data) {
      organization = null
      loadError = result.error ?? new Error('Organization not found')
      return
    }

    organization = result.data
    if (initializedOrganizationId !== organizationId) {
      initializeOrganizationForm(result.data)
    }
  }

  $effect(() => {
    const signal = getAbortSignal()

    organization = null
    editOrgName = ''
    editOrgSlug = ''
    editHomepage = ''
    editPlan = ''
    editDomains = []
    initializedOrganizationId = null

    loadOrganization(signal)
  })

  async function deleteOrganization() {
    if (!organization) {
      return
    }
    isDeleting = true
    error = null

    try {
      await deleteOrganizationCommand(organizationId)

      goto(routes.organizations())
    } catch (err) {
      error =
        err instanceof Error ? err.message : 'Failed to delete organization'
    } finally {
      isDeleting = false
      showDeleteModal = false
    }
  }

  async function addMember() {
    if (!newMemberEmail) {
      return
    }

    isAddingMember = true
    error = null
    try {
      await addOrganizationMember({
        organizationId,
        email: newMemberEmail,
        role: newMemberRole
      })

      await loadOrganization()
      newMemberEmail = ''
      newMemberRole = 'member'
      showAddMemberModal = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add member'
    } finally {
      isAddingMember = false
    }
  }

  async function removeMember(userId: string, email: string) {
    if (
      !confirm(
        `Are you sure you want to remove ${email} from this organization?`
      )
    ) {
      return
    }

    removingMemberId = email
    error = null
    try {
      await removeOrganizationMember({ organizationId, userId })
      await loadOrganization()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove member'
    } finally {
      removingMemberId = null
    }
  }

  async function updateMemberRole(
    userId: string,
    role: 'admin' | 'member' | 'owner'
  ) {
    updatingRoleId = userId
    error = null
    try {
      await updateOrganizationMemberRole({ organizationId, userId, role })
      await loadOrganization()
    } catch (err) {
      error =
        err instanceof Error ? err.message : 'Failed to update member role'
    } finally {
      updatingRoleId = null
    }
  }

  function cancel() {
    goto(routes.organizations())
  }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">{editOrgName || 'Organization'}</h1>
  </div>

  {#if error}
    <div
      class="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-lg border border-red-200 font-sans text-sm"
    >
      {error}
    </div>
  {/if}

  {#if isLoadingOrganization}
    <div class="bg-white rounded-lg shadow p-6" aria-busy="true">
      <div class="space-y-6">
        <div>
          <div class="mb-2 h-4 w-36 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <div>
          <div class="mb-2 h-4 w-40 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <div>
          <div class="mb-2 h-4 w-24 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <p class="text-sm text-gray-500">Loading organization details...</p>
      </div>
    </div>
  {:else if loadError || !organization}
    <div class="bg-white rounded-lg shadow p-6">
      <p class="text-sm text-red-600">Failed to load organization.</p>
    </div>
  {:else}
    <form {...updateOrganizationForm} class="bg-white rounded-lg shadow p-6">
    <input
      type="hidden"
      name="organizationId"
      value={organizationId}
    />
    <input
      type="hidden"
      name="domains"
      value={editDomains.join('\n')}
    />
    <div class="space-y-6">
      <div>
        <label
          for="orgName"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Organization Name
        </label>
        <input
          id="orgName"
          type="text"
          name="name"
          bind:value={editOrgName}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Organization name"
        />
      </div>

      <div>
        <label
          for="orgSlug"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          URL-friendly identifier
        </label>
        <input
          id="orgSlug"
          type="text"
          name="slug"
          bind:value={editOrgSlug}
          required
          pattern={slugPattern}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="organization-name"
        />
      </div>

      <div>
        <label
          for="orgHomepage"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Homepage
        </label>
        <input
          id="orgHomepage"
          type="url"
          name="homepage"
          bind:value={editHomepage}
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <label
          for="orgPlan"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Plan
        </label>
        <AppSelect bind:value={editPlan} items={planItems} />
        <input
          type="hidden"
          name="plan"
          value={editPlan}
        />
      </div>

      <div>
        <p class="block text-sm font-medium text-gray-700 mb-2">Domains</p>
        <div class="space-y-2">
          {#each editDomains as editDomain, i (editDomain)}
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={editDomains[i]}
                class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example.com"
              />
              <button
                type="button"
                onclick={() =>
                  (editDomains = editDomains.filter((_, j) => j !== i))}
                class="px-3 py-2 text-red-600 hover:text-red-800 cursor-pointer"
              >
                Remove
              </button>
            </div>
          {/each}
          <button
            type="button"
            onclick={() => (editDomains = [...editDomains, ''])}
            class="text-sm text-blue-600 hover:underline cursor-pointer"
          >
            + Add domain
          </button>
        </div>
      </div>

      <div class="flex gap-3 justify-between mt-8 pt-6 border-t">
        <button
          type="button"
          onclick={() => (showDeleteModal = true)}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition cursor-pointer"
          disabled={!!updateOrganizationForm.pending}
        >
          Delete Organization
        </button>
        <div class="flex gap-3">
          <button
            type="button"
            onclick={cancel}
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
            disabled={!!updateOrganizationForm.pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            disabled={!editOrgName ||
              !editOrgSlug ||
              !!updateOrganizationForm.pending}
          >
            {updateOrganizationForm.pending
              ? 'Updating...'
              : 'Update Organization'}
          </button>
        </div>
      </div>
    </div>
    </form>
  {/if}

  {#if organization}
    {@const members = organization.users || []}
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <div class="space-y-4 mb-8">
        <div>
          <span class="text-sm font-medium text-gray-500">ID:</span>
          <p class="text-gray-900">{organization.id}</p>
        </div>
        <div>
          <span class="text-sm font-medium text-gray-500">Created:</span>
          <p class="text-gray-900">
            {new Date(organization.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div class="border-t pt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold">Members ({members.length})</h3>
          <button
            onclick={() => (showAddMemberModal = true)}
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition cursor-pointer"
          >
            Add Member
          </button>
        </div>

        {#if members.length === 0}
          <p class="text-gray-500 italic">No members yet</p>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-sm font-medium text-gray-700"
                    >Name</th
                  >
                  <th
                    class="px-4 py-3 text-left text-sm font-medium text-gray-700"
                    >Email</th
                  >
                  <th
                    class="px-4 py-3 text-left text-sm font-medium text-gray-700"
                    >Role</th
                  >
                  <th
                    class="px-4 py-3 text-left text-sm font-medium text-gray-700"
                    >Joined</th
                  >
                  <th
                    class="px-4 py-3 text-right text-sm font-medium text-gray-700"
                    >Actions</th
                  >
                </tr>
              </thead>
              <tbody class="divide-y">
                {#each members as member (member.user.id)}
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">
                      <a
                        href={routes.user(getUserId(member.user.id))}
                        class="text-blue-600 hover:underline"
                        >{member.user.name || '—'}</a
                      >
                    </td>
                    <td class="px-4 py-3 text-sm">{member.user.email}</td>
                    <td class="px-4 py-3 text-sm">
                      <AppSelect
                        value={member.role}
                        items={orgMemberRoleItems}
                        disabled={updatingRoleId === getUserId(member.user.id)}
                        onchange={(role) =>
                          updateMemberRole(
                            getUserId(member.user.id),
                            role as 'admin' | 'member' | 'owner'
                          )}
                        class="min-w-36"
                      />
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td class="px-4 py-3 text-sm text-right">
                      <button
                        onclick={() =>
                          removeMember(
                            getUserId(member.user.id),
                            member.user.email
                          )}
                        class="text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-50"
                        disabled={removingMemberId === member.user.email}
                      >
                        {removingMemberId === member.user.email
                          ? 'Removing...'
                          : 'Remove'}
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showDeleteModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        showDeleteModal = false
        deleteConfirmName = ''
      }
    }}
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 class="text-xl font-bold mb-2">Delete Organization</h3>
      <p class="text-gray-600 mb-4">
        This action cannot be undone. Type <strong>{editOrgName}</strong> to confirm.
      </p>

      <input
        type="text"
        bind:value={deleteConfirmName}
        class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
        placeholder={editOrgName}
      />

      <div class="flex gap-3 justify-end">
        <button
          onclick={() => {
            showDeleteModal = false
            deleteConfirmName = ''
          }}
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          onclick={deleteOrganization}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
          disabled={deleteConfirmName !== editOrgName || isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Organization'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showAddMemberModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    onclick={(e) => {
      if (e.target === e.currentTarget) showAddMemberModal = false
    }}
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 class="text-xl font-bold mb-4">Add Member</h3>

      <div class="space-y-4">
        <div>
          <label
            for="memberEmail"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <input
            id="memberEmail"
            type="email"
            bind:value={newMemberEmail}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label
            for="userRole"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Role
          </label>
          <AppSelect bind:value={newMemberRole} items={orgMemberRoleItems} />
        </div>
      </div>

      <div class="flex gap-3 justify-end mt-6">
        <button
          onclick={() => {
            showAddMemberModal = false
            newMemberEmail = ''
            newMemberRole = 'member'
          }}
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
          disabled={isAddingMember}
        >
          Cancel
        </button>
        <button
          onclick={addMember}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
          disabled={!newMemberEmail || isAddingMember}
        >
          {isAddingMember ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  </div>
{/if}
