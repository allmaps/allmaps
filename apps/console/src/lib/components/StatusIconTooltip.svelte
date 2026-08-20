<script lang="ts">
  import { Tooltip } from 'bits-ui'

  import type { Snippet } from 'svelte'

  let {
    label,
    imageUrl,
    imageAlt = '',
    showLabel = true,
    children
  }: {
    label: string
    imageUrl?: string
    imageAlt?: string
    showLabel?: boolean
    children: Snippet
  } = $props()
</script>

<Tooltip.Root>
  <Tooltip.Trigger
    aria-label={label}
    class="inline-flex rounded-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
  >
    {@render children()}
  </Tooltip.Trigger>

  <Tooltip.Portal>
    <Tooltip.Content
      side="top"
      sideOffset={6}
      class="z-50 max-w-80 rounded bg-gray-900 px-2 py-1 font-sans text-xs text-white shadow-sm"
    >
      {#if imageUrl}
        <div
          class:mb-1.5={showLabel}
          class="flex h-20 w-40 items-center justify-center overflow-hidden rounded bg-white p-2"
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            class="max-h-full max-w-full object-contain"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        </div>
      {/if}
      {#if showLabel}
        <span class="break-all">{label}</span>
      {/if}
      <Tooltip.Arrow class="fill-gray-900" />
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
