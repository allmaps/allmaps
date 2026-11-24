<script lang="ts">
  import { tick } from 'svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '@ui-sdk/svelte/avatar'
  import * as DropdownMenu from '../dropdown-menu.js'
  import MapMonster from '../components/MapMonster.svelte'
  import SignOutIcon from 'phosphor-svelte/lib/SignOutIcon'
  import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon'
  import LoginDialog from './LoginDialog.svelte'
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

  const triggerClass =
    'relative inline-flex size-10 shrink-0 cursor-pointer appearance-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 font-allmaps-ui leading-none text-inherit shadow-none after:pointer-events-none after:absolute after:inset-0 hover:after:bg-current/5 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

  let accountTrigger = $state<HTMLButtonElement | null>(null)
  let accountMenu = $state<HTMLDivElement | null>(null)
  let guestTrigger = $state<HTMLButtonElement | null>(null)
  let loginOpen = $state(false)
  let displayName = $derived(user?.name?.trim())
  let name = $derived(
    displayName && !/^[^\s@]+@[^\s@]+$/.test(displayName)
      ? displayName
      : undefined
  )

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
    <DropdownMenu.Trigger
      bind:ref={accountTrigger}
      aria-label={name ? `Account menu for ${name}` : 'Account menu'}
      class={triggerClass}
    >
      <Avatar aria-hidden="true" class="inline-flex size-full rounded-full">
        {#if user.image}
          <AvatarImage src={user.image} alt="" class="size-full object-cover" />
        {/if}
        <AvatarFallback
          class="grid size-full place-items-center bg-green-100 [&>svg]:w-7"
        >
          <MapMonster />
        </AvatarFallback>
      </Avatar>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content bind:ref={accountMenu} align="start">
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
        <DropdownMenu.Item onSelect={async () => onSignOut()}>
          {#snippet child({ props, state })}
            <div {...props}>
              <SignOutIcon aria-hidden="true" />
              {state.pending ? 'Logging out…' : 'Log out'}
            </div>
            {#if state.error}
              <p role="alert" class="px-2 py-1 text-sm text-destructive">
                Could not log out. Please try again.
              </p>
            {/if}
          {/snippet}
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else if signInProviders === undefined || signInProviders.length || signInURL}
  <button
    bind:this={guestTrigger}
    type="button"
    class={triggerClass}
    aria-label="Log in"
    aria-haspopup="dialog"
    onclick={() => (loginOpen = true)}
  >
    <UserCircleIcon aria-hidden="true" class="block size-7 shrink-0" />
  </button>
  <LoginDialog
    bind:open={loginOpen}
    {apiBaseUrl}
    {signInProviders}
    {signInURL}
    returnFocus={guestTrigger}
  />
{/if}
