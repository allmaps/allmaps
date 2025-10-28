<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { Modal } from '@allmaps/components'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Highlight from '$lib/components/Highlight.svelte'
  import Scope from '$lib/components/Scope.svelte'

  const scopeState = getScopeState()
  const uiState = getUiState()

  let selectPortal = $state<HTMLElement>()
</script>

<Modal bind:open={uiState.modalOpen.annotation} size="lg" class="max-w-3xl">
  <div bind:this={selectPortal}></div>
  {#snippet title()}
    <div class="flex flex-col items-center gap-2 sm:flex-row">
      <span class="shrink-0 text-sm md:text-base"
        >Georeference Annotation for
      </span>
      <div class="w-48 text-base font-normal">
        <!-- Somehow, selectPortal is set to null when the modal closes,
         which causes an error in the bits-ui component -->
        <Scope to={selectPortal ? selectPortal : undefined} />
      </div>
    </div>
  {/snippet}
  {#if scopeState.mapsCount}
    <Highlight
      value={JSON.stringify(scopeState.annotation, null, 2)}
      lang="json"
    />
  {:else}
    <StartGeoreferencing />
  {/if}
</Modal>
