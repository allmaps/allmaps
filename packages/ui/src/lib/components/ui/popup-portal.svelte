<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    to = 'body',
    disabled = false,
    children
  }: {
    to?: string | Element | DocumentFragment
    disabled?: boolean
    children?: Snippet
  } = $props()

  function moveToTarget(host: HTMLDivElement) {
    const target = typeof to === 'string' ? document.querySelector(to) : to
    if (!target) return
    const marker = document.createComment('portal')
    host.before(marker)
    target.appendChild(host)
    return () => marker.replaceWith(host)
  }
</script>

{#if disabled}
  {@render children?.()}
{:else}
  <div class="contents" {@attach moveToTarget}>{@render children?.()}</div>
{/if}
