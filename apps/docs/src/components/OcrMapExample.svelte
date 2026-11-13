<script lang="ts">
  import GeojsonPreview from './GeojsonPreview.svelte'

  let { url }: { url: string } = $props()
  let reset = $state<(() => void) | undefined>()
</script>

<figure
  class="not-content my-6 overflow-hidden rounded border border-solid border-[var(--sl-color-gray-5)]"
>
  <div class="relative h-[26rem]">
    <GeojsonPreview
      {url}
      showLabels={true}
      padding={48}
      ariaLabel="OCR text polygons in San Francisco. Pan and zoom to explore."
      bind:reset
    />
  </div>
  <figcaption
    class="flex items-center gap-3 px-3 py-2 text-sm text-[var(--sl-color-gray-2)]"
  >
    <span
      >The text polygons in geographic coordinates. Pan and zoom to explore.</span
    >
    <button
      class="ml-auto shrink-0 cursor-pointer rounded border border-solid border-[var(--sl-color-gray-4)] bg-[var(--sl-color-bg)] px-2 py-1 text-[var(--sl-color-text)] disabled:opacity-50"
      type="button"
      disabled={!reset}
      onclick={() => reset?.()}>Show all</button
    >
  </figcaption>
</figure>
