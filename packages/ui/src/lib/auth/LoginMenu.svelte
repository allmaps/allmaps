<script lang="ts">
  import { tick } from 'svelte'
  import * as DropdownMenu from '../dropdown-menu.js'
  import LoginMenuTrigger from './LoginMenuTrigger.svelte'
  import LoginMenuItems from './LoginMenuItems.svelte'
  import LoginDialog from './LoginDialog.svelte'
  import type { AccountLink, LoginUser, SignInProvider } from './types.js'

  let {
    class: className,
    user,
    apiBaseUrl,
    signInProviders,
    signInURL,
    accountLinks = [],
    onSignOut
  }: {
    class?: string
    user?: LoginUser | null
    apiBaseUrl?: string
    signInProviders?: SignInProvider[]
    signInURL?: string
    accountLinks?: AccountLink[]
    onSignOut: () => void | Promise<void>
  } = $props()

  let accountTrigger = $state<HTMLButtonElement | null>(null)
  let accountMenu = $state<HTMLDivElement | null>(null)
  let guestTrigger = $state<HTMLButtonElement | null>(null)
  let loginOpen = $state(false)
  $effect.pre(() => {
    if (
      !user &&
      (accountTrigger === document.activeElement ||
        accountMenu?.contains(document.activeElement))
    ) {
      void tick().then(() => guestTrigger?.focus())
    }
  })
</script>

{#if user}
  <DropdownMenu.Root pendingAnnouncement="Logging out…">
    <LoginMenuTrigger bind:ref={accountTrigger} {user} class={className} />
    <DropdownMenu.Content bind:ref={accountMenu} align="start">
      <LoginMenuItems {user} {accountLinks} {onSignOut} />
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else if signInProviders === undefined || signInProviders.length || signInURL}
  <LoginMenuTrigger
    bind:ref={guestTrigger}
    class={className}
    onLogIn={() => (loginOpen = true)}
  />
  <LoginDialog
    bind:open={loginOpen}
    {apiBaseUrl}
    {signInProviders}
    {signInURL}
    returnFocus={guestTrigger}
  />
{/if}
