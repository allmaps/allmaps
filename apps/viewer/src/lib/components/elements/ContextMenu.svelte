<script lang="ts">

  import type {
    ClientRectObject,
    VirtualElement
  } from 'svelte-floating-ui/core'
  import { offset, flip, shift } from "svelte-floating-ui/dom";
  import { createFloatingActions } from 'svelte-floating-ui'

  export let event: MouseEvent

  const [floatingRef, floatingContent] = createFloatingActions({
    // strategy: 'fixed',
    // strategy: "absolute",
    placement: "bottom-start",
    middleware: [
      // offset(6),
      flip(),
      shift(),
    ],
  })

  const virtualElement: VirtualElement = {
    getBoundingClientRect: () => ({
      x: event.clientX,
      y: event.clientY,
      top: event.clientY,
      left: event.clientX,
      bottom: event.clientY,
      right: event.clientX,
      width: 0,
      height: 0
    })
  }

  floatingRef(virtualElement)
</script>

<div
  class="absolute max-content bg-white z-10 p-1 rounded shadow-lg border-gray-50 text-sm font-thin"
  use:floatingContent
>
  <slot />
</div>
