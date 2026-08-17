<script lang="ts">
  import { page } from '$app/state'
  import { UserCircle as UserCircleIcon } from 'phosphor-svelte'

  import Popover from '$lib/components/Popover.svelte'

  import { getAuthContext } from './context.js'
  import type { AuthSessionState } from './context.js'
  import type { Readable } from 'svelte/store'

  const { client, apiBaseURL } = getAuthContext()
  const session = client.useSession() as Readable<AuthSessionState>

  let signInURL = $derived(
    `${apiBaseURL}/login/github?returnTo=${encodeURIComponent(page.url.href)}`
  )

  async function signOut() {
    await client.signOut({ callbackURL: page.url.href })
  }
</script>

{#if $session.isPending}
  <div class="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
{:else if $session.data?.user}
  {@const user = $session.data.user}
  <Popover>
    {#snippet button()}
      {#if user.image}
        <img
          src={user.image}
          alt={user.name ?? user.email}
          class="size-7 cursor-pointer rounded-full"
        />
      {:else}
        <div
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
        >
          {(user.name ?? user.email)[0].toUpperCase()}
        </div>
      {/if}
    {/snippet}
    {#snippet contents()}
      <div class="text-sm font-medium">{user.name ?? 'User'}</div>
      <div class="mb-3 text-xs text-gray-500">{user.email}</div>
      <button
        onclick={signOut}
        class="cursor-pointer text-sm text-red-600 hover:text-red-800"
      >
        Sign out
      </button>
    {/snippet}
  </Popover>
{:else}
  <a
    href={signInURL}
    class="rounded border border-gray-300 p-1.5 text-sm hover:bg-gray-50"
    aria-label="Sign in"
    title="Sign in"
  >
    <UserCircleIcon class="size-5" />
  </a>
{/if}
