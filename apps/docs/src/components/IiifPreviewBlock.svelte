<script lang="ts">
  //   import { ImageRequest } from '@allmaps/iiif-parser'
  type ImageRequest = {
    name: string
  }
  export let parsedIiif

  let previewItems: ImageRequest[] = []
  $: if (parsedIiif) {
    parsedIiif.canvases.forEach((c) => {
      //   console.log(c.image.getThumbnail({ width: 200, height: 200 }))
      //   previewItems.push(...c.image.getThumbnail({ width: 200, height: 200 }))
    })
  }
</script>

<div>
  <div></div>
</div>
