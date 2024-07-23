<script lang="ts">
  import { onMount } from 'svelte'
  export let placeholder = 0
  export let highlight: number[] = []
  let annotation: HTMLElement

  // Logic needs to be added to include the color of the annotation
  // The color can be piped to the code highlighter in the same way the
  // line numbers are

  $: {
    if (annotation && placeholder > 0)
      annotation.style.height = `${placeholder}px`
  }

  const addHighlightClasses = () => {
    return highlight
      ?.map((lineNumber) => {
        return `highlight-${lineNumber}`
      })
      .join(' ')
  }
</script>

<div
  class={`${placeholder ? 'bg-white opacity-0' : 'bg-pink-200 border-pink-500 border-2 '} annotation min-h-28 saturate-50 brightness-125 p-2 rounded-md ${addHighlightClasses()}`}
  bind:this={annotation}
>
  <slot></slot>
</div>
