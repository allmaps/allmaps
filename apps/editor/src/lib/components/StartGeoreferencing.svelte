<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'

  const scopeState = getScopeState()
</script>

<div class="max-w-sm">
  {#if scopeState.scope === 'images'}
    No images have been georeferenced. Select an image and start by drawing a
    mask or by placing ground control points (GCPs)
  {:else}
    This image has not yet been georeferenced. Start by drawing a mask or by
    placing ground control points (GCPs)
  {/if}
</div>
