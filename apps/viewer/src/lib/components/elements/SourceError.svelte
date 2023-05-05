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
        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >Georeference with Allmaps Editor</a
      >
    {/if}
    <a
      href="/"
      class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
      >Reset</a
    >
  </div>
{:else if source.parsed.type === 'annotation'}
  <p class="mb-2">
    No georeferenced maps found in this Georeference Annotation.
  </p>
  <a
    href="/"
    class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
    >Reset</a
  >
{/if}
