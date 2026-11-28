<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon'
  import CaretUpIcon from 'phosphor-svelte/lib/CaretUpIcon'

  let {
    direction,
    ref = $bindable(null),
    class: className,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    direction: 'up' | 'down'
    ref?: HTMLDivElement | null
  } = $props()

  let visible = $state(false)

  function watchScroll(node: HTMLDivElement) {
    const content = node.closest<HTMLElement>('[data-slot="select-content"]')
    if (!content) return
    const step = direction === 'up' ? -8 : 8
    let frame = 0
    function update() {
      if (!content) return
      visible =
        direction === 'up'
          ? content.scrollTop > 1
          : content.scrollTop + content.clientHeight < content.scrollHeight - 1
    }
    function stop() {
      cancelAnimationFrame(frame)
    }
    function scroll() {
      if (!content || !visible) return
      content.scrollTop += step
      frame = requestAnimationFrame(scroll)
    }
    const observer = new ResizeObserver(update)
    observer.observe(content)
    const viewport = content.querySelector('.allmaps-select-viewport')
    if (viewport) observer.observe(viewport)
    content.addEventListener('scroll', update)
    node.addEventListener('pointerenter', scroll)
    node.addEventListener('pointerleave', stop)
    return () => {
      stop()
      observer.disconnect()
      content.removeEventListener('scroll', update)
      node.removeEventListener('pointerenter', scroll)
      node.removeEventListener('pointerleave', stop)
    }
  }
</script>

<div
  {...rest}
  bind:this={ref}
  {@attach watchScroll}
  aria-hidden="true"
  class={[
    'sticky z-10 h-0',
    direction === 'up' ? 'top-0' : 'bottom-0',
    className
  ]}
  data-slot={'select-scroll-' + direction + '-button'}
>
  {#if visible}
    <span
      class={[
        'absolute inset-x-0 flex justify-center bg-popover',
        direction === 'up' ? 'top-0' : 'bottom-0'
      ]}
    >
      {#if direction === 'up'}<CaretUpIcon size={16} />{:else}<CaretDownIcon
          size={16}
        />{/if}
    </span>
  {/if}
</div>
