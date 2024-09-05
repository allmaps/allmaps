<script lang="ts">
  import { onMount } from 'svelte'
  import Annotation from './Annotation.svelte'
  import StyledCodeBlock from './StyledCodeBlock.svelte'

  export let includePlaceholder = false
  export let code: string
  let codeBlock: HTMLElement | null = null

  let annotationParent: Element | null = null

  // This might not be 0 depending on if the page loaded in pre-scrolled
  let currentAnnotationIdx: number = 0
  let inCodeBlock = false
  let annotations: Element[] = []
  let hasHighlightedFirstTime = false

  // Height for an invisible annotation that gets added to the end
  let placeholderHeight = 100

  // This buffer value needs to change if the width is smaller (because another toolbar gets added.)
  const bufferTop = 100
  let originalPosition = 0
  let screenHeight = 0

  // Remove the highlight-line class off all lines
  const clearHighlightedLines = () => {
    const clearLines = codeBlock?.getElementsByClassName('highlight-line')
    if (!clearLines) return
    const numItems = clearLines.length
    if (numItems > 0) {
      for (let i = 0; i < numItems; i++) {
        const element = clearLines[numItems - 1 - i]
        element.classList.remove('highlight-line')
      }
    }
  }

  // Add the highlight-line class to all lines included for the given annotation
  const highlightAnnotationLines = (annotationIdx: number) => {
    if (!annotations) return
    const newAnnotation = annotations[annotationIdx]
    const lines = codeBlock?.getElementsByClassName('line')
    if (lines) {
      for (let c of newAnnotation.classList) {
        if (c.startsWith('highlight-')) {
          const lineNum = parseInt(c.slice('highlight-'.length))
          lines[lineNum - 1].classList.add('highlight-line')
        }
      }
    }
  }

  // Handles if the code block is being seen right now, which annotation is in focus, and highlighting the appropriate lines
  const handleScroll = () => {
    let changedIdx = false

    const currentAnnotationRect =
      annotations[currentAnnotationIdx]?.getBoundingClientRect()

    // Figure out if we're scrolling within the code block, which will adjust where it sits on the screen
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
            bufferTop) ||
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
        currentAnnotationRect.top + currentAnnotationRect.height < bufferTop
      ) {
        inCodeBlock = false
      }
    }

    // Position the code block correctly. We do this here instead of in Tailwind because it's nice to use bufferTop
    if (codeBlock && inCodeBlock) {
      codeBlock.style.top = `${bufferTop}px`
    } else if (codeBlock && !inCodeBlock) {
      codeBlock.style.top = `8px`
    }

    // Check if previous annotation has scrolled into view
    if (currentAnnotationIdx - 1 >= 0) {
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

    // Check if next annotation has scrolled to the top yet
    if (currentAnnotationIdx + 1 < annotations.length && !changedIdx) {
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

    // This highlights the first annotation's lines after making sure everything has been loaded.
    if (
      currentAnnotationIdx == 0 &&
      codeBlock &&
      codeBlock.getElementsByClassName('line').length > 0
    ) {
      highlightAnnotationLines(currentAnnotationIdx)
      hasHighlightedFirstTime = true
    }

    // If the annotation has changed, update which code lines are being highlighted
    if (changedIdx) {
      clearHighlightedLines()
      highlightAnnotationLines(currentAnnotationIdx)
    }
  }

  $: {
    // If the last annotation is shorter than a page height, we need to add a placeholder block thats the screenheight - lastannotation height
    if (annotations && screenHeight)
      placeholderHeight =
        screenHeight -
        annotations[annotations.length - 1].getBoundingClientRect().height
  }

  onMount(() => {
    if (annotationParent) {
      annotations = Array.prototype.slice.call(
        annotationParent.getElementsByClassName('annotation'),
        0,
        -1
      )
      // Highlight the first annotation
      annotations[0].style.filter =
        'saturate(1) brightness(1) drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1))'
      originalPosition =
        annotationParent.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top
    }
  })
</script>

<div class="flex flex-row not-content relative pt-8">
  <div class="flex flex-col gap-2 z-20 w-4/12" bind:this={annotationParent}>
    <slot></slot>
    {#if includePlaceholder}
      <Annotation placeholder={placeholderHeight} highlight={[]}></Annotation>
    {:else}
      <Annotation placeholder={10} />
    {/if}
  </div>
  <div
    class={` bg-[#2e3440ff] text-white font-mono h-[calc(90vh-var(--sl-nav-height))] z-10  ${inCodeBlock ? 'sticky w-8/12 pl-1 top-4' : 'absolute w-9/12 pl-16 top-4'}  p-2 right-0 `}
    bind:this={codeBlock}
  >
    {#if code}
      <StyledCodeBlock {code} />
    {/if}
  </div>
</div>

<svelte:window
  on:scroll={() => handleScroll()}
  bind:innerHeight={screenHeight}
/>

<style>
  :global(.highlight-line) {
    background-color: #321125;
  }
  :global(code) {
    counter-reset: step;
    counter-increment: step 0;
  }

  :global(code .line::before) {
    content: counter(step);
    counter-increment: step;
    width: 1rem;
    margin-right: 1.5rem;
    display: inline-block;
    text-align: right;
    color: rgba(115, 138, 148, 0.4);
  }
</style>
