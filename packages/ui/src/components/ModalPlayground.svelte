<script lang="ts">
  import Modal from '$lib/components/Modal.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import Playground from './Playground.svelte'

  let open = $state(false)
  let example = $state<'short' | 'long'>('short')
  const sheets = Array.from({ length: 48 }, (_, index) => index + 1)

  function show(selected: typeof example) {
    example = selected
    open = true
  }
</script>

<Playground>
  {#snippet preview()}
    <div class="flex flex-wrap justify-center gap-3">
      <Button onclick={() => show('short')}>Open short example</Button>
      <Button onclick={() => show('long')}>Open long example</Button>
    </div>
  {/snippet}
</Playground>

<div class="not-content font-allmaps-ui">
  <Modal bind:open>
    {#snippet title()}
      {example === 'short' ? 'About this atlas' : 'Atlas sheet index'}
    {/snippet}
    {#if example === 'short'}
      <p class="m-0 max-w-sm">
        This atlas contains 48 map sheets, arranged from west to east in six
        rows.
      </p>
    {:else}
      <div class="w-80 max-w-full">
        <ol class="m-0 list-none p-0">
          {#each sheets as sheet (sheet)}
            <li
              class="flex items-baseline justify-between gap-4 border-b border-gray-200 py-2 text-sm last:border-0"
            >
              <span>Sheet {sheet}</span>
              <span class="font-mono text-gray-600"
                >{String.fromCharCode(
                  65 + Math.floor((sheet - 1) / 8)
                )}{((sheet - 1) % 8) + 1}</span
              >
            </li>
          {/each}
        </ol>
      </div>
    {/if}
  </Modal>
</div>
