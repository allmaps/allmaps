<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  const scopeState = getScopeState()
</script>

<div class="max-w-sm">
  {#if scopeState.scope === 'images'}
    {m.no_images_georeferenced()}
  {:else}
    {m.image_not_georeferenced()}
  {/if}
</div>
