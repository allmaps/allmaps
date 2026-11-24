<script lang="ts">
  import FolderIcon from 'phosphor-svelte/lib/FolderIcon'
  import StarIcon from 'phosphor-svelte/lib/StarIcon'
  import KeyboardIcon from 'phosphor-svelte/lib/KeyboardIcon'
  import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon'
  import * as Kbd from '$lib/kbd.js'
  import * as DropdownMenu from '$lib/dropdown-menu.js'
  import Button from '$lib/components/ui/button/button.svelte'
  import Playground from './Playground.svelte'

  let open = $state(false)
  let favorite = $state(false)
  let message = $state('')
  let showIcons = $state(true)
  let showShortcut = $state(true)

  function toggleFavorite() {
    favorite = !favorite
    message = favorite
      ? 'Map added to favorites.'
      : 'Map removed from favorites.'
  }

  function handleShortcut(event: KeyboardEvent) {
    if (
      event.key.toLowerCase() !== 'f' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      event.repeat ||
      event.isComposing
    )
      return
    event.preventDefault()
    toggleFavorite()
    open = false
  }
</script>

<Playground>
  {#snippet preview()}
    <div class="grid justify-items-center gap-3">
      <DropdownMenu.Root bind:open>
        <DropdownMenu.Trigger onkeydowncapture={handleShortcut}>
          {#snippet child({ props })}
            <Button {...props}>Map actions</Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" onkeydowncapture={handleShortcut}>
          <DropdownMenu.Item aria-keyshortcuts="F" onSelect={toggleFavorite}>
            {#if showIcons}<StarIcon aria-hidden="true" />{/if}
            {favorite ? 'Remove from favorites' : 'Add to favorites'}
            {#if showShortcut}
              <DropdownMenu.Shortcut
                ><Kbd.Root>F</Kbd.Root></DropdownMenu.Shortcut
              >
            {/if}
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            {#snippet child({ props })}
              <a {...props} href="/components/kbd">
                {#if showIcons}<KeyboardIcon aria-hidden="true" />{/if}
                View keycaps
              </a>
            {/snippet}
          </DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              {#if showIcons}<FolderIcon aria-hidden="true" />{/if}
              Add to collection
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent onkeydowncapture={handleShortcut}>
                {#each ['Field notes', 'Research atlas'] as collection (collection)}
                  <DropdownMenu.Item
                    onSelect={() => (message = `Map added to ${collection}.`)}
                    >{collection}</DropdownMenu.Item
                  >
                {/each}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item disabled>
            {#if showIcons}<DownloadSimpleIcon aria-hidden="true" />{/if}
            Download map
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      {#if message}<p role="status" class="m-0 text-sm">{message}</p>{/if}
    </div>
  {/snippet}
  {#snippet controls()}
    <label class="flex items-center gap-2 text-sm"
      ><input type="checkbox" bind:checked={showIcons} /> Show icons</label
    >
    <label class="flex items-center gap-2 text-sm"
      ><input type="checkbox" bind:checked={showShortcut} /> Show shortcut</label
    >
  {/snippet}
</Playground>
