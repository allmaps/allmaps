<script lang="ts">
  import { PUBLIC_ANNOTATIONS_URL } from '$env/static/public'

  import { fetchJson, fetchImageInfo } from '@allmaps/stdlib'
  import { parseAnnotation } from '@allmaps/annotation'
  import { Thumbnail } from '@allmaps/ui'

  import { position } from '$lib/shared/stores/geolocation.js'
  import { maps } from '$lib/shared/stores/maps.js'

  // eslint-disable-next-line no-undef
  async function handleGeolocation(position: GeolocationPosition) {
    const latLon = [position.coords.latitude, position.coords.longitude]

    const url = `${PUBLIC_ANNOTATIONS_URL}/maps?limit=25&intersects=${latLon.join(
      ','
    )}`

    const annotations = await fetchJson(url)
    $maps = parseAnnotation(annotations)
  }

  $: {
    if ($position) {
      handleGeolocation($position)
    }
  }
</script>

<ol class="grid grid-cols-6 gap-2">
  {#each $maps as map}
    <li class="aspect-square overflow-hidden">
      <a class="underline" href="/?url={map.id}">
        {#await fetchImageInfo(map.resource.id)}
          <p>...waiting</p>
        {:then imageInfo}
          <Thumbnail {imageInfo} width={210} height={210} />
        {:catch error}
          <p style="color: red">{error.message}</p>
        {/await}
      </a>
    </li>
  {/each}
</ol>
