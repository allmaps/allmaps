<script lang="ts">
  import API from '$lib/components/API.svelte'

  import type { Image as IIIFImage } from '@allmaps/iiif-parser'

  export let parsedIiif: IIIFImage
</script>

<p>This is a IIIF Image.</p>

<API {parsedIiif} />
