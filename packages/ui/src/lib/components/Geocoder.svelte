<script lang="ts">
  import { throttle } from 'lodash-es'
  import { onMount, createEventDispatcher } from 'svelte'
  import searchIcon from '$lib/shared/images/search.svg'

  import type { GeoJsonFeatureGeocoder } from '$lib/shared/types'
  import type GeocoderProvider from '$lib/shared/geocoder/provider'

  export let providers: GeocoderProvider[]

  let geocoderPopover: HTMLElement | null
  onMount(() => {
    geocoderPopover = document.getElementById('geocoder-popover')
  })

  let searchTerm = ''
  let providerFeatures: GeoJsonFeatureGeocoder[][] = [[]]
  let features: GeoJsonFeatureGeocoder[] = []
  let selectedFeature: GeoJsonFeatureGeocoder | undefined
  let softFocusIndex = -1
  let softFocusedElement: HTMLButtonElement | undefined

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

  $: throttledGetFeatures(searchTerm)

  function getFeatures(text: string): void {
    for (let [index, provider] of providers.entries()) {
      provider.getFeatures(text).then((features) => {
        providerFeatures[index] = features
      })
    }
  }

  $: features = providerFeatures.flat(1).slice(0, 5)

  function handleClick(feature: GeoJsonFeatureGeocoder): void {
    selectedFeature = feature
    geocoderPopover?.hidePopover()
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

<button
  popovertarget="geocoder-popover"
  class="w-9 h-9 p-1.5 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
>
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
            {#if feature.properties.alt}
              <span class="alt">{feature.properties.alt}</span>
            {/if}
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

          & .alt {
            color: grey;
            font-style: italic;
          }

          & .alt::before {
            content: '〜';
            margin-left: 0.2rem;
            margin-right: 0.5rem;
          }
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
