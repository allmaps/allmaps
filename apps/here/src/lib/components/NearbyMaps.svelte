<script lang="ts">
  import { Thumbnail, Collection } from '@allmaps/ui'

  import { mapsWithImageInfo } from '$lib/shared/stores/maps-with-image-info.js'
</script>

<Collection>
  {#each $mapsWithImageInfo as mapWithImageInfo (mapWithImageInfo.map.id)}
    <li class="aspect-square overflow-hidden">
      <a class="underline" href="/?url={mapWithImageInfo.map.id}">
        <Thumbnail
          imageInfo={mapWithImageInfo.imageInfo}
          width={640}
          height={640}
        />
      </a>
    </li>
  {/each}
</Collection>
