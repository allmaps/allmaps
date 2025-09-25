<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    color: string
    opacity?: number
  }

  let { children, color, opacity = 0.8 }: Props = $props()

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="10" fill="${color}" fill-opacity="${opacity * 100}%" />
    </svg>`

  const backgroundImage = `url(data:image/svg+xml;base64,${btoa(svg)})`
</script>

<div
  id="dot-pattern"
  class="w-full h-full"
  style="--background-image: {backgroundImage}"
>
  {@render children()}
</div>

<style scoped>
  #dot-pattern {
    background-image: var(--background-image);
    background-size: 20px 20px;
  }
</style>
