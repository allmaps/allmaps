<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    light = false,
    arrow = '→',
    class: className = ''
  }: {
    children: Snippet
    light?: boolean
    arrow?: '→' | '↓'
    class?: string
  } = $props()
</script>

<span class={['inline-flex items-baseline gap-3', className]}>
  <span
    class={[
      'underline group-hover:decoration-current group-focus-visible:decoration-current',
      light ? 'decoration-white/40' : 'decoration-black/20'
    ]}
  >
    {@render children()}
  </span>
  <span aria-hidden="true">{arrow}</span>
</span>
