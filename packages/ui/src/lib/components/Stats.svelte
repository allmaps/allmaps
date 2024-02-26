<script lang="ts">
  import { env } from '$env/dynamic/public'
</script>

<svelte:head>
  {#if env.PUBLIC_STATS_WEBSITE_ID}
    <script
      async
      src="https://stats.allmaps.org/script.js"
      data-website-id={env.PUBLIC_STATS_WEBSITE_ID}
    ></script>
  {/if}
</svelte:head>
