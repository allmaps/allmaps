<script lang="ts">
  import { onMount } from 'svelte'

  import Map from 'ol/Map.js'
  import XYZ from 'ol/source/XYZ.js'
  import TileLayer from 'ol/layer/Tile.js'
  import { toLonLat, fromLonLat } from 'ol/proj.js'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import type { Point } from '@allmaps/types'

  import type { TileJSON } from '$lib/types.js'

  type Props = {
    tileJson: TileJSON
  }

  let { tileJson }: Props = $props()

  const uiState = getUiState()

  onMount(async () => {
    const tileUrl = tileJson.tiles[0]

    const map = new Map({
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19
          })
        }),
        new TileLayer({
          source: new XYZ({
            url: tileUrl,
            maxZoom: 19
          })
        })
      ],
      target: 'ol'
    })

    const bbox = [
      ...fromLonLat([tileJson.bounds[0], tileJson.bounds[1]]),
      ...fromLonLat([tileJson.bounds[2], tileJson.bounds[3]])
    ]

    const view = map.getView()

    view.fit(bbox, {
      padding: [25, 25, 25, 25]
    })

    const center = view.getCenter()

    uiState.zoom = view.getZoom()
    uiState.center = center ? (toLonLat(center) as Point) : undefined
  })
</script>

<div id="ol" class="w-full h-full"></div>
