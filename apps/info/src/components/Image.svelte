<script lang="ts">
  import type { Map as MapType } from '@allmaps/annotation'
  import type { Image as IIIFImage, Manifest as IIIFManifest } from '@allmaps/iiif-parser'

  export let id: string
  export let parsedIiif: IIIFImage | IIIFManifest
  export let maps: MapType[]
</script>
