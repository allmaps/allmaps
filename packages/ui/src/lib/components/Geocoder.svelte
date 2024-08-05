<script lang="ts">
  import { Combobox } from 'bits-ui'

  let touchedInput = false

  import { throttle } from 'lodash-es'
  import { createEventDispatcher } from 'svelte'
  import searchIcon from '$lib/shared/images/search.svg'

  import type { GeocoderGeoJsonFeature } from '$lib/shared/types'
  import type GeocoderProvider from '$lib/shared/geocoder/provider'

  type Item<T> = { value: T; label?: string }

  export let providers: GeocoderProvider[]

  let inputValue = ''
  let featuresByProviderIndex: GeocoderGeoJsonFeature[][] = [[]]
  let features: GeocoderGeoJsonFeature[] = []
  let featuresItems: Item<GeocoderGeoJsonFeature>[]
  let selectedFeature: GeocoderGeoJsonFeature | undefined

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
        featuresByProviderIndex[index] = features
      })
    }
  }

  $: features = featuresByProviderIndex.flat(1).slice(0, 5)
  $: featuresItems = features.map((feature) => {
    return { value: feature, label: feature.properties.label }
  })

  const dispatch = createEventDispatcher()

  $: dispatch('features', features)
  $: dispatch('select', selectedFeature)
</script>

<Combobox.Root
  bind:inputValue
  bind:touchedInput
  loop
  onSelectedChange={(itemFeature) => {
    selectedFeature = itemFeature?.value
  }}
  items={featuresItems}
>
  <div class="relative">
    <img
      alt="Search Icon"
      src={searchIcon}
      class="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
    />
    <Combobox.Input
      class="
              pl-10 pr-2 h-9 text-sm bg-white border border-gray-200 rounded-lg truncate
              focus:z-10 focus:outline-none
              focus:ring-2 focus:ring-blue-700
              "
      placeholder="Search Location"
      aria-label="Search Location"
      spellcheck="false"
      autocomplete="off"
      type="search"
      autofocus
    />
  </div>

  <Combobox.Content
    class="w-full rounded-xl border border-gray-200 bg-white px-1 py-2 shadow-md outline-none"
    sideOffset={8}
  >
    {#each features as feature}
      <Combobox.Item
        class="flex items-center h-10 w-full select-none rounded px-2 py-2 text-sm capitalize truncate outline-none data-[highlighted]:bg-gray-100"
        value={feature}
        label={feature.properties.label}
      >
        {feature.properties.label}
        {#if feature.properties.alt}
          <span class="text-gray before:content-['〜'] before:ml-1 before:mr-1"
            >{feature.properties.alt}</span
          >
        {/if}
      </Combobox.Item>
    {:else}
      <span
        class="flex items-center h-10 px-2 py-2 text-sm text-muted-foreground text-gray"
      >
        No results found
      </span>
    {/each}
  </Combobox.Content>
</Combobox.Root>
