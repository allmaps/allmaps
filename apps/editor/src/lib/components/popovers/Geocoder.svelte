<script lang="ts">
  import { Geocoder } from '@allmaps/components'

  import {
    GeocodeEarthGeocoderProvider,
    WorldHistoricalGazetteerGeocoderProvider
  } from '@allmaps/components/geocoder'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import type { GeocoderGeoJsonFeature } from '@allmaps/components/geocoder'
  import type { Bbox } from '@allmaps/types'

  import { env } from '$env/dynamic/public'

  type Props = {
    open?: boolean
  }

  let { open = $bindable(false) }: Props = $props()

  const uiState = getUiState()

  function handleGeocoderSelect(event: CustomEvent<GeocoderGeoJsonFeature>) {
    open = false
    const feature = event.detail

    if (feature?.bbox) {
      uiState.dispatchFitBbox(feature.bbox as Bbox)
    } else if (feature.geometry) {
      if (feature.geometry.type === 'Point') {
        uiState.dispatchSetCenter(
          feature.geometry.coordinates as [number, number]
        )
      }
    }
  }
</script>

<Geocoder
  providers={[
    new GeocodeEarthGeocoderProvider(env.PUBLIC_GEOCODE_EARTH_KEY),
    new WorldHistoricalGazetteerGeocoderProvider()
  ]}
  onselect={handleGeocoderSelect}
/>
