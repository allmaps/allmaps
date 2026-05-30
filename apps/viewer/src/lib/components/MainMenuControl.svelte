<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { List as ListIcon } from 'phosphor-svelte'

  import ControlContainer from '$lib/components/ControlContainer.svelte'
  import Keyboard from '$lib/components/modals/Keyboard.svelte'
  import { getUiState } from '$lib/state/ui.svelte.js'

  let keyboardOpen = $state(false)
  const uiState = getUiState()
</script>

<ControlContainer>
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="cursor-pointer rounded transition-colors hover:bg-pink/10 hover:text-pink"
      aria-label="Open main menu"
    >
      <ListIcon class="size-5" weight="bold" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      class="w-full max-w-[229px] rounded-lg border border-gray-100 bg-white px-1 py-1.5 shadow-md"
      sideOffset={8}
    >
      <DropdownMenu.Item
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
        onclick={() => (keyboardOpen = true)}
      >
        Keyboard shortcuts…
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
        onclick={() => (uiState.modalOpen.about = true)}
      >
        About Allmaps Viewer…
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</ControlContainer>

<div class="contents pointer-events-auto">
  <Keyboard bind:open={keyboardOpen} />
</div>
