<script lang="ts">
  import * as Select from '../../src/lib/select.js'

  const items = [
    { value: 'map', label: 'Map layer' },
    { value: 'image', label: 'Source image' }
  ]
  let selected = $state(['image'])
</script>

<Select.Root type="multiple" {items} bind:value={selected} name="layers">
  <Select.Trigger aria-label="Visible layers"><Select.Value /></Select.Trigger>
  <Select.Content>
    {#each items as item (item.value)}
      <Select.Item {...item} />
    {/each}
  </Select.Content>
</Select.Root>
<output>{selected.join(',')}</output>
