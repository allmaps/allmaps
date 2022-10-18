<script lang="ts">
  import API from '$lib/components/API.svelte'

  import type { Collection as IIIFCollection } from '@allmaps/iiif-parser'

  export let parsedIiif: IIIFCollection
</script>

<p>This is a IIIF Collection.</p>

<API {parsedIiif} />
