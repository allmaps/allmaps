<script lang="ts">
  import API from '$lib/components/API.svelte'

  import type { Manifest as IIIFManifest } from '@allmaps/iiif-parser'

  export let parsedIiif: IIIFManifest
</script>

<p>This is a IIIF Manifest.</p>

<API {parsedIiif} />
