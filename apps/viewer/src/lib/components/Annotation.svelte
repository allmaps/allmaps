<script lang="ts">

import Maps from '$lib/components/Maps.svelte'

import { parseAnnotation } from '@allmaps/annotation'
import type { Map } from '@allmaps/annotation'

export let annotation: any

let maps: Map[]
let error: any

$: {
  try {
    maps = parseAnnotation(annotation)
  } catch (err) {
    error = err
  }
}

</script>

{#if error}
  <p>{error.message}</p>
{:else if maps}
  <Maps maps={maps} />
{/if}


