<script lang="ts">
  import { Tooltip } from 'bits-ui'

  let {
    mapOrImage = $bindable('map'),
    disabled = $bindable(false)
  }: {
    mapOrImage: 'map' | 'image'
    disabled: boolean
  } = $props()
</script>

<Tooltip.Provider disabled={!disabled}>
  <Tooltip.Root delayDuration={100} disableCloseOnTriggerClick>
    <Tooltip.Trigger>
      <div class="inline-flex pointer-events-auto" role="group">
        <button
          onclick={() => {
            mapOrImage = 'map'
          }}
          {disabled}
          class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:cursor-pointer focus:z-10 disabled:bg-white"
          class:text-gray-300={mapOrImage !== 'map' && disabled}
          class:text-gray-900={mapOrImage !== 'map' && !disabled}
          class:text-pink-300={mapOrImage === 'map' && disabled}
          class:text-pink-500={mapOrImage === 'map' && !disabled}
        >
          Map
        </button>
        <button
          onclick={() => {
            mapOrImage = 'image'
          }}
          {disabled}
          class="px-4 py-2 text-sm font-medium bg-white border-t border-b border-r border-gray-200 rounded-r-lg hover:bg-gray-100 hover:cursor-pointer focus:z-10 disabled:bg-white"
          class:text-gray-300={mapOrImage !== 'image' && disabled}
          class:text-gray-900={mapOrImage !== 'image' && !disabled}
          class:text-pink-300={mapOrImage === 'image' && disabled}
          class:text-pink-500={mapOrImage === 'image' && !disabled}
        >
          Image
        </button>
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content sideOffset={8} collisionPadding={8}>
      <div
        class="
        outline-hidden
        flex items-center justify-center
        z-0
        px-4 py-2
        text-sm
        bg-white border border-gray-200 rounded-lg shadow-xl
        "
      >
        Select a map first!
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
