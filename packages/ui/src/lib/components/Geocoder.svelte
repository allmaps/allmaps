<script lang="ts">
  import { Combobox } from 'bits-ui'

  import { throttle } from 'lodash-es'
  import { createEventDispatcher } from 'svelte'
  import searchIcon from '$lib/shared/images/search.svg'

  import type { GeocoderGeoJsonFeature } from '$lib/shared/types'
  import type { GeocoderProvider } from '$lib/shared/geocoder/provider'

  type Item<T> = {
    value: T
    label?: string
  }

  let touchedInput = false

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
          .slice(0, 5)
          .map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              provider: provider.name
            }
          }))
      })
    }
  }

  $: features = featuresByProviderIndex.flat(1)
  $: featuresItems = features.map((feature) => ({
    value: feature,
    label: feature.properties.label
  }))

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
  <div class="relative w-full">
    <img
      alt="Search Icon"
      src={searchIcon}
      class="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
    />
    <Combobox.Input
      class="pl-10 pr-2 h-9 text-sm bg-white border border-gray-200 rounded-lg truncate
        focus:z-10 focus:outline-none
        focus:ring-2 focus:ring-pink w-full"
      placeholder="Search location"
      aria-label="Search location"
      spellcheck="false"
      autocomplete="off"
      type="search"
      autofocus
    />
  </div>

  {#if inputValue !== ''}
    <Combobox.Content
      class="w-full rounded-xl border border-gray-200 bg-white px-1 py-2 shadow-md outline-none"
      sideOffset={8}
    >
      {#each features as feature}
        <Combobox.Item
          class="flex items-center justify-between h-10 w-full select-none rounded px-2 py-2 text-sm capitalize truncate outline-none data-[highlighted]:bg-gray-100"
          value={feature}
          label={feature.properties.label}
        >
          <div>
            {feature.properties.label}
            {#if feature.properties.alt}
              <span
                class="text-gray before:content-['〜'] before:ml-1 before:mr-1"
                >{feature.properties.alt}</span
              >
            {/if}
          </div>
          <div>
            {#if feature.properties.provider === 'World Historical Gazetteer' && 'index_id' in feature.properties}
              <a
                href="https://whgazetteer.org/places/{feature.properties
                  .index_id}/portal/"
                class="text-xs text-white uppercase bg-gray-200 px-2 py-0.5 rounded-lg"
                >whg</a
              >
            {/if}
          </div>
        </Combobox.Item>
      {:else}
        <span
          class="flex items-center h-10 px-2 py-2 text-sm text-muted-foreground text-gray"
        >
          No results found
        </span>
      {/each}
    </Combobox.Content>
  {/if}
</Combobox.Root>
