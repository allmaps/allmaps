<script lang="ts">
  import { goto } from '$app/navigation'
  import { Combobox } from 'bits-ui'

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
  import { getUsers, type ConsoleUser } from '../../users/users.remote.js'
  import type { Organization } from '$lib/types.js'
  import type { PageProps } from './$types.js'

  let { data }: PageProps = $props()
  const organizationId = $derived(data.organizationId)
  const organizationQuery = $derived(getOrganization(organizationId))
  const organization = $derived(organizationQuery.current ?? null)
  const isLoadingOrganization = $derived(
    !organizationQuery.ready || organizationQuery.loading
  )
  const loadError = $derived(
    organizationQuery.error ??
      (organizationQuery.ready && !organization
        ? new Error('Organization not found')
        : null)
  )

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
  let memberSearchValue = $state('')
  let users = $state<ConsoleUser[]>([])
  let isLoadingUsers = $state(false)
  let usersLoadError = $state<unknown>(null)
  let isAddingMember = $state(false)

  let removingMemberId = $state<string | null>(null)
  let updatingRoleId = $state<string | null>(null)

  let showDeleteModal = $state(false)
  let deleteConfirmName = $state('')
  let isDeleting = $state(false)

  const slugPattern = String.raw`^[a-z](?:[a-z0-9\-]*[a-z0-9])?$`
  const organizationApiUrl = $derived(
    `${data.env.PUBLIC_REST_BASE_URL}/organizations/${organizationId}`
  )
  const organizationResourceLinks = $derived([
    {
      label: 'ID',
      href: organizationApiUrl
    },
    {
      label: 'Images',
      href: `${organizationApiUrl}/images`
    },
    {
      label: 'Canvases',
      href: `${organizationApiUrl}/canvases`
    },
    {
      label: 'Manifests',
      href: `${organizationApiUrl}/manifests`
    },
    {
      label: 'Images without georeference',
      href: `${organizationApiUrl}/images?georeferenced=false`
    },
    {
      label: 'Georeferenced images',
      href: `${organizationApiUrl}/images?georeferenced=true`
    }
  ])
  const memberEmailSet = $derived(
    new Set((organization?.users ?? []).map((member) => member.user.email))
  )
  const userItems = $derived(
    users
      .filter((user) => user.email)
      .map((user) => ({
        value: user.email as string,
        label: [user.name, user.email].filter(Boolean).join(' '),
        name: user.name || 'Unnamed user',
        email: user.email as string,
        isMember: memberEmailSet.has(user.email as string)
      }))
      .sort((firstUser, secondUser) =>
        firstUser.label.localeCompare(secondUser.label)
      )
  )
  const filteredUserItems = $derived(
    memberSearchValue.trim()
      ? userItems.filter((user) =>
          user.label
            .toLowerCase()
            .includes(memberSearchValue.trim().toLowerCase())
        )
      : userItems
  )

  function initializeOrganizationForm(nextOrganization: Organization) {
    editOrgName = nextOrganization.name
    editOrgSlug = nextOrganization.slug
    editHomepage = nextOrganization.homepage ?? ''
    editPlan = nextOrganization.plan ?? ''
    editDomains = nextOrganization.domains ?? []
    initializedOrganizationId = organizationId
  }

  $effect(() => {
    organizationId
    editOrgName = ''
    editOrgSlug = ''
    editHomepage = ''
    editPlan = ''
    editDomains = []
    initializedOrganizationId = null
  })

  $effect(() => {
    if (organization && initializedOrganizationId !== organizationId) {
      initializeOrganizationForm(organization)
    }
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

  async function loadUsers() {
    if (users.length || isLoadingUsers) {
      return
    }

    isLoadingUsers = true
    usersLoadError = null

    const result = await queryResult<ConsoleUser[]>(getUsers(10000))

    if (result.error || !result.data) {
      usersLoadError = result.error ?? new Error('Failed to load users')
    } else {
      users = result.data
    }

    isLoadingUsers = false
  }

  function openAddMemberModal() {
    showAddMemberModal = true
    loadUsers()
  }

  function resetAddMemberModal() {
    showAddMemberModal = false
    newMemberEmail = ''
    newMemberRole = 'member'
    memberSearchValue = ''
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

      await organizationQuery.refresh()
      resetAddMemberModal()
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
      await organizationQuery.refresh()
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
      await organizationQuery.refresh()
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
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="domains" value={editDomains.join('\n')} />
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
          <input type="hidden" name="plan" value={editPlan} />
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
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-gray-100">
              {#each organizationResourceLinks as resourceLink (resourceLink.href)}
                <tr>
                  <th class="w-48 py-2 pr-4 text-left font-medium text-gray-500"
                    >{resourceLink.label}</th
                  >
                  <td class="py-2">
                    <a
                      href={resourceLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-mono text-blue-600 hover:underline break-all"
                      >{resourceLink.href}</a
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
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
            onclick={openAddMemberModal}
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
      if (e.target === e.currentTarget) resetAddMemberModal()
    }}
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
      <h3 class="text-xl font-bold mb-4">Add Member</h3>

      <div class="space-y-4">
        <div>
          <label
            for="memberUser"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            User
          </label>
          <Combobox.Root
            type="single"
            bind:value={newMemberEmail}
            items={userItems}
            onOpenChangeComplete={(open) => {
              if (!open) memberSearchValue = ''
            }}
          >
            <div class="relative">
              <Combobox.Input
                autocomplete="off"
                id="memberUser"
                oninput={(event) =>
                  (memberSearchValue = event.currentTarget.value)}
                class="w-full px-3 py-2 pr-9 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={isLoadingUsers
                  ? 'Loading users...'
                  : 'Search users by name or email'}
                disabled={isLoadingUsers}
                aria-label="Search users"
              />
              <Combobox.Trigger
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs disabled:opacity-50 cursor-pointer"
                disabled={isLoadingUsers}
                aria-label="Show users"
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
                  {#if usersLoadError}
                    <div class="px-3 py-2 text-sm text-red-600">
                      Failed to load users.
                    </div>
                  {:else if filteredUserItems.length === 0}
                    <div class="px-3 py-2 text-sm text-gray-500">
                      No users found.
                    </div>
                  {:else}
                    {#each filteredUserItems as user (user.value)}
                      <Combobox.Item
                        value={user.value}
                        label={user.label}
                        disabled={user.isMember}
                        class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer select-none outline-none hover:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-medium data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-white"
                      >
                        {#snippet children({ selected })}
                          <div class="min-w-0 flex-1">
                            <div class="truncate font-medium">{user.name}</div>
                            <div class="truncate text-xs text-gray-500">
                              {user.email}
                            </div>
                          </div>
                          {#if user.isMember}
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
          onclick={resetAddMemberModal}
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
