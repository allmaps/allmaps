<script lang="ts">
  import GithubLogo from 'phosphor-svelte/lib/GithubLogoIcon'
  import GoogleLogo from 'phosphor-svelte/lib/GoogleLogoIcon'
  /* eslint-disable svelte/no-navigation-without-resolve -- sign-in URL is external */
  import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon'

  type Props = {
    user?: {
      name?: string | null
      email?: string | null
      image?: string | null
    } | null
    signInURL?: string
    signInProviders?: Array<{
      provider: 'github' | 'google'
      url: string
    }>
    onSignOut: () => void | Promise<void>
  }

  let { user, signInURL, signInProviders = [], onSignOut }: Props = $props()
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
        onclick={onSignOut}
        class="cursor-pointer text-sm text-red-600 hover:text-red-800"
      >
        Sign out
      </button>
    </div>
  </details>
{:else if signInProviders.length}
  <details class="relative">
    <summary
      class="list-none cursor-pointer rounded border border-gray-300 p-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Sign in"
      title="Sign in"
    >
      <UserCircleIcon class="size-5" />
    </summary>
    <div
      class="absolute right-0 top-10 z-50 w-56 max-w-[calc(100vw-2rem)] rounded border border-gray-200 bg-white p-1 shadow-lg"
    >
      {#each signInProviders as { provider, url } (provider)}
        <a
          href={url}
          class="flex items-center gap-2 rounded px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2"
        >
          {#if provider === 'google'}
            <GoogleLogo class="size-5 shrink-0" />
            Continue with Google
          {:else}
            <GithubLogo class="size-5 shrink-0" />
            Continue with GitHub
          {/if}
        </a>
      {/each}
    </div>
  </details>
{:else if signInURL}
  <a
    href={signInURL}
    class="rounded border border-gray-300 p-1.5 text-sm hover:bg-gray-50"
    aria-label="Sign in"
    title="Sign in"
  >
    <UserCircleIcon class="size-5" />
  </a>
{/if}
