<script lang="ts">
  export let type: 'annotation' | 'collection' | 'manifest' | 'image' | 'error'

  function urlTypeToString(type: string) {
    if (type === 'annotation') {
      return 'georef annotation'
    } else if (type === 'error') {
      return 'error'
    } else if (
      type === 'collection' ||
      type === 'manifest' ||
      type === 'image'
    ) {
      return `iiif ${type}`
    }

    return undefined
  }
</script>

{#if urlTypeToString(type)}
  <div
    class="small-caps px-2 py-0.5 m-1 bg-lime-600/50 text-lime-700 rounded-md border-lime-800/25 border-1 text-xs"
    title={urlTypeToString(type)}
  >
    {urlTypeToString(type)}
  </div>
{/if}

<style>
  .small-caps {
    font-variant: small-caps;
  }
</style>
