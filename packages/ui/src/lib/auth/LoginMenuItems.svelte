<script lang="ts">
  import type { Snippet } from 'svelte'
  import AccountAvatar from './AccountAvatar.svelte'
  import SignOutIcon from 'phosphor-svelte/lib/SignOutIcon'
  import * as DropdownMenu from '../dropdown-menu.js'
  import { displayName } from './display-name.js'
  import type { AccountLink, LoginUser } from './types.js'

  let {
    user,
    accountLinks = [],
    children,
    onLogIn,
    onSignOut
  }: {
    user?: LoginUser | null
    accountLinks?: AccountLink[]
    children?: Snippet
    onLogIn?: () => void
    onSignOut: () => void | Promise<void>
  } = $props()
</script>

{#if user}
  <DropdownMenu.Group>
    <DropdownMenu.GroupHeading class="flex items-center gap-2 px-2 py-1.5">
      <span class="grid size-7 shrink-0 place-items-center">
        <AccountAvatar image={user.image} />
      </span>
      <span class="min-w-0 truncate">{displayName(user) ?? 'Account'}</span>
    </DropdownMenu.GroupHeading>
    <DropdownMenu.Separator />
    {@render children?.()}
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
{:else}
  {@render children?.()}
  {#if onLogIn}
    <DropdownMenu.Item onSelect={onLogIn}>Log in…</DropdownMenu.Item>
  {/if}
{/if}
