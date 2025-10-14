<script lang="ts">
  import {
    CheckCircle as CheckCircleIcon,
    WarningCircle as WarningCircleIcon
  } from 'phosphor-svelte'

  import type { Message } from '$lib/types/shared.js'

  type Props = { message: Message }

  let { message }: Props = $props()
</script>

{#if message.type === 'success'}
  <div
    class="flex items-center gap-2 p-2 rounded
    text-blue-600 bg-blue-100 inset-shadow-xs"
  >
    <CheckCircleIcon class="shrink-0" weight="bold" />
    <p>{message.text}</p>
  </div>
{:else if message.type === 'error'}
  <div
    class="flex items-center gap-2 p-2 rounded
    text-red-700 bg-red-100"
  >
    <WarningCircleIcon class="shrink-0" />
    <p>{message.text}</p>
  </div>
{/if}
