<script lang="ts">
  import { getAuthContext } from '@allmaps/components/auth'
  import { routes } from '$lib/routes.js'
  import type { AuthSession, AuthSessionState } from '@allmaps/components/auth'
  import type { Readable } from 'svelte/store'

  type BasicUser = {
    name?: string
    email?: string
  }

  function toBasicUser(
    user: AuthSession['user']
  ): BasicUser & { id: string; role?: string } {
    return {
      ...user,
      name: user.name ?? undefined
    }
  }

  const { client } = getAuthContext()
  const session = client.useSession() as Readable<AuthSessionState>
  let sessionTimedOut = $state(false)

  $effect(() => {
    const timeout = setTimeout(() => {
      sessionTimedOut = true
    }, 10_000)

    return () => clearTimeout(timeout)
  })

  const getDisplayName = (user?: BasicUser) =>
    user?.name || user?.email || 'User'

  function getInitials(value: string) {
    return value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }
</script>

<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
  {#if $session.isPending && !sessionTimedOut}
    <div class="flex items-center justify-center min-h-[60vh]">
      <p class="text-gray-500 font-sans">Loading...</p>
    </div>
  {:else}
    {@const user = $session.data?.user
      ? toBasicUser($session.data.user)
      : undefined}
    {@const isAdmin = user?.role === 'admin'}

    {#if !user}
      <div class="flex items-center justify-center min-h-[60vh]">
        <div class="text-center space-y-2">
          <p class="text-gray-500 font-sans">
            Sign in using the menu in the top right.
          </p>
        </div>
      </div>
    {:else}
      {@const displayName = getDisplayName(user)}
      {@const initials = getInitials(displayName)}

      <div class="space-y-5">
        <!-- User card -->
        <a
          href={routes.user(user.id)}
          class="group block rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-md"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 font-sans text-sm font-medium text-white"
              >
                {initials}
              </div>
              <div>
                <p class="font-sans font-medium text-black leading-tight">
                  {displayName}
                </p>
                {#if user.name && user.email}
                  <p class="text-sm text-gray-500 font-sans">{user.email}</p>
                {/if}
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span
                class="rounded px-2 py-0.5 font-sans text-xs font-medium uppercase tracking-wide {isAdmin
                  ? 'bg-pink-100 text-pink-700'
                  : 'bg-gray-100 text-gray-600'}"
              >
                {user.role || 'user'}
              </span>
              <span class="text-gray-300 transition group-hover:text-blue-400"
                >→</span
              >
            </div>
          </div>
        </a>

        {#if isAdmin}
          <!-- Admin section -->
          <div
            class="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            <div
              class="flex items-center gap-3 border-b border-gray-100 px-5 py-4"
            >
              <h2 class="font-sans font-medium text-black">Admin</h2>
              <span
                class="rounded bg-pink-100 px-2 py-0.5 font-sans text-xs font-medium uppercase tracking-wide text-pink-700"
              >
                admin only
              </span>
            </div>

            <div
              class="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100"
            >
              <a
                href={routes.users()}
                class="group flex items-start justify-between gap-4 p-5 transition hover:bg-blue-50"
              >
                <div>
                  <h3 class="font-sans font-medium text-black">Users</h3>
                  <p class="mt-1 text-sm text-gray-500 font-sans">
                    Manage accounts, roles, and profiles.
                  </p>
                </div>
                <span
                  class="mt-0.5 shrink-0 text-gray-300 transition group-hover:text-blue-400"
                  >→</span
                >
              </a>

              <a
                href={routes.organizations()}
                class="group flex items-start justify-between gap-4 p-5 transition hover:bg-blue-50"
              >
                <div>
                  <h3 class="font-sans font-medium text-black">
                    Organizations
                  </h3>
                  <p class="mt-1 text-sm text-gray-500 font-sans">
                    Edit settings, plans, and memberships.
                  </p>
                </div>
                <span
                  class="mt-0.5 shrink-0 text-gray-300 transition group-hover:text-blue-400"
                  >→</span
                >
              </a>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
