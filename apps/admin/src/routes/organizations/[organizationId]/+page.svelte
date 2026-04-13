<script lang="ts">
  import { page } from '$app/state'
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { authClient } from '$lib/auth-client.js'
  import { getOrganizationId } from '$lib/organizations.js'
  import AppSelect from '$lib/components/AppSelect.svelte'
  import { planItems, orgMemberRoleItems } from '$lib/select-items'
  import type { PageProps } from './$types'

  const apiBaseUrl = $derived(page.data.env.PUBLIC_REST_BASE_URL)

  let { data }: PageProps = $props()

  let editOrgName = $state(untrack(() => data.organization?.name ?? ''))
  let editOrgSlug = $state(untrack(() => data.organization?.slug ?? ''))
  let editHomepage = $state(untrack(() => data.organization?.homepage ?? ''))
  let editPlan = $state<'supporter' | 'innovator' | ''>(
    untrack(() => data.organization?.plan ?? '')
  )
  let editDomains = $state<string[]>(
    untrack(() => data.organization?.domains ?? [])
  )
  let isUpdating = $state(false)
  let error = $state<string | null>(null)

  let showAddMemberModal = $state(false)
  let newMemberEmail = $state('')
  let newMemberRole = $state<'admin' | 'member' | 'owner'>('member')
  let isAddingMember = $state(false)

  let removingMemberId = $state<string | null>(null)
  let updatingRoleId = $state<string | null>(null)

  let showDeleteModal = $state(false)
  let deleteConfirmName = $state('')
  let isDeleting = $state(false)

  function isValidSlug(value: string) {
    return /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value.trim())
  }

  function getUserId(userIdOrUrl: string) {
    try {
      const url = new URL(userIdOrUrl)
      return url.pathname.split('/').filter(Boolean).at(-1) ?? userIdOrUrl
    } catch {
      return userIdOrUrl
    }
  }

  async function deleteOrganization() {
    const organization = data.organization
    if (!organization) {
      return
    }
    const organizationId = getOrganizationId(organization.id)

    isDeleting = true
    error = null

    try {
      const response = await fetch(`${apiBaseUrl}/organizations/${organizationId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        error = errorText || 'Failed to delete organization'
        return
      }

      goto('/organizations')
    } catch (err) {
      error =
        err instanceof Error ? err.message : 'Failed to delete organization'
    } finally {
      isDeleting = false
      showDeleteModal = false
    }
  }

  async function updateOrganization() {
    const organization = data.organization
    if (!organization) {
      return
    }
    const organizationId = getOrganizationId(organization.id)

    if (!isValidSlug(editOrgSlug)) {
      error =
        'Invalid slug. Use lowercase letters, numbers, and hyphens, starting with a letter.'
      return
    }

    isUpdating = true
    error = null
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editOrgName,
            slug: editOrgSlug,
            homepage: editHomepage || null,
            plan: editPlan || null,
            domains: editDomains.filter(Boolean)
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to update organization')
      }

      goto('/organizations')
    } catch (err) {
      console.error('Failed to update organization:', err)
      error =
        err instanceof Error ? err.message : 'Failed to update organization'
    } finally {
      isUpdating = false
    }
  }

  async function addMember() {
    if (!newMemberEmail) {
      return
    }

    const organization = data.organization

    if (!organization) {
      return
    }
    const organizationId = getOrganizationId(organization.id)

    isAddingMember = true
    error = null
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/users`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: newMemberEmail,
            role: newMemberRole
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to add member')
      }

      newMemberEmail = ''
      newMemberRole = 'member'
      showAddMemberModal = false
      window.location.reload()
    } catch (err) {
      console.error('Failed to add member:', err)
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

    const organization = data.organization
    if (!organization) {
      return
    }
    const organizationId = getOrganizationId(organization.id)

    removingMemberId = email
    error = null
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/users/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to remove member')
      }

      window.location.reload()
    } catch (err) {
      console.error('Failed to remove member:', err)
      error = err instanceof Error ? err.message : 'Failed to remove member'
    } finally {
      removingMemberId = null
    }
  }

  async function updateMemberRole(
    userId: string,
    role: 'admin' | 'member' | 'owner'
  ) {
    const organization = data.organization

    if (!organization) {
      return
    }
    const organizationId = getOrganizationId(organization.id)

    updatingRoleId = userId
    error = null
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/users/${userId}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to update role')
      }

      window.location.reload()
    } catch (err) {
      console.error('Failed to update member role:', err)
      error =
        err instanceof Error ? err.message : 'Failed to update member role'
    } finally {
      updatingRoleId = null
    }
  }

  function cancel() {
    goto('/organizations')
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

  <div class="bg-white rounded-lg shadow p-6">
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
          bind:value={editOrgName}
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
          bind:value={editOrgSlug}
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
          onclick={() => (showDeleteModal = true)}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition cursor-pointer"
          disabled={isUpdating}
        >
          Delete Organization
        </button>
        <div class="flex gap-3">
          <button
            onclick={cancel}
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            onclick={updateOrganization}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            disabled={!editOrgName || !editOrgSlug || isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Organization'}
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if data.organization}
    <div class="bg-white rounded-lg shadow p-6 mt-6">
      <div class="space-y-4 mb-8">
        <div>
          <span class="text-sm font-medium text-gray-500">ID:</span>
          <p class="text-gray-900">{data.organization.id}</p>
        </div>
        <div>
          <span class="text-sm font-medium text-gray-500">Created:</span>
          <p class="text-gray-900">
            {new Date(data.organization.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div class="border-t pt-6">
        {#await data.membersData}
          <p class="text-gray-500">Loading members...</p>
        {:then membersData}
          {@const members = membersData.data?.members || []}
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
                          href="/users/{getUserId(member.user.id)}"
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
        {/await}
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
