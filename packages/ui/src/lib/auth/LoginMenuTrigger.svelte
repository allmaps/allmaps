<script lang="ts">
  import AccountAvatar from './AccountAvatar.svelte'
  import * as DropdownMenu from '../dropdown-menu.js'
  import { cn } from '../components/ui/utils.js'
  import { displayName } from './display-name.js'
  import type { LoginUser } from './types.js'

  let {
    user,
    ref = $bindable(null),
    id,
    class: className,
    'aria-label': label,
    onLogIn
  }: {
    user?: LoginUser | null
    ref?: HTMLButtonElement | null
    id?: string
    class?: string
    'aria-label'?: string
    onLogIn?: () => void
  } = $props()

  const name = $derived(displayName(user))
  const triggerClass = $derived(
    cn(
      'relative inline-flex size-10 shrink-0 cursor-pointer appearance-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 font-allmaps-ui leading-none text-inherit shadow-none after:pointer-events-none after:absolute after:inset-0 hover:after:bg-current/5 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      className
    )
  )
</script>

{#if !user && onLogIn}
  <button
    bind:this={ref}
    {id}
    type="button"
    class={triggerClass}
    aria-label={label ?? 'Log in'}
    aria-haspopup="dialog"
    onclick={onLogIn}
  >
    <AccountAvatar />
  </button>
{:else}
  <DropdownMenu.Trigger
    bind:ref
    {id}
    class={triggerClass}
    aria-label={label ?? (name ? `Account menu for ${name}` : 'Account menu')}
  >
    <AccountAvatar image={user?.image} />
  </DropdownMenu.Trigger>
{/if}
