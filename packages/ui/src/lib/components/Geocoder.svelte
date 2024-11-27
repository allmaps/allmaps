<script lang="ts">
  import { Combobox, Dialog } from 'bits-ui'

  let touchedInput = false
  let dialogOpen = false

  import { throttle } from 'lodash-es'
  import { onMount, createEventDispatcher } from 'svelte'
  import searchIcon from '$lib/shared/images/search.svg'

  import type { GeocoderGeoJsonFeature } from '$lib/shared/types'
  import type GeocoderProvider from '$lib/shared/geocoder/provider'

  type Selected<T> = { value: T; label?: string }

  export let providers: GeocoderProvider[]

  let geocoderPopover: HTMLElement | null
  onMount(() => {
    geocoderPopover = document.getElementById('geocoder-popover')
  })

  let inputValue = ''
  let providerFeatures: GeocoderGeoJsonFeature[][] = [[]]
  let features: GeocoderGeoJsonFeature[] = []
  let selectedFeature: GeocoderGeoJsonFeature | undefined
  let selectedFeatures: Selected<GeocoderGeoJsonFeature>[]
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

  $: throttledGetFeatures(inputValue)

  function getFeatures(text: string): void {
    for (let [index, provider] of providers.entries()) {
      provider.getFeatures(text).then((features) => {
        providerFeatures[index] = features
      })
    }
  }

  $: features = providerFeatures.flat(1).slice(0, 5)
  $: selectedFeatures = features.map((feature) => {
    return { value: feature, label: feature.properties.label }
  })

  function handleClick(feature?: GeocoderGeoJsonFeature): void {
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

<button on:click={() => (dialogOpen = true)}>Open Dialog</button>
<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Trigger />
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50" />
    <Dialog.Content
      class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded-card-lg border bg-background p-5 shadow-popover outline-none sm:max-w-[490px] md:w-full bg-white"
    >
      <Dialog.Description class="text-sm text-foreground-alt">
        <Combobox.Root
          bind:inputValue
          bind:touchedInput
          loop
          onSelectedChange={(item) => {
            handleClick(item?.value)
          }}
          items={selectedFeatures}
        >
          <div class="relative">
            <img
              alt="Search Icon"
              src={searchIcon}
              class="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Combobox.Input
              class="
              px-10 h-9 text-sm bg-white border border-gray-200 rounded-lg truncate
              focus:z-10 focus:outline-none
              focus:ring-2 focus:ring-blue-700
              focus-within:ring-1 focus-within:ring-pink-500
              "
              placeholder="Search Location"
              aria-label="Search Location"
              autofocus
            />
          </div>

          <Combobox.Content
            class="w-full rounded-xl border border-muted bg-white px-1 py-3 shadow-popover outline-none"
            sideOffset={8}
          >
            {#each features as feature}
              <Combobox.Item
                class="
                flex h-10 w-full select-none items-center rounded-button py-3 pl-5 pr-1.5 text-sm capitalize outline-none transition-all duration-75 data-[highlighted]:bg-gray-100
                truncate"
                value={feature}
                label={feature.properties.label}
              >
                {feature.properties.label}
                {#if feature.properties.alt}
                  <span class="alt">{feature.properties.alt}</span>
                {/if}
              </Combobox.Item>
            {:else}
              <span class="block px-5 py-2 text-sm text-muted-foreground">
                No results found
              </span>
            {/each}
          </Combobox.Content>
        </Combobox.Root>
      </Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<div popover="auto" id="geocoder-popover">
  <img alt="Search Icon" src={searchIcon} />
  <!-- svelte-ignore a11y-autofocus -->
  <input
    bind:value={inputValue}
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
<!--
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
</style> -->
