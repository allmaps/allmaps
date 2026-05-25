<script lang="ts">
  import { goto } from '$app/navigation'
  import { Combobox } from 'bits-ui'

  import { getOrganizationId } from '$lib/organizations.js'
  import { routes } from '$lib/routes.js'

  import UserLists from '$lib/components/UserLists.svelte'
  import AppSelect from '$lib/components/AppSelect.svelte'
  import { userRoleItems, orgMemberRoleItems } from '$lib/select-items'
  import {
    addOrganizationMember,
    removeOrganizationMember
  } from '../../organizations/organizations.remote.js'
  import { getOrganizations } from '../../organizations/organizations.remote.js'
  import { getUser, setUserRole, updateUserForm } from '../users.remote.js'

  import type { PageProps } from './$types'
  import type { ConsoleUser } from '../users.remote.js'

  let { data }: PageProps = $props()

  const userId = $derived(data.userId)
  const sessionUser = $derived(
    data.sessionData.data?.user as ConsoleUser | undefined
  )

  const userQuery = $derived(
    data.isAdmin || data.isCurrentUser ? getUser(userId) : null
  )
  const organizationsQuery = $derived(data.isAdmin ? getOrganizations() : null)
  const user = $derived(
    userQuery?.current ??
      (data.isCurrentUser && userQuery?.error ? (sessionUser ?? null) : null)
  )
  const organizations = $derived(organizationsQuery?.current ?? [])
  const isLoadingUser = $derived(
    userQuery ? !userQuery.ready || userQuery.loading : false
  )
  const isLoadingOrganizations = $derived(
    organizationsQuery
      ? !organizationsQuery.ready || organizationsQuery.loading
      : false
  )
  const loadError = $derived(
    userQuery?.error ??
      (userQuery?.ready && !user ? new Error('User not found') : null)
  )

  const userOrganizations = $derived(user?.organizations ?? [])

  let editUserName = $state('')
  let editUserSlug = $state('')
  let editUserEmail = $state('')
  let editUserBanned = $state(false)
  let editUserRole = $state<'user' | 'admin'>('user')
  let isChangingRole = $state(false)
  let selectedOrganizationId = $state('')
  let organizationSearchValue = $state('')
  let selectedOrganizationRole = $state<'admin' | 'member'>('member')
  let isAddingToOrganization = $state(false)
  let removingOrganizationId = $state<string | null>(null)
  let error = $state<string | null>(null)
  let initializedUserId = $state<string | null>(null)

  const slugPattern = String.raw`^[a-z](?:[a-z0-9\-]*[a-z0-9])?$`
  const userOrganizationIdSet = $derived(
    new Set(
      userOrganizations.map((membership) =>
        getOrganizationId(membership.organization.id)
      )
    )
  )
  const organizationItems = $derived(
    organizations
      .map((organization) => ({
        value: organization.id,
        label: organization.name,
        name: organization.name,
        isMember: userOrganizationIdSet.has(getOrganizationId(organization.id))
      }))
      .sort((firstOrganization, secondOrganization) =>
        firstOrganization.label.localeCompare(secondOrganization.label)
      )
  )
  const filteredOrganizationItems = $derived(
    organizationSearchValue.trim()
      ? organizationItems.filter((organization) =>
          organization.label
            .toLowerCase()
            .includes(organizationSearchValue.trim().toLowerCase())
        )
      : organizationItems
  )

  function initializeUserForm(nextUser: ConsoleUser) {
    editUserName = nextUser.name || ''
    editUserSlug = nextUser.slug || ''
    editUserEmail = nextUser.email || ''
    editUserBanned = nextUser.banned || false
    editUserRole = (nextUser.role as 'user' | 'admin') || 'user'
    initializedUserId = userId
  }

  $effect(() => {
    // eslint-disable-next-line
    userId
    editUserName = ''
    editUserSlug = ''
    editUserEmail = ''
    editUserBanned = false
    editUserRole = 'user'
    initializedUserId = null
    selectedOrganizationId = ''
    organizationSearchValue = ''
    selectedOrganizationRole = 'member'
  })

  $effect(() => {
    if (user && initializedUserId !== userId) {
      initializeUserForm(user)
    }
  })

  async function changeRole() {
    if (!user || !data.isAdmin) {
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
      })
      await userQuery?.refresh()
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
      const organization = organizations.find(
        (o) => o.id === selectedOrganizationId
      )
      if (!organization) {
        throw new Error('Organization not found')
      }
      const organizationId = getOrganizationId(organization.id)

      await addOrganizationMember({
        organizationId,
        email: user?.email ?? '',
        role: selectedOrganizationRole
      })

      await Promise.all([userQuery?.refresh(), organizationsQuery?.refresh()])
      selectedOrganizationId = ''
      organizationSearchValue = ''
      selectedOrganizationRole = 'member'
    } catch (err) {
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
      await removeOrganizationMember({ organizationId, userId })
      await Promise.all([userQuery?.refresh(), organizationsQuery?.refresh()])
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : 'Failed to remove user from organization'
    } finally {
      removingOrganizationId = null
    }
  }

  function cancel() {
    goto(data.isCurrentUser ? routes.home() : routes.users())
  }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold">
      {data.isCurrentUser ? 'My Profile' : 'Edit User'}
    </h1>
  </div>

  {#if isLoadingUser}
    <div class="bg-white rounded-lg shadow p-6" aria-busy="true">
      <div class="space-y-6">
        <div>
          <div class="mb-2 h-4 w-16 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <div>
          <div class="mb-2 h-4 w-16 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <div>
          <div class="mb-2 h-4 w-12 rounded bg-gray-200"></div>
          <div class="h-10 w-full rounded bg-gray-100"></div>
        </div>
        <p class="text-sm text-gray-500">Loading user details...</p>
      </div>
    </div>
  {:else if loadError || !user}
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

    <form {...updateUserForm} class="bg-white rounded-lg shadow p-6">
      <input type="hidden" name="userId" value={userId} />
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
            name="name"
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
            name="email"
            bind:value={editUserEmail}
            required
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
            name="slug"
            bind:value={editUserSlug}
            disabled={!data.isAdmin}
            pattern={slugPattern}
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
                type="button"
                onclick={changeRole}
                disabled={isChangingRole ||
                  editUserRole === (user.role || 'user')}
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
            name="banned"
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
            {user.createdAt
              ? new Date(user.createdAt).toLocaleString()
              : 'Unknown'}
          </p>
          <p>
            <strong>Last Updated:</strong>
            {user.updatedAt
              ? new Date(user.updatedAt).toLocaleString()
              : 'Unknown'}
          </p>
          {#if user.emailVerified}
            <p><strong>Email Verified:</strong> Yes</p>
          {/if}
        </div>

        <div class="border-t pt-6">
          <h3 class="text-lg font-semibold mb-4">Organizations</h3>
          {#if userOrganizations.length === 0}
            <p class="text-sm text-gray-500 italic">
              Not a member of any organizations
            </p>
          {:else}
            <div class="space-y-2">
              {#each userOrganizations as membership (membership.organization.slug)}
                {@const membershipOrganizationId = getOrganizationId(
                  membership.organization.id
                )}
                <div
                  class="flex items-center justify-between px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 transition"
                >
                  <a
                    href={routes.organization(membershipOrganizationId)}
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
                <Combobox.Root
                  type="single"
                  bind:value={selectedOrganizationId}
                  items={organizationItems}
                  onOpenChangeComplete={(open) => {
                    if (!open) organizationSearchValue = ''
                  }}
                >
                  <div class="relative">
                    <Combobox.Input
                      autocomplete="off"
                      id="orgSelect"
                      oninput={(event) =>
                        (organizationSearchValue = event.currentTarget.value)}
                      class="w-full px-3 py-2 pr-9 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={isLoadingOrganizations
                        ? 'Loading organizations...'
                        : 'Search organizations'}
                      disabled={isLoadingOrganizations}
                      aria-label="Search organizations"
                    />
                    <Combobox.Trigger
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs disabled:opacity-50 cursor-pointer"
                      disabled={isLoadingOrganizations}
                      aria-label="Show organizations"
                    >
                      ▾
                    </Combobox.Trigger>
                  </div>
                  <Combobox.Portal>
                    <Combobox.Content
                      class="z-50 w-[var(--bits-combobox-anchor-width)] min-w-[var(--bits-combobox-anchor-width)] rounded-xl border border-gray-200 bg-white shadow-lg py-1 outline-none"
                      sideOffset={4}
                    >
                      <Combobox.Viewport class="max-h-72 overflow-y-auto">
                        {#if filteredOrganizationItems.length === 0}
                          <div class="px-3 py-2 text-sm text-gray-500">
                            No organizations found.
                          </div>
                        {:else}
                          {#each filteredOrganizationItems as organization (organization.value)}
                            <Combobox.Item
                              value={organization.value}
                              label={organization.label}
                              disabled={organization.isMember}
                              class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer select-none outline-none hover:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-medium data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-white"
                            >
                              {#snippet children({ selected })}
                                <span class="min-w-0 flex-1 truncate">
                                  {organization.name}
                                </span>
                                {#if organization.isMember}
                                  <span class="shrink-0 text-xs text-gray-400">
                                    Member
                                  </span>
                                {:else if selected}
                                  <span class="shrink-0 text-xs text-blue-600">
                                    Selected
                                  </span>
                                {/if}
                              {/snippet}
                            </Combobox.Item>
                          {/each}
                        {/if}
                      </Combobox.Viewport>
                    </Combobox.Content>
                  </Combobox.Portal>
                </Combobox.Root>
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
                type="button"
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
            type="button"
            onclick={cancel}
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition cursor-pointer"
            disabled={!!updateUserForm.pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            disabled={!editUserEmail || !!updateUserForm.pending}
          >
            {updateUserForm.pending ? 'Updating...' : 'Update User'}
          </button>
        </div>
      {/if}
    </form>

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
