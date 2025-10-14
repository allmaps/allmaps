<script lang="ts">
  import { Popover } from '@allmaps/components'

  import YesNo from '$lib/components/YesNo.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    question?: Snippet
    onconfirm?: () => void
  }

  let { button, question, onconfirm }: Props = $props()

  let isOpen = $state(false)

  function handleYesClick() {
    onconfirm?.()
    isOpen = false
  }

  function handleNoClick() {
    isOpen = false
  }
</script>

<Popover bind:open={isOpen}>
  {#snippet button()}
    {@render button()}
  {/snippet}
  {#snippet contents()}
    <div class="w-48 flex flex-col gap-2 items-center">
      <span>
        {#if question}
          {@render question()}
        {:else}
          Are you sure?
        {/if}
      </span>
      <YesNo onYes={handleYesClick} onNo={handleNoClick} />
    </div>
  {/snippet}
</Popover>
