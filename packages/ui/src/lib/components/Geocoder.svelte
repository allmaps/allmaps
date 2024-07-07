<script lang="ts">
  import { throttle } from 'lodash-es'
  import { onMount, createEventDispatcher } from 'svelte'

  import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public'

  import searchIcon from '$lib/shared/images/search.svg'

  import type { GeojsonPoint, GeojsonGeometry } from '@allmaps/types'

  type GeoJsonFeatureGE = {
    geometry: GeojsonPoint
    properties: { label: string }
  }
  type GeoJsonFeatureWHG = {
    geometry?: GeojsonGeometry
    properties: { title: string }
  }
  // WHG return 'GeoJSON features', but not necessarilly points, and sometimes without geometry.
  type GeoJsonFeature = GeoJsonFeatureGE

  export const focusPointLon: number | undefined = undefined
  export const focusPointLat: number | undefined = undefined

  let searchTerm = ''
  let featuresGE: GeoJsonFeatureGE[] = []
  let featuresWHG: GeoJsonFeatureWHG[] = []
  let features: GeoJsonFeature[] = []
  // Usage: this returns a GeoJSON of with the following info
  // - properties.name => short location description
  // - properties.label => long location description
  // - geometry.coordinates => coordinates
  let selectedFeature: GeoJsonFeature | undefined
  let softFocusIndex = -1
  let softFocusedElement: HTMLButtonElement | undefined

  let geocoderPopover: any
  onMount(() => {
    geocoderPopover = document.getElementById('geocoder-popover')
  })

  const THROTTLE_WAIT_MS = 200
  const THROTTLE_OPTIONS = {
    leading: true,
    trailing: true
  }

  const throttledGetFeatures = throttle(
    getFeatures,
    THROTTLE_WAIT_MS,
    THROTTLE_OPTIONS
  )

  function getFeatures(text: string): void {
    if (text == '') {
      // Using if to avoid calling `fetch` eagerly during server side rendering
      featuresGE = []
      featuresWHG = []
      return
    }
    getFeaturesGE(text)
    getFeaturesWHG(text)
  }

  async function getFeaturesGE(text: string): Promise<void> {
    try {
      let query =
        `https://api.geocode.earth/v1/autocomplete` +
        `?api_key=${PUBLIC_GEOCODE_EARTH_API_KEY}` +
        `&text=${text}`
      if (focusPointLon && focusPointLat) {
        query += `&focus.point.lon=${focusPointLon}&focus.point.lat=${focusPointLat}`
      }
      featuresGE = await fetch(query)
        .then((response) => response.json())
        .then((response) => response.features)
    } catch (error) {
      console.error('Error fetching geocode.earth:', error)
      return
    }
  }

  async function getFeaturesWHG(text: string): Promise<void> {
    try {
      let query = `https://whgazetteer.org/api/index/?name=${text}`
      featuresWHG = await fetch(query)
        .then((response) => response.json())
        .then((response) => response.features)
    } catch (error) {
      console.error('Error fetching World Historical Gazetteer:', error)
      // Strangly WHG seems to crash for some common search terms
      // Example: https://whgazetteer.org/api/index/?name=London
      return
    }
  }

  $: throttledGetFeatures(searchTerm)

  $: features = [
    ...featuresGE.map(({ geometry, properties }) => ({ geometry, properties })),
    ...featuresWHG
      .filter((feature) => feature.geometry?.type == 'Point')
      .map(({ geometry, properties }) => ({
        geometry: geometry as GeojsonPoint,
        properties: { label: properties.title }
      }))
  ].slice(0, 5)

  function handleClick(feature: GeoJsonFeature): void {
    selectedFeature = feature
    geocoderPopover.hidePopover()
    // This doesn't seem to work when the click comes from an 'Enter'
  }

  function handleKeydown(event: KeyboardEvent) {
    const resultElements = [
      ...document.querySelectorAll('.result')
    ] as HTMLButtonElement[]
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (event.key === 'ArrowDown') {
        softFocusIndex = (softFocusIndex + 1) % features.length
      } else if (event.key === 'ArrowUp') {
        if (softFocusIndex == -1) {
          softFocusIndex = features.length - 1
        } else {
          softFocusIndex =
            (softFocusIndex - 1 + features.length) % features.length
        }
      }
      // softFocusedElement = resultElements[softFocusIndex]
      // softFocusedElement?.scrollIntoView({ block: 'nearest' })
      // Keeping this here in case we need to implement scrollIntoView for small screens
    } else if (event.key === 'Enter') {
      softFocusedElement = resultElements[softFocusIndex]
      softFocusedElement?.click()
    } else {
      softFocusIndex = -1
    }
  }

  const dispatch = createEventDispatcher()

  $: dispatch('features', features)
  $: dispatch('select', selectedFeature)
</script>

<svelte:window on:keydown={handleKeydown} />

<button popovertarget="geocoder-popover" class={$$restProps.class || ''}>
  <img alt="Search Icon" src={searchIcon} />
</button>

<div popover="auto" id="geocoder-popover">
  <img alt="Search Icon" src={searchIcon} />
  <!-- svelte-ignore a11y-autofocus -->
  <input
    bind:value={searchTerm}
    placeholder="Search Location"
    autocomplete="off"
    spellcheck="false"
    type="search"
    autofocus
  />

  <div class="results">
    <ul>
      {#each features as feature, index}
        <li class={index == softFocusIndex ? 'softFocus' : ''}>
          <button
            on:click={() => {
              handleClick(feature)
            }}
            class="result"
            tabindex="0"
          >
            {feature.properties.label}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  :popover-open {
    position: fixed;
    left: 50%;
    top: 20%;
    width: 90vw;
    max-width: 600px;
    margin: 0px;
    translate: -50% -0%;
    border-radius: 0.5rem;
    box-shadow: 0px 0px 20px hsl(0 0% 0% / 40%);
    overflow: hidden;
    box-sizing: border-box;

    & img {
      position: absolute;
      color: grey;
      left: 1.4rem;
      top: 1.7rem;
      width: 1.4rem;
      height: 1.4rem;
    }

    & input {
      width: 100%;
      padding: 1.5rem;
      padding-left: 3.5rem;
      font: inherit;
      border: none;
      outline: none;
    }

    & .results {
      max-height: 48vh;
      padding: 1.5rem;
      background-color: white;
      overflow-y: auto;
      scrollbar-width: thin;

      & ul {
        & li {
          padding: 1rem;
        }

        & li.softFocus {
          border-radius: 0.5rem;
          outline: 1px solid black;
          /* background-color: #f6f6f6; */
        }
      }
    }
  }
</style>
