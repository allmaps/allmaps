<script lang="ts">
  type ImageRequest = {
    name: string
  }
  export let parsedIiif

  let previewItems: ImageRequest[] = []
  $: if (parsedIiif) {
    parsedIiif.canvases.forEach((c) => {})
  }
</script>

<div>
  <div></div>
</div>
