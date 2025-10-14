<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { Modal } from '@allmaps/components'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Highlight from '$lib/components/Highlight.svelte'
  import Scope from '$lib/components/Scope.svelte'

  const scopeState = getScopeState()
  const uiState = getUiState()

  let selectPortal = $state.raw<HTMLElement>()
</script>

<Modal
  bind:open={
    () => uiState.getModalOpen('annotation'),
    (open) => uiState.setModalOpen('annotation', open)
  }
  size="lg"
  class="max-w-3xl"
>
  {#snippet title()}
    <div class="flex items-center gap-2 flex-col sm:flex-row">
      <span class="shrink-0 text-sm md:text-base"
        >Georeference Annotation for
      </span>
      <div class="w-48 text-base font-normal">
        <Scope to={selectPortal} />
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
  <div bind:this={selectPortal}></div>
</Modal>
