<script lang="ts">
  import * as DropdownMenu from '../../src/lib/dropdown-menu.js'

  let { checked, indeterminate }: { checked: boolean; indeterminate: boolean } =
    $props()
</script>

<DropdownMenu.Root open>
  <DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.CheckboxItem {checked} {indeterminate}>
      Map layers
    </DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu.Root>
