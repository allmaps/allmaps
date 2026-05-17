<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    transparent?: boolean
    roundedFull?: boolean
    direction?: 'row' | 'column'
  }

  const {
    children,
    transparent = false,
    roundedFull = false,
    direction = 'row'
  }: Props = $props()
</script>

<div
  class={[
    'p-1 pointer-events-auto flex gap-2 overflow-clip',
    direction === 'row' ? 'flex-row' : 'flex-col',
    !transparent && 'bg-white shadow-lg border-gray-100 border-[0.5px]',
    roundedFull ? 'rounded-full' : 'rounded-lg'
  ]}
>
  {@render children()}
</div>
