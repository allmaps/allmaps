<script lang="ts">
  import type { Source } from '$lib/shared/types.js'

  export let source: Source
</script>

{#if source.parsed.type === 'iiif'}
  <p class="mb-2">No georeferenced maps found for this IIIF resource.</p>
  <div>
    {#if source.sourceType === 'url' && source.parsed.type === 'iiif'}
      <a
        href="https://editor.allmaps.org/#/collection?url={source.url}"
        class="text-white bg-pink-500 hover:bg-pink-300 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
        >Georeference with Allmaps Editor</a
      >
    {/if}
    <a
      href="/"
      class="text-white bg-pink-500 hover:bg-pink-300 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
      >Reset</a
    >
  </div>
{:else if source.parsed.type === 'annotation'}
  <p class="mb-2">
    No georeferenced maps found in this Georeference Annotation.
  </p>
  <a
    href="/"
    class="text-white bg-pink-500 hover:bg-pink-300 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
    >Reset</a
  >
{/if}
