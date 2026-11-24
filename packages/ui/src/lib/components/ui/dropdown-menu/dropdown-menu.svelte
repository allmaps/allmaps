<script lang="ts">
  import { Menu } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let { open = $bindable(false), ...restProps }: ComponentProps<typeof Menu> =
    $props()
</script>

<Menu bind:open {...restProps} />
