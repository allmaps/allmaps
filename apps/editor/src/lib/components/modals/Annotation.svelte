<script lang="ts">
  import { highlight } from '$lib/shared/highlight.js'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import Modal from '$lib/components/Modal.svelte'
  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Scope from '$lib/components/Scope.svelte'
  import Copy from '$lib/components/CopyButton.svelte'

  const scopeState = getScopeState()
  const uiState = getUiState()
</script>

<Modal bind:open={uiState.showAnnotationModal}>
  {#if scopeState.mapsCount}
    <div
      class="relative rounded-md min-w-0 max-w-(--breakpoint-md) max-h-[50vh] overflow-auto"
    >
      <div
        class="contents *:overflow-auto *:p-2 *:whitespace-pre-wrap *:break-all"
      >
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html highlight(scopeState.annotation)}
      </div>
      <div class="absolute top-0 right-0 p-2">
        <Copy text={JSON.stringify(scopeState.annotation, null, 2)} />
      </div>
    </div>
  {:else}
    <StartGeoreferencing />
  {/if}
  <Scope />
</Modal>
