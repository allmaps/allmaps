<script lang="ts">
  import { getHeadState } from '$lib/state/head.svelte.js'

  const headState = getHeadState()
</script>

<svelte:head>
  {#if headState.tags}
    <title>{headState.tags.title}</title>
    <meta name="description" content={headState.tags.description} />
    {#each headState.tags.og as tag (tag)}
      <meta {...tag} />
    {/each}
  {/if}
</svelte:head>
