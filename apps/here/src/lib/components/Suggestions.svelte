<script lang="ts">
  import { fetchJson } from '@allmaps/stdlib'
  import { parseAnnotation, type Map } from '@allmaps/annotation'

  import { position } from '$lib/shared/stores/geolocation.js'

  let parsedAnnotations: Map[] = []

  async function handleGeolocation(position: GeolocationPosition) {
    const latLon = [position.coords.latitude, position.coords.longitude]

    const url = `http://annotations.localhost:9584/maps?limit=25&intersects=${latLon.join(
      ','
    )}`

    const annotations = await fetchJson(url)
    parsedAnnotations = parseAnnotation(annotations)
  }

  $: {
    if ($position) {
      handleGeolocation($position)
    }
  }
</script>

<ol class="list-decimal">
  {#each parsedAnnotations as map}
    <li>
      <a class="underline" href="/?url={map.id}">{map.id}</a>
    </li>
  {/each}
</ol>
