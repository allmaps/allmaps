<script lang="ts">
  import ScrollButton from './scroll-button.svelte'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    ...rest
  }: Omit<ComponentProps<typeof ScrollButton>, 'direction'> = $props()
</script>

<ScrollButton direction="up" bind:ref {...rest} />
