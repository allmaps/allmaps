<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { CaretDown as CaretDownIcon, Copy as CopyIcon } from 'phosphor-svelte'

  import MenuContent from '$lib/components/menu/MenuContent.svelte'
  import MenuItem from '$lib/components/menu/MenuItem.svelte'
  import MenuLinkItem from '$lib/components/menu/MenuLinkItem.svelte'
  import MenuSeparator from '$lib/components/menu/MenuSeparator.svelte'

  type ResourceType = 'manifest' | 'canvas' | 'image-service'

  type Props = {
    id: string
    openUrl: string
    type: ResourceType
  }

  let { id, openUrl, type }: Props = $props()

  let resourceLabel = $derived.by(() => {
    if (type === 'manifest') {
      return 'Manifest'
    } else if (type === 'canvas') {
      return 'Canvas'
    }

    return 'Image Service'
  })
  let theseusViewerUrl = $derived(
    `https://theseusviewer.org/?iiif-content=${encodeURIComponent(openUrl)}`
  )
  let openLabel = $derived(`Open ${resourceLabel} in new tab`)

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(id)
    } catch (error) {
      console.error(`Failed to copy ${resourceLabel} ID:`, error)
    }
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="inline-flex max-w-full min-w-0 cursor-pointer items-center gap-1.5 text-pink underline"
    title={id}
  >
    <span class="truncate font-mono">{id}</span>
    <CaretDownIcon class="size-3.5 shrink-0" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <MenuContent side="bottom" align="start" sideOffset={4}>
      <MenuItem onSelect={handleCopyId}>
        <CopyIcon class="size-4" />
        <span>Copy {resourceLabel} ID</span>
      </MenuItem>

      <MenuLinkItem href={openUrl}>
        {#if type === 'image-service'}
          Open <span class="font-mono">info.json</span> in new tab
        {:else}
          {openLabel}
        {/if}
      </MenuLinkItem>
      <MenuSeparator />
      <MenuLinkItem href={theseusViewerUrl}>Open in Theseus Viewer</MenuLinkItem
      >
    </MenuContent>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
