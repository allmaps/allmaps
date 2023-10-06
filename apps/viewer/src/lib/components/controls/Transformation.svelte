<script lang="ts">
  import {
    transformation,
    nextTransformation
  } from '$lib/shared/stores/transformation.js'

  import { Polynomial1, ThinPlateSpline } from '@allmaps/ui'
</script>

<button
  title={$transformation}
  class="w-9 h-9 p-1.5 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
  on:click={nextTransformation}
>
  {#if $transformation === 'polynomial'}
    <Polynomial1 />
  {:else if $transformation === 'thinPlateSpline'}
    <ThinPlateSpline />
  {/if}
</button>
