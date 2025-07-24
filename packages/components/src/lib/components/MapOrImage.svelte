<script lang="ts">
  // import { Tooltip } from 'bits-ui'
  import * as Tabs from '$lib/components/ui/tabs/index.js'
  import * as Tooltip from '$lib/components/ui/tooltip/index.js'

  let {
    mapOrImage = $bindable('map'),
    disabled = $bindable(false)
  }: {
    mapOrImage: 'map' | 'image'
    disabled: boolean
  } = $props()
</script>

<Tooltip.Provider disabled={!disabled}>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Tabs.Root bind:value={mapOrImage} {disabled}>
        <Tabs.List>
          <Tabs.Trigger value="map">Map</Tabs.Trigger>
          <Tabs.Trigger value="image">Image</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>Select a map first</p>
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
