<script lang="ts">
  import { onMount } from 'svelte'
  import Annotation from './Annotation.svelte'

  let annotationParent: Element | null = null
  let codeBlock: Element | null = null
  let y = 0
  let screenHeight = 0
  let inCodeBlock = false
  let currentAnnotationIdx = 0
  let annotations = []
  let placeholderHeight = 100
  const bufferTop = 100
  let originalPosition = 0

  $: {
    let changedIdx = false

    const currentAnnotationRect =
      annotations[currentAnnotationIdx]?.getBoundingClientRect()

    if (!inCodeBlock) {
      if (
        currentAnnotationIdx == 0 &&
        currentAnnotationRect &&
        currentAnnotationRect.top <= bufferTop
      ) {
        inCodeBlock = true
      }
      if (
        (currentAnnotationIdx == annotations.length - 1 &&
          currentAnnotationRect.top + currentAnnotationRect.height >=
            screenHeight) ||
        currentAnnotationIdx == annotations.length - 2
      ) {
        inCodeBlock = true
      }
    }
    if (inCodeBlock) {
      if (currentAnnotationIdx == 0 && currentAnnotationRect.top > bufferTop) {
        inCodeBlock = false
      }
      if (
        currentAnnotationIdx == annotations.length - 1 &&
        currentAnnotationRect &&
        currentAnnotationRect.top + currentAnnotationRect.height < screenHeight
      ) {
        inCodeBlock = false
      }
    }

    // Code block position shennanigans
    if (codeBlock && inCodeBlock) {
      codeBlock.style.top = `${y - originalPosition + bufferTop}px`
    }

    // Annotation highlight shennanigans
    if (currentAnnotationIdx - 1 >= 0) {
      // Check if previous element has scrolled into view
      const prevRect =
        annotations[currentAnnotationIdx - 1].getBoundingClientRect()
      if (prevRect.top + prevRect.height >= bufferTop) {
        annotations[currentAnnotationIdx].classList.remove('focused')
        currentAnnotationIdx -= 1
        changedIdx = true

        annotations[currentAnnotationIdx].classList.add('focused')

        // Unhighlight if scrolling upwards
        annotations[currentAnnotationIdx + 1].style.filter =
          'saturate(.5) brightness(1.25) drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))'
      }
    }

    if (currentAnnotationIdx + 1 < annotations.length && !changedIdx) {
      // Check if next element has scrolled to the top yet
      const nextRect =
        annotations[currentAnnotationIdx + 1].getBoundingClientRect()
      if (nextRect.top <= bufferTop) {
        annotations[currentAnnotationIdx].classList.remove('focused')
        currentAnnotationIdx += 1

        annotations[currentAnnotationIdx].classList.add('focused')
        annotations[currentAnnotationIdx].style.filter =
          'saturate(1) brightness(1) drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))'
        changedIdx = true
      }
    }
  }

  onMount(() => {
    annotations = Array.prototype.slice.call(
      annotationParent.getElementsByClassName('annotation'),
      0,
      -1
    )
    annotations[0].style.filter =
      'saturate(1) brightness(1) drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))'
    originalPosition =
      annotationParent.getBoundingClientRect().top -
      document.body.getBoundingClientRect().top

    // If the last annotation is shorter than a page height, we need to add a placeholder block thats the screenheight - lastannotation height
    placeholderHeight =
      screenHeight -
      annotations[annotations.length - 1].getBoundingClientRect().height
  })
</script>

<div class="flex flex-row not-content relative pt-4">
  <div class="flex flex-col gap-2 z-20 w-4/12" bind:this={annotationParent}>
    <slot></slot>
    <Annotation placeholder={1000}></Annotation>
  </div>
  <div
    class={` bg-darkblue-800 text-white font-mono h-[calc(100vh-var(--sl-nav-height))] z-10 w-9/12 ${inCodeBlock ? 'absolute' : 'absolute'}  p-2 right-0 pl-12`}
    bind:this={codeBlock}
  >
    <slot name="code"></slot>
  </div>
</div>

<svelte:window bind:scrollY={y} bind:innerHeight={screenHeight} />
