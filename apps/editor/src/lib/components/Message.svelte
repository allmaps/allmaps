<script lang="ts">
  import {
    CheckCircle as CheckCircleIcon,
    WarningCircle as WarningCircleIcon,
    Info as InfoIcon
  } from 'phosphor-svelte'

  import type { Message } from '$lib/types/shared.js'

  type Props = { message: Message }

  let { message }: Props = $props()
</script>

{#if message.type === 'success'}
  <div
    class="inset-shadow-xs flex items-center gap-2 rounded
    bg-green-100 p-2 text-green-600"
  >
    <CheckCircleIcon class="shrink-0" weight="bold" />
    <p>{message.text}</p>
  </div>
{:else if message.type === 'error'}
  <div
    class="flex items-center gap-2 rounded bg-red-100
    p-2 text-red-700"
  >
    <WarningCircleIcon class="shrink-0" />
    <p>{message.text}</p>
  </div>
{:else if message.type === 'info'}
  <div
    class="flex items-center gap-2 rounded bg-blue-100
    p-2 text-blue-700"
  >
    <InfoIcon class="shrink-0" />
    <p>{message.text}</p>
  </div>
{/if}
