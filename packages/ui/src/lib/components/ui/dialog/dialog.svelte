<script lang="ts">
  import { Dialog } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'

  let { open = $bindable(false), ...restProps }: ComponentProps<typeof Dialog> =
    $props()
</script>

<Dialog bind:open {...restProps} />
