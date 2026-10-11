<script lang="ts">
  import { Combobox } from 'bits-ui'
  import {
    MagnifyingGlass as MagnifyingGlassIcon,
    ArrowSquareOut as ArrowSquareOutIcon
  } from 'phosphor-svelte'

  import { debounce } from 'lodash-es'
  import { onDestroy, untrack } from 'svelte'

  import type {
    GeocoderGeoJsonFeature,
    GeocoderGeoJsonFeaturesByProvider
  } from '$lib/shared/geocoder/types.js'
  import type { GeocoderProvider } from '$lib/shared/geocoder/provider.js'

  import LoadingSmall from '$lib/components/LoadingSmall.svelte'

  const FEATURES_PER_PROVIDER = 5

  type InputEvent = Event & {
    currentTarget: EventTarget & HTMLInputElement
  }

  type Props = {
    open?: boolean
    providers: GeocoderProvider[]
    onselect?: (event: CustomEvent<GeocoderGeoJsonFeature>) => void
    showProviderUrls?: boolean
    inputValue?: string
    portalTarget?: HTMLElement
    placeholder?: string
  }

  let {
    providers,
    onselect,
    showProviderUrls = false,
    open = $bindable(false),
    inputValue = $bindable(''),
    portalTarget,
    placeholder = 'Search location'
  }: Props = $props()

  let value = $state('')
  let fetching = $state(false)
  let fetchFailed = $state(false)
  let request = 0
  let customAnchor = $state.raw<HTMLElement>(null!)

  let featuresByProvider = $state<GeocoderGeoJsonFeaturesByProvider>([])
  let features = $derived(
    Object.values(featuresByProvider)
      .map((features) => features.slice(0, FEATURES_PER_PROVIDER))
      .flat(1)
  )

  let items = $derived(
    features.map((feature) => ({
      value: feature.properties.id,
      label: feature.properties.data.label,
      feature
    }))
  )

  let feature = $derived(
    value && features.length
      ? features.find((feature) => feature.properties.id === value)
      : undefined
  )

  const THROTTLE_WAIT_MS = 500
  const THROTTLE_OPTIONS = {
    // leading: true,
    // trailing: true
  }

  const debouncedFetchFeatures = debounce(
    fetchFeatures,
    THROTTLE_WAIT_MS,
    THROTTLE_OPTIONS
  )

  async function fetchFeatures(input: string) {
    const current = ++request
    fetching = true
    const result = await Promise.allSettled(
      providers.map((provider) => provider.fetchFeatures(input))
    )
    if (current !== request) return
    featuresByProvider = result.map((result) =>
      result.status === 'fulfilled' ? result.value : []
    )
    fetchFailed = result.some((result) => result.status === 'rejected')
    fetching = false
  }

  function handleInput(event: InputEvent) {
    request++
    value = ''
    fetching = true
    fetchFailed = false
    const text = event?.currentTarget.value
    debouncedFetchFeatures(text)
  }

  function handleKeyDown(
    event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }
  ) {
    if (event.key !== 'Enter' || event.isComposing) return
    const highlighted = event.currentTarget.getAttribute(
      'aria-activedescendant'
    )
    if (
      open &&
      !fetching &&
      highlighted &&
      event.currentTarget.ownerDocument.getElementById(highlighted)
    )
      return

    // Bits closes on Enter even without a result to select. Keep the list open
    // while searching, and skip the remaining debounce delay when submitting.
    event.preventDefault()
    open = true
    void debouncedFetchFeatures.flush()
  }

  onDestroy(() => {
    request++
    debouncedFetchFeatures.cancel()
  })

  $effect(() => {
    if (feature) {
      const selected = $state.snapshot(feature)
      untrack(() => onselect?.(new CustomEvent('select', { detail: selected })))
    }
  })
</script>

<Combobox.Root type="single" loop bind:open bind:value {items}>
  <div
    bind:this={customAnchor}
    class="px-2 w-full flex flex-row items-center gap-2
      focus-within:ring-2 focus-within:ring-pink
    bg-white border border-gray-200 rounded-lg"
  >
    <MagnifyingGlassIcon class="size-6" />
    <Combobox.Input
      class="h-9 text-sm truncate rounded-lg
        focus:outline-none w-full bg-transparent"
      {placeholder}
      aria-label={placeholder}
      spellcheck="false"
      autocomplete="off"
      type="search"
      autofocus
      oninput={handleInput}
      onkeydown={handleKeyDown}
    >
      {#snippet child({ props })}
        <input {...props} bind:value={inputValue} />
      {/snippet}
    </Combobox.Input>
  </div>

  <Combobox.Portal to={portalTarget}>
    <Combobox.Content
      class="border border-gray-100 bg-white shadow-lg p-1
      outline-hidden z-50 max-h-[var(--bits-combobox-content-available-height)] w-[var(--bits-combobox-anchor-width)]
      min-w-[var(--bits-combobox-anchor-width)] select-none rounded-lg data-[side=bottom]:translate-y-1
      data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
      sideOffset={1}
      {customAnchor}
    >
      <Combobox.Viewport>
        {#if fetching}
          <div class="p-2 text-sm text-gray flex items-center gap-2">
            <LoadingSmall />
            <span class="text-sm text-gray-600">Loading</span>
          </div>
        {:else}
          {#each features as feature (feature.properties.id)}
            <Combobox.Item
              class="flex items-center justify-between h-10 w-full select-none rounded-md p-1 text-sm
            cursor-pointer truncate outline-none data-[highlighted]:bg-gray-100"
              value={feature.properties.id}
              label={feature.properties.data.label}
            >
              <div>
                {feature.properties.data.label}
                {#if feature.properties.data.alt}
                  <span
                    class="text-gray before:content-['〜'] before:ml-1 before:mr-1"
                    >{feature.properties.data.alt}</span
                  >
                {/if}
              </div>
              {#if showProviderUrls && feature.properties.data.url}
                <a href={feature.properties.data.url} class="p-2 text-gray-500"
                  ><ArrowSquareOutIcon class="size-4" /></a
                >
              {/if}
            </Combobox.Item>
          {:else}
            <span class="flex items-center p-2 text-sm text-gray">
              {#if fetchFailed}
                Place search is unavailable. Check the connection and API key.
              {:else if inputValue}
                No results found
              {:else}
                Start typing to search locations
              {/if}
            </span>
          {/each}
        {/if}
      </Combobox.Viewport>
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
