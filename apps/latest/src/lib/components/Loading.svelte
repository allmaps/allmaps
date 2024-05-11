<script lang="ts">
  import { onMount } from 'svelte'

  export let count

  let loadingSteps: number[] = []

  onMount(() => {
    let loadingInterval = setInterval(() => {
      loadingSteps.push(loadingSteps.length)
      loadingSteps = loadingSteps

      if (loadingSteps.length > count) {
        clearInterval(loadingInterval)
      }
    }, 200)

    return () => clearInterval(loadingInterval)
  })
</script>

{#each loadingSteps as index}
  <li
    class="rounded-lg aspect-square bg-gray/20"
    style:scale={Math.max(0.9 - 0.02 * index, 0.05)}
  />
{/each}
