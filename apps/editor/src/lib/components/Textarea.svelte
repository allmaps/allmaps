<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = { value: string; rows?: number } & HTMLTextareaAttributes

  let { value = $bindable(), rows = 10, ...restProps }: Props = $props()
</script>

<div
  class="relative rounded-md inset-shadow-2xs
  bg-[:#2e3440ff] text-[#d8dee9ff] overflow-hidden"
>
  <textarea
    {rows}
    spellcheck="false"
    class="w-full h-auto p-2 font-mono align-top"
    bind:value
    {...restProps}
  ></textarea>
</div>
