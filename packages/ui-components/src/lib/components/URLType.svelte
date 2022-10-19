<script lang="ts">
  export let type: 'annotation' | 'collection' | 'manifest' | 'image'

  function urlTypeToString(type: string) {
    if (type === 'annotation') {
      return 'georef annotation'
    } else {
      return `iiif ${type}`
    }
  }
</script>

<div
  class="small-caps px-2 py-0.5 m-1 bg-lime-600/50 text-lime-700 rounded-md border-lime-800/25 border-1 text-xs "
>
  {urlTypeToString(type)}
</div>

<style>
  .small-caps {
    font-variant: small-caps;
  }
</style>
