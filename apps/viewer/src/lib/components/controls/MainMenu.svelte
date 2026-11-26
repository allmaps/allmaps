<script lang="ts">
  import * as DropdownMenu from '@allmaps/ui/dropdown-menu'
  import { List as ListIcon } from 'phosphor-svelte'
  import Control from './Control.svelte'
  import ControlContainer from './ControlContainer.svelte'
  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
  let trigger = $state<HTMLButtonElement | null>(null)

  function openDialog(dialog: 'keyboard' | 'attribution' | 'about') {
    trigger?.focus()
    uiState.modalOpen[dialog] = true
  }
</script>

<DropdownMenu.Root>
  <ControlContainer>
    <DropdownMenu.Trigger bind:ref={trigger} id="viewer-main-menu-trigger">
      {#snippet child({ props })}
        <Control {...props} ariaLabel="Open Viewer menu">
          <ListIcon aria-hidden="true" class="size-full" weight="bold" />
        </Control>
      {/snippet}
    </DropdownMenu.Trigger>
  </ControlContainer>
  <DropdownMenu.Content align="end" sideOffset={8} class="pointer-events-auto">
    <DropdownMenu.Item onSelect={() => openDialog('keyboard')}>
      Keyboard shortcuts…
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => openDialog('attribution')}>
      Attribution &amp; Licenses…
    </DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => openDialog('about')}>
      About Allmaps Viewer…
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      {#snippet child({ props })}
        <a {...props} href="https://allmaps.org/">Visit allmaps.org</a>
      {/snippet}
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
