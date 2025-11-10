<script lang="ts">
  import { Popover } from '@allmaps/components'

  import YesNo from '$lib/components/YesNo.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    question?: Snippet
    onconfirm?: () => void
  }

  let { button: confirmButton, question, onconfirm }: Props = $props()

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
    {@render confirmButton()}
  {/snippet}
  {#snippet contents()}
    <div class="flex w-48 flex-col items-center gap-2">
      <span>
        {#if question}
          {@render question()}
        {:else}
          Are you sure?
        {/if}
      </span>
      <YesNo
        onYes={handleYesClick}
        yes="Delete"
        yesColor="red"
        onNo={handleNoClick}
        no="Cancel"
        noColor="gray"
      />
    </div>
  {/snippet}
</Popover>
