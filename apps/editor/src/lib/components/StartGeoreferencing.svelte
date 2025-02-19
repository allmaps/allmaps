<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()
</script>

{#if scopeState.scope === 'images'}
  <div>
    No images have been georeferenced. Select an image and start by drawing a
    mask or by placing ground control points (GCPs)
  </div>
{:else}
  <div>
    This image has not yet been georeferenced. Start by drawing a mask or by
    placing ground control points (GCPs)
  </div>
{/if}
