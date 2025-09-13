<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  type Props = {
    count: number
  }

  let { count }: Props = $props()

  let loadingSteps: number[] = $state([0, 1, 2, 3])

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

{#each loadingSteps as index (index)}
  <li
    in:fade
    class="rounded-lg aspect-square bg-gray/20"
    style:scale={Math.max(0.9 - 0.02 * index, 0.05)}
  ></li>
{/each}
