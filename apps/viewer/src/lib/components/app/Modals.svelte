<script lang="ts">
  import About from '$lib/components/modals/About.svelte'
  import Attribution from '$lib/components/modals/Attribution.svelte'
  import Keyboard from '$lib/components/modals/Keyboard.svelte'

  type Props = {
    annotationsApiBaseUrl: string
    mapsApiBaseUrl: string
    viewerBaseUrl: string
    showAttributionFallback?: boolean
  }

  let {
    annotationsApiBaseUrl,
    mapsApiBaseUrl,
    viewerBaseUrl,
    showAttributionFallback = false
  }: Props = $props()
</script>

<About {annotationsApiBaseUrl} {mapsApiBaseUrl} {viewerBaseUrl} />
<Keyboard />

{#if showAttributionFallback}
  <Attribution includeGeoreferencedMaps={false} />
{/if}
