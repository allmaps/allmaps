<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- sign-in URL is external */
  import { page } from '$app/state'
  import { UserCircle as UserCircleIcon } from 'phosphor-svelte'

  import { authClient } from '$lib/auth-client.js'

  const user = $derived(page.data.session?.user)
  const apiBaseURL = $derived(page.data.env.PUBLIC_REST_BASE_URL)
  const signInURL = $derived(
    `${apiBaseURL}/login/github?returnTo=${encodeURIComponent(page.url.href)}`
  )

  async function signOut() {
    await authClient.signOut()
    window.location.href = page.url.href
  }
</script>

{#if user}
  <details class="relative">
    <summary
      class="list-none cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="User menu"
    >
      {#if user.image}
        <img
          src={user.image}
          alt={user.name ?? user.email ?? 'User'}
          class="size-7 rounded-full"
        />
      {:else}
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
        >
          {(user.name ?? user.email ?? 'U')[0].toUpperCase()}
        </div>
      {/if}
    </summary>
    <div
      class="absolute right-0 top-10 z-50 min-w-44 rounded border border-gray-200 bg-white p-3 shadow-lg"
    >
      <div class="text-sm font-medium">{user.name ?? 'User'}</div>
      {#if user.email}
        <div class="mb-3 text-xs text-gray-500">{user.email}</div>
      {/if}
      <button
        onclick={signOut}
        class="cursor-pointer text-sm text-red-600 hover:text-red-800"
      >
        Sign out
      </button>
    </div>
  </details>
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
