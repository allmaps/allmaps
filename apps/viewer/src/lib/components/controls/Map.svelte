<script lang="ts">
  import { ol } from '$lib/shared/stores/openlayers.js'

  import Zoom from 'ol/control/Zoom.js'
  import Rotate from 'ol/control/Rotate.js'

  let container: HTMLElement

  const classes = [
    'inline-flex',
    'items-center',
    'w-9',
    'h-9',
    'bg-white',
    'border',
    'border-gray-200',
    'hover:bg-gray-100',
    'hover:text-blue-700',
    'text-center',
    'inline-flex',
    'items-center',
    'justify-center',
    'relative',
    'focus:z-50',
    'focus:ring-2',
    'focus:ring-blue-700',
    'focus:text-blue-700',
    'dark:bg-gray-700',
    'dark:border-gray-600',
    'dark:text-white',
    'dark:hover:text-white',
    'dark:hover:bg-gray-600',
    'dark:focus:ring-blue-500',
    'dark:focus:text-white'
  ]

  let rotateButtonMouseMoveStartX: number

  function handleRotateButtonMove(event: Event) {
    let diffX: number | undefined

    if (window.TouchEvent && event instanceof TouchEvent) {
      diffX = event.touches[0].screenX - rotateButtonMouseMoveStartX
    } else if (event instanceof MouseEvent) {
      diffX = event.screenX - rotateButtonMouseMoveStartX
    }

    if ($ol && diffX !== undefined) {
      $ol.getView().setRotation(diffX / 100)
    }
  }

  ol.subscribe((map) => {
    if (!container) {
      return
    }

    if (map) {
      const zoom = new Zoom({
        target: container
      })

      const rotate = new Rotate({
        target: container
      })

      // @ts-ignore
      zoom.element.classList.remove('ol-control')

      // @ts-ignore
      rotate.element.classList.remove('ol-control')

      zoom.setMap(map)
      rotate.setMap(map)

      const zoomIn = container.querySelector('.ol-zoom-in')
      if (zoomIn) {
        zoomIn.classList.remove('ol-zoom-in')
        zoomIn.classList.add(...classes, 'rounded-l-lg')
      }

      const zoomOut = container.querySelector('.ol-zoom-out')
      if (zoomOut) {
        zoomOut.classList.remove('ol-zoom-out')
        zoomOut.classList.add(...classes)
      }

      const rotateButton = container.querySelector('.ol-rotate-reset')
      if (rotateButton) {
        rotateButton.classList.add(...classes, 'rounded-r-lg')

        rotateButton.addEventListener('mousedown', (event: Event) => {
          if (event instanceof MouseEvent) {
            rotateButtonMouseMoveStartX = event.screenX

            window.addEventListener('mousemove', handleRotateButtonMove)

            window.addEventListener('mouseup', () => {
              window.removeEventListener('mousemove', handleRotateButtonMove)
            })

            event.preventDefault()
          }
        })

        rotateButton.addEventListener('touchstart', (event: Event) => {
          if (event instanceof TouchEvent) {
            rotateButtonMouseMoveStartX = event.touches[0].screenX

            window.addEventListener('touchmove', handleRotateButtonMove)

            window.addEventListener('touchend', () => {
              window.removeEventListener('touchmove', handleRotateButtonMove)
            })

            event.preventDefault()
          }
        })
      }
    } else {
      container.querySelector('.ol-zoom')?.remove()
      container.querySelector('.ol-rotate')?.remove()
    }
  })

  const tileSources = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  ]

  let tileSourceIndex = 0
</script>

<div
  bind:this={container}
  class="inline-flex rounded-md shadow-sm"
  role="group"
>
  <!--
  <button
    type="button"
    class="inline-flex items-center p-1 text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
  >
    <svg
      class="w-5 h-5 fill-current"
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clip-rule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        fill-rule="evenodd"
      />
    </svg>
  </button>
  <button
    type="button"
    class="inline-flex items-center p-1 text-gray-900 bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
  >
  <svg class="w-5 h-5 fill-current" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path clip-rule="evenodd" d="M10 18a.75.75 0 01-.75-.75V4.66L7.3 6.76a.75.75 0 11-1.1-1.02l3.25-3.5a.75.75 0 011.1 0l3.25 3.5a.75.75 0 01-1.1 1.02l-1.95-2.1v12.59A.75.75 0 0110 18z" fill-rule="evenodd"></path>
  </svg>
  </button> -->
</div>

<!-- <div class="select-container">
  <div class="select">
    <select bind:value={tileSourceIndex}>
      <option value={0}>Map</option>
      <option value={2}>Satellite</option>
    </select>
  </div>
</div> -->
