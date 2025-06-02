<script lang="ts">
  import { Copy as CopyIcon, Check as CheckIcon } from 'phosphor-svelte'

  type Props = {
    text: string
    label: string
    class?: string
    disabled?: boolean
  }

  let { text, label, class: className, disabled = false }: Props = $props()

  let copying = $state(false)

  let copyTimeout: number | undefined

  function handleCopy() {
    navigator.clipboard.writeText(text)

    copying = true

    window.clearTimeout(copyTimeout)
    copyTimeout = window.setTimeout(() => {
      copying = false
    }, 2000)
  }
</script>

<button class={className} {disabled} onclick={handleCopy}>
  {#if copying}
    <CheckIcon class="size-5" />
  {:else}
    <CopyIcon class="size-5" />
  {/if}
  {label}</button
>
