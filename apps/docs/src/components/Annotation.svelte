<script lang="ts">
  import { onMount } from 'svelte'
  export let placeholder = 0
  export let highlight: number[]
  let annotation = null
  onMount(() => {
    if (placeholder > 0) annotation.style.height = `${placeholder}px`
    console.log('in onmount for annotation.')
    console.log(highlight)
    highlight.forEach((line) => {
      annotation.classList.add(`hightlight-${line}`)
      console.log('class list add a class')
    })
  })
</script>

<div
  class={`${placeholder ? 'bg-white opacity-0' : 'bg-pink-200 border-pink-500 border-2 '} annotation min-h-28 saturate-50 brightness-125 p-2 rounded-md `}
  bind:this={annotation}
>
  <slot></slot>
</div>

<style>
  .focused {
  }
</style>
