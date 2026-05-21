<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  import { getOrganizationId } from '$lib/organizations.js'

  import UserLists from '$lib/components/UserLists.svelte'
  import AppSelect from '$lib/components/AppSelect.svelte'
  import { userRoleItems, orgMemberRoleItems } from '$lib/select-items'
  import {
    addOrganizationMember,
    removeOrganizationMember
  } from '../../organizations/organizations.remote.js'
  import {
    getUser,
    setUserRole,
    updateUser as updateUserCommand
  } from '../users.remote.js'

  import type { PageProps } from './$types'

  const userId = $derived(page.params.userId ?? '')

  let { data }: PageProps = $props()

  let editUserName = $state('')
  let editUserSlug = $state('')
  let editUserEmail = $state('')
  let editUserBanned = $state(false)
  let editUserRole = $state<'user' | 'admin'>('user')
  let isUpdating = $state(false)
  let isChangingRole = $state(false)
  let selectedOrganizationId = $state('')
  let selectedOrganizationRole = $state<'admin' | 'member'>('member')
  let isAddingToOrganization = $state(false)
  let removingOrganizationId = $state<string | null>(null)
  let error = $state<string | null>(null)

  function isValidSlug(value: string) {
    return /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/.test(value.trim())
  }

  $effect(() => {
    editUserName = data.user?.name || ''
    editUserSlug = data.user?.slug || ''
    editUserEmail = data.user?.email || ''
    editUserBanned = data.user?.banned || false
    editUserRole = (data.user?.role as 'user' | 'admin') || 'user'
  })

  async function changeRole() {
    if (!data.user || !data.isAdmin) {
      return
    }
    if (!userId) {
      return
    }

    isChangingRole = true
    error = null

    try {
      await setUserRole({
        userId,
        role: editUserRole
      }).updates(getUser(userId))
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to change role'
    } finally {
      isChangingRole = false
    }
  }

  async function addToOrganization() {
    if (!selectedOrganizationId || !data.isAdmin) {
      return
    }

    isAddingToOrganization = true
    error = null

    try {
      const organization = data.organizations.find(
        (o) => o.id === selectedOrganizationId
      )
      if (!organization) {
        throw new Error('Organization not found')
      }
      const organizationId = getOrganizationId(organization.id)

      await addOrganizationMember({
        organizationId,
        email: data.user?.email ?? '',
        role: selectedOrganizationRole
      }).updates(getUser(userId))

      selectedOrganizationId = ''
      selectedOrganizationRole = 'member'
    } catch (err) {
      console.error('Failed to add user to organization:', err)
      error =
        err instanceof Error
          ? err.message
          : 'Failed to add user to organization'
    } finally {
      isAddingToOrganization = false
    }
  }

  async function removeFromOrganization(
    organizationIdOrUrl: string,
    organizationName: string
  ) {
    if (!data.isAdmin || !userId) {
      return
    }

    if (
      !confirm(
        `Are you sure you want to remove this user from ${organizationName}?`
      )
    ) {
      return
    }

    const organizationId = getOrganizationId(organizationIdOrUrl)

    removingOrganizationId = organizationId
    error = null

    try {
      await removeOrganizationMember({ organizationId, userId }).updates(
        getUser(userId)
      )
    } catch (err) {
      console.error('Failed to remove user from organization:', err)
      error =
        err instanceof Error
          ? err.message
          : 'Failed to remove user from organization'
    } finally {
      removingOrganizationId = null
    }
  }

  async function updateUser() {
    if (!data.user || !data.isAdmin) {
      return
    }
    if (!userId) {
      return
    }

    if (editUserSlug && !isValidSlug(editUserSlug)) {
      error =
        'Invalid slug. Use lowercase letters, numbers, and hyphens, starting with a letter.'
      return
    }

    isUpdating = true
    error = null

    try {
      await updateUserCommand({
        userId,
        data: {
          name: editUserName,
          slug: editUserSlug || null,
          email: editUserEmail,
          banned: editUserBanned
        }
      }).updates(getUser(userId))

      goto('/users')
    } catch (err) {
      console.error('Failed to update user:', err)
      error = err instanceof Error ? err.message : 'Failed to update user'
    } finally {
      isUpdating = false
    }
  }

  function cancel() {
    goto(data.isCurrentUser ? '/' : '/users')
  }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">
      {data.isCurrentUser ? 'My Profile' : 'Edit User'}
    </h1>
  </div>

  {#if !data.user}
    <div class="bg-white rounded-lg shadow p-6">
      <p class="text-gray-500">User not found.</p>
    </div>
  {:else}
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
            for="userName"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Name
          </label>
          <input
            id="userName"
            type="text"
            bind:value={editUserName}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label
            for="userEmail"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <input
            id="userEmail"
            type="email"
            bind:value={editUserEmail}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label
            for="userSlug"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Slug
          </label>
          <input
            id="userSlug"
            type="text"
            bind:value={editUserSlug}
            disabled={!data.isAdmin}
            class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="username"
          />
        </div>

        <div>
          <label
            for="userRole"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Role
          </label>
          <div class="flex gap-2">
            <AppSelect
              bind:value={editUserRole}
              items={userRoleItems}
              disabled={!data.isAdmin}
            />
            {#if data.isAdmin}
              <button
                onclick={changeRole}
                disabled={isChangingRole ||
                  editUserRole === (data.user.role || 'user')}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isChangingRole ? 'Saving…' : 'Save'}
              </button>
            {/if}
          </div>
        </div>

        <div class="flex items-center">
          <input
            id="userBanned"
            type="checkbox"
            bind:checked={editUserBanned}
            disabled={!data.isAdmin}
            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label
            for="userBanned"
            class="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
          >
            Ban user
          </label>
        </div>

        <div class="text-sm text-gray-500">
          <p>
            <strong>Created:</strong>
            {data.user.createdAt
              ? new Date(data.user.createdAt).toLocaleString()
              : 'Unknown'}
          </p>
          <p>
            <strong>Last Updated:</strong>
            {data.user.updatedAt
              ? new Date(data.user.updatedAt).toLocaleString()
              : 'Unknown'}
          </p>
          {#if data.user.emailVerified}
            <p><strong>Email Verified:</strong> Yes</p>
          {/if}
        </div>

        <div class="border-t pt-6">
          <h3 class="text-lg font-semibold mb-4">Organizations</h3>
          {#if data.userOrganizations.length === 0}
            <p class="text-sm text-gray-500 italic">
              Not a member of any organizations
            </p>
          {:else}
            <div class="space-y-2">
              {#each data.userOrganizations as membership (membership.organization.slug)}
                {@const membershipOrganizationId = getOrganizationId(
                  membership.organization.id
                )}
                <div
                  class="flex items-center justify-between px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
                >
                  <a
                    href="/organizations/{membershipOrganizationId}"
                    class="min-w-0"
                  >
                    <span class="block text-sm font-medium">
                      {membership.organization.name}
                    </span>
                    {#if membership.createdAt}
                      <span class="block text-xs text-gray-500">
                        Added {new Date(
                          membership.createdAt
                        ).toLocaleDateString()}
                      </span>
                    {/if}
                  </a>
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                      >{membership.userRole}</span
                    >
                    {#if data.isAdmin}
                      <button
                        type="button"
                        onclick={() =>
                          removeFromOrganization(
                            membership.organization.id,
                            membership.organization.name
                          )}
                        class="text-xs text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-50"
                        disabled={removingOrganizationId ===
                          membershipOrganizationId}
                      >
                        {removingOrganizationId === membershipOrganizationId
                          ? 'Removing...'
                          : 'Remove'}
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        {#if data.isAdmin}
          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold mb-4">Add to Organization</h3>
            <div class="space-y-4">
              <div>
                <label
                  for="orgSelect"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select Organization
                </label>
                <select
                  id="orgSelect"
                  bind:value={selectedOrganizationId}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select an organization --</option>
                  {#each data.organizations as organization (organization.id)}
                    <option value={organization.id}>{organization.name}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label
                  for="orgRole"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Role in Organization
                </label>
                <AppSelect
                  bind:value={selectedOrganizationRole}
                  items={orgMemberRoleItems}
                />
              </div>
              <button
                onclick={addToOrganization}
                class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 cursor-pointer"
                disabled={!selectedOrganizationId || isAddingToOrganization}
              >
                {isAddingToOrganization ? 'Adding...' : 'Add to Organization'}
              </button>
            </div>
          </div>
        {/if}
      </div>

      {#if data.isAdmin}
        <div class="flex gap-3 justify-end mt-8 pt-6 border-t">
          <button
            onclick={cancel}
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            onclick={updateUser}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            disabled={!editUserEmail || isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update User'}
          </button>
        </div>
      {/if}
    </div>

    {#if data.isCurrentUser}
      <UserLists />

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Session Information</h2>
        <div class="space-y-3">
          <div>
            <div class="text-sm font-medium text-gray-500">Session ID</div>
            <p class="text-sm font-mono text-gray-600">
              {data.sessionData.data?.session?.id || 'N/A'}
            </p>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-500">Expires At</div>
            <p class="text-lg">
              {data.sessionData.data?.session?.expiresAt
                ? new Date(
                    data.sessionData.data.session.expiresAt
                  ).toLocaleString()
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
