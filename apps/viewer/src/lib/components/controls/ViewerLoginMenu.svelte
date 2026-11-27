<script lang="ts">
  import { tick, untrack } from 'svelte'
  import StarIcon from 'phosphor-svelte/lib/StarIcon'
  import { LoginMenu, LoginMenuItems, LoginMenuTrigger } from '@allmaps/ui/auth'
  import * as DropdownMenu from '@allmaps/ui/dropdown-menu'
  import { ListDialog, type ListDialogState } from '@allmaps/ui/list-dialog'
  import { resolve } from '$app/paths'

  import { authClient, restBaseUrl } from '$lib/shared/auth.js'
  import {
    getStarredOpenAllHref,
    getStarredDialogItems
  } from '$lib/shared/starred-dialog.js'
  import { getStarredState } from '$lib/state/starred.svelte.js'

  const triggerClass = 'size-full pointer-coarse:p-0.5 [&_svg]:size-full'
  const session = authClient.useSession()
  const starred = getStarredState()
  const loading: ListDialogState = {
    status: 'loading',
    message: 'Loading starred maps…'
  }

  let account = $derived(
    $session.data?.user?.isAnonymous ? undefined : $session.data?.user
  )
  let accountTrigger = $state<HTMLButtonElement | null>(null)
  let starredOpen = $state(false)

  async function signOut() {
    const { error } = await authClient.signOut()
    if (error) throw new Error(error.message)
    await tick()
    if (!account) triggerContainer?.querySelector('button')?.focus()
  }

  let triggerContainer = $state<HTMLDivElement>()

  function openStarred() {
    // Give the closing dropdown back its focus before opening the dialog.
    void tick().then(() => {
      if (account) {
        starredOpen = true
      }
    })
  }

  $effect(() => {
    if (!account) starredOpen = false
    else if (starredOpen) untrack(() => void starred.load())
  })

  let starredState = $derived.by((): ListDialogState => {
    if (starred.status === 'idle' || starred.status === 'loading')
      return loading
    if (starred.status === 'error') {
      return {
        status: 'error',
        message: 'Could not load starred maps.',
        retry: () => void starred.load()
      }
    }

    const list = starred.list
    const viewerPath = resolve('/')
    return {
      status: 'ready',
      items: getStarredDialogItems(list?.items ?? [], viewerPath),
      openAllHref: getStarredOpenAllHref(list, viewerPath)
    }
  })
</script>

<div
  class="pointer-events-auto shrink-0 rounded-full border-[0.5px] border-gray-100 bg-white p-0.5 shadow-lg"
>
  <div class="grid size-7 pointer-coarse:size-9" bind:this={triggerContainer}>
    {#if !$session.isPending}
      {#if account}
        <DropdownMenu.Root pendingAnnouncement="Logging out…">
          <LoginMenuTrigger
            bind:ref={accountTrigger}
            user={account}
            class={triggerClass}
          />
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            class="pointer-events-auto"
          >
            <LoginMenuItems user={account} onSignOut={signOut}>
              <DropdownMenu.Item onSelect={openStarred} aria-haspopup="dialog">
                <StarIcon aria-hidden="true" />
                View starred maps…
              </DropdownMenu.Item>
            </LoginMenuItems>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {:else}
        <LoginMenu
          class={triggerClass}
          apiBaseUrl={restBaseUrl}
          onSignOut={signOut}
        />
      {/if}
    {/if}
  </div>
</div>

<ListDialog
  bind:open={starredOpen}
  title={starred.list?.name ?? 'Starred'}
  emptyMessage="You don’t have any starred maps yet."
  state={starredState}
  returnFocus={accountTrigger}
/>
