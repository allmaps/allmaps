<script lang="ts">
  import { MenuSub } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    open = $bindable(false),
    ...restProps
  }: ComponentProps<typeof MenuSub> = $props()
</script>

<MenuSub bind:open {...restProps} />
