<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = { value: string; rows?: number } & HTMLTextareaAttributes

  let { value = $bindable(), rows = 10, ...restProps }: Props = $props()
</script>

<textarea
  name="input"
  {rows}
  spellcheck="false"
  class="h-auto w-full p-2 align-top font-mono rounded-md inset-shadow-2xs
    outline-1 outline-gray focus:outline-2 focus:outline-pink transition-all"
  bind:value
  {...restProps}
></textarea>
