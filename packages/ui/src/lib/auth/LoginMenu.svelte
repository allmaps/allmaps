<script lang="ts">
  import * as DropdownMenu from '../dropdown-menu.js'
  import MapMonster from '../components/MapMonster.svelte'
  import SignInIcon from 'phosphor-svelte/lib/SignInIcon'
  import SignOutIcon from 'phosphor-svelte/lib/SignOutIcon'
  import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon'
  import LoginModal from './LoginModal.svelte'
  import type { AccountLink, LoginUser, SignInProvider } from './types.js'

  let {
    user,
    apiBaseUrl,
    signInProviders,
    signInURL,
    accountLinks = [],
    onSignOut
  }: {
    user?: LoginUser | null
    apiBaseUrl?: string
    signInProviders?: SignInProvider[]
    signInURL?: string
    accountLinks?: AccountLink[]
    onSignOut: () => void | Promise<void>
  } = $props()

  let trigger = $state<HTMLButtonElement | null>(null)
  let loginOpen = $state(false)
  let signingOut = $state(false)
  let logoutError = $state('')
  let displayName = $derived(user?.name?.trim())
  let name = $derived(
    displayName && !/^[^\s@]+@[^\s@]+$/.test(displayName)
      ? displayName
      : undefined
  )
  let failedImage = $state<string>()

  async function logOut() {
    if (signingOut) return
    signingOut = true
    logoutError = ''
    try {
      await onSignOut()
    } catch {
      logoutError = 'Could not log out. Please try again.'
    } finally {
      signingOut = false
    }
  }
</script>

{#if user || signInProviders === undefined || signInProviders.length || signInURL}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      bind:ref={trigger}
      aria-label={name ? `Account menu for ${name}` : 'Account menu'}
      class="relative inline-flex size-10 shrink-0 cursor-pointer appearance-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 font-allmaps-ui leading-none text-inherit shadow-none after:pointer-events-none after:absolute after:inset-0 hover:after:bg-current/5 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {#if user?.image && user.image !== failedImage}
        <img
          src={user.image}
          alt=""
          class="block size-full object-cover"
          onerror={(event) =>
            (failedImage =
              event.currentTarget.getAttribute('src') ?? undefined)}
        />
      {:else if user}
        <span
          aria-hidden="true"
          class="grid size-full place-items-center bg-green-100 [&>svg]:w-7"
        >
          <MapMonster />
        </span>
      {:else}
        <UserCircleIcon aria-hidden="true" class="block size-7 shrink-0" />
      {/if}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      onCloseAutoFocus={(event) => {
        if (loginOpen) event.preventDefault()
      }}
    >
      {#if user}
        <DropdownMenu.Group>
          <DropdownMenu.GroupHeading
            class="grid gap-1 px-3 py-2 text-sm font-semibold"
          >
            {name ?? 'Account'}
          </DropdownMenu.GroupHeading>
          {#each accountLinks as { label, href } (href)}
            <DropdownMenu.Item>
              {#snippet child({ props })}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The caller supplies the account URL. -->
                <a {...props} {href}>{label}</a>
              {/snippet}
            </DropdownMenu.Item>
          {/each}
          <DropdownMenu.Item onSelect={logOut} disabled={signingOut}>
            <SignOutIcon aria-hidden="true" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      {:else}
        <DropdownMenu.Item onSelect={() => (loginOpen = true)}>
          <SignInIcon aria-hidden="true" />
          Log in
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  {#if !user}
    <LoginModal
      bind:open={loginOpen}
      {apiBaseUrl}
      {signInProviders}
      {signInURL}
      returnFocus={trigger}
    />
  {/if}
  {#if user && logoutError}
    <span role="alert" class="text-sm text-destructive">{logoutError}</span>
  {/if}
{/if}
