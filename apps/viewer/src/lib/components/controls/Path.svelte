<script lang="ts">
  import { mapCount } from '$lib/shared/stores/maps.js'
  import { firstSource } from '$lib/shared/stores/sources.js'

  // import DropdownButton from '$lib/components/elements/DropdownButton.svelte'
  // import MapsDropdown from '$lib/components/dropdowns/Maps.svelte'

  import type { Source } from '$lib/shared/types.js'

  /*
  MAP VIEW:

    Single source:

      1 map
      annotationpage -> 2 maps                                     1 selected
      collecion -> manifest -> annotationpage -> 10 maps           3 maps selected

    Multiple sources:

      source 1 -> collection -> manifest -> 3 maps                 9 maps selected
      source 2 -> annotationpage -> 13 maps                        8 maps selected

  IMAGE VIEW:

      source 1 -> collection -> manifest -> 3 maps                 viewing map 4 of 10 selected
  */

  function typeFromSource(source: Source) {
    if (source.parsed.type === 'annotation') {
      return 'Annotation'
    } else if (source.parsed.type === 'iiif') {
      if (source.parsed.iiif.type === 'image') {
        return 'Image'
      } else if (source.parsed.iiif.type === 'manifest') {
        return 'Manifest'
      } else if (source.parsed.iiif.type === 'collection') {
        return 'Collection'
      }
    }
  }
</script>

<nav
  class="inline-flex items-center p-2 space-x-1 md:space-x-3 text-sm bg-white border border-gray-200 rounded-lg"
>
  <ol class="inline-flex items-center space-x-1 md:space-x-3">
    {#if $firstSource}
      <li class="inline-flex items-center">
        <div>{typeFromSource($firstSource)}</div>
      </li>
    {/if}
    <li>
      <div class="flex items-center space-x-1 md:space-x-3">
        <span>→</span>

        <div>
          <span>{$mapCount} </span>
          {#if $mapCount === 1}
            <span>map</span>
          {:else}
            <span>maps</span>
          {/if}
        </div>

        <!-- <DropdownButton>
          <div slot="button">
            <span>{$mapCount} </span>
            {#if $mapCount === 1}
              <span>map</span>
            {:else}
              <span>maps</span>
            {/if}
          </div>
          <MapsDropdown slot="dropdown" />
        </DropdownButton> -->
      </div>
    </li>
  </ol>
</nav>
