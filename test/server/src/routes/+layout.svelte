<script lang="ts">
  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  let { children } = $props()
</script>

<svelte:head>
  <link rel="icon" href="/favicon.png" />
  <title>Allmaps IIIF test server</title>
</svelte:head>

{@render children()}
