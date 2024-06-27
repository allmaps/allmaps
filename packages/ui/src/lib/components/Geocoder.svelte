<script lang="ts">
  import { throttle } from 'lodash-es'
  import { createEventDispatcher } from 'svelte'

  import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public'

  import type { GeojsonPoint } from '@allmaps/types'

  type GeoJsonFeatureGE = GeojsonPoint & { properties: { label: string } }

  export const focusPointLon: number | undefined = undefined
  export const focusPointLat: number | undefined = undefined

  let searchTerm = ''
  let features: GeoJsonFeatureGE[] = []
  // Usage: this returns a GeoJSON of with the following info
  // - properties.name => short location description
  // - properties.label => long location description
  // - geometry.coordinates => coordinates
  let selectedFeature: GeoJsonFeatureGE | undefined
  let softFocusIndex = -1
  let softFocusedElement: HTMLButtonElement | undefined

  const THROTTLE_WAIT_MS = 200
  const THROTTLE_OPTIONS = {
    leading: true,
    trailing: true
  }

  async function getFeatures(text = ''): Promise<void> {
    try {
      let query =
        `https://api.geocode.earth/v1/autocomplete` +
        `?api_key=${PUBLIC_GEOCODE_EARTH_API_KEY}` +
        `&text=${text}`
      if (focusPointLon && focusPointLat) {
        query += `&focus.point.lon=${focusPointLon}&focus.point.lat=${focusPointLat}`
      }
      features = await fetch(query)
        .then((response) => response.json())
        .then((response) => response.features)
    } catch (error) {
      console.error('Error fetching geocoder:', error)
      return
    }
  }

  const throttledGetFeatures = throttle(
    getFeatures,
    THROTTLE_WAIT_MS,
    THROTTLE_OPTIONS
  )

  // Using if to avoid calling `fetch` eagerly during server side rendering
  $: promise = searchTerm ? throttledGetFeatures(searchTerm) : undefined

  const dispatch = createEventDispatcher()

  $: dispatch('features', features)
  $: dispatch('select', selectedFeature)

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const resultElements = [
        ...document.querySelectorAll('.result')
      ] as HTMLButtonElement[]
      for (const resultElement of resultElements) {
        resultElement.parentElement?.classList.remove('softFocus')
      }

      if (event.key === 'ArrowDown') {
        softFocusIndex = (softFocusIndex + 1) % resultElements.length
      } else if (event.key === 'ArrowUp') {
        softFocusIndex =
          (softFocusIndex - 1 + resultElements.length) % resultElements.length
      }

      softFocusedElement = resultElements[softFocusIndex]
      softFocusedElement?.scrollIntoView({ block: 'nearest' })
      softFocusedElement?.parentElement?.classList.add('softFocus')
    } else if (event.key === 'Enter') {
      softFocusedElement?.click()
    } else {
      softFocusIndex = -1
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="search">
  <input
    bind:value={searchTerm}
    placeholder="Search Location"
    autocomplete="off"
    spellcheck="false"
    type="search"
  />

  <div class="results">
    {#if searchTerm}
      <ul>
        {#await promise}
          <!-- Only the most recent promise is considered, meaning we don't need to worry about race conditions. -->
          <li>...searching</li>
        {:then}
          {#each features as feature}
            <li>
              <button
                on:click={() => {
                  selectedFeature = feature
                }}
                class="result"
                tabindex="0"
              >
                {feature.properties.label}
              </button>
            </li>
          {/each}
          <!-- {:catch error} <p style="color: red">{error.message}</p> -->
        {/await}
      </ul>
    {/if}
  </div>
</div>

<style>
  .search {
    width: 90vw;
    max-width: 600px;
    position: fixed;
    left: 50%;
    top: 20%;
    translate: -50% -0%;
    border-radius: 0.5rem;
    box-shadow: 0px 0px 20px hsl(0 0% 0% / 40%);
    overflow: hidden;

    & input {
      width: 100%;
      padding: 1.5rem;
      font: inherit;
      border: none;
      outline: none;
    }
  }

  .results {
    max-height: 48vh;
    padding: 1.5rem;
    color: rgb(20, 20, 20);
    background-color: white;
    overflow-y: auto;
    scrollbar-width: thin;

    & ul {
      display: grid;
      gap: 0.5rem;
      padding: 0px;
      margin: 0px;
      list-style: none;

      & li {
        padding: 1rem;
      }

      & li.softFocus {
        border-radius: 0.5rem;
        background-color: #f6f6f6;
      }
    }
  }
</style>
