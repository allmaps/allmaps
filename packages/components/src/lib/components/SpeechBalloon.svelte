<script lang="ts">
  import { green, black } from '@allmaps/tailwind'

  import type { Snippet } from 'svelte'

  type Props = {
    backgroundColor?: string
    textColor?: string
    children?: Snippet
  }

  let { backgroundColor = green, textColor = black, children }: Props = $props()
</script>

<div
  style="--background-color: {backgroundColor}"
  style:background-color={backgroundColor}
  style:color={textColor}
  class="speech-balloon
    p-4 relative
    pointer-events-auto
    w-full
    rounded-md
    after:content-['']
    after:absolute
    after:bottom-0
    after:right-28
    after:w-0
    after:h-0
    after:border-[1.2em]
    after:border-solid
    after:border-transparent
    after:border-b-0
    after:border-r-0
    after:ml-[-0.5em]
    after:mb-[-1.19em]"
>
  {@render children?.()}
</div>

<style scoped>
  .speech-balloon:after {
    border-top-color: var(--background-color);
    color: rgba(255, 255, 255, 0);
  }
</style>
