<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = { value: string; rows?: number } & HTMLTextareaAttributes

  let { value = $bindable(), rows = 10, ...restProps }: Props = $props()
</script>

<div
  class="relative overflow-hidden rounded-md
  bg-[:#2e3440ff] text-[#d8dee9ff] inset-shadow-2xs"
>
  <textarea
    {rows}
    spellcheck="false"
    class="h-auto w-full p-2 align-top font-mono"
    bind:value
    {...restProps}
  ></textarea>
</div>
