<script lang="ts">
  import { loading } from '$lib/shared/stores/loading.js'
  import { itemCount, errorCount } from '$lib/shared/stores/counts.js'
</script>

<li class="rounded-lg aspect-square bg-white p-1.5 h-full">
  <header class="h-full flex flex-col justify-between">
    <h1 class="font-bold text-2xl">
      The latest maps edited with <a
        class="underline"
        href="https://editor.allmaps.org">Allmaps Editor</a
      >
    </h1>
    {#if !$loading}
      <div class="flex flex-row justify-between">
        <div>{$itemCount} maps</div>
        <div>{$errorCount} with errors</div>
      </div>
    {/if}
  </header>
</li>
