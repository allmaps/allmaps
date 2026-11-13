<script lang="ts">
  import GeojsonPreview from './GeojsonPreview.svelte'

  let { url }: { url: string } = $props()
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
    />
  </div>
</figure>
