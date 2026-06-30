<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { List as ListIcon } from 'phosphor-svelte'

  import Control from './Control.svelte'

  import MenuContent from '$lib/components/menu/MenuContent.svelte'
  import MenuItem from '$lib/components/menu/MenuItem.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Control {...props} ariaLabel="Open main menu">
        <ListIcon class="size-full" weight="bold" />
      </Control>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <MenuContent sideOffset={8}>
      <MenuItem
        onSelect={() => {
          uiState.modalOpen.keyboard = true
        }}
      >
        Keyboard shortcuts…
      </MenuItem>
      <MenuItem
        onSelect={() => {
          uiState.modalOpen.attribution = true
        }}
      >
        Attribution & Licenses…
      </MenuItem>
      <MenuItem
        onSelect={() => {
          uiState.modalOpen.about = true
        }}
      >
        About Allmaps Viewer…
      </MenuItem>
    </MenuContent>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
