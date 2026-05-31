<script lang="ts">
  import { Logo, Modal, MovingMapsBackground } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte.js'

  type Props = {
    annotationsApiBaseUrl: string
    mapsApiBaseUrl: string
    viewerBaseUrl: string
  }

  let { annotationsApiBaseUrl, mapsApiBaseUrl, viewerBaseUrl }: Props = $props()

  let allmapsViewerVersion = $state<string>()

  try {
    // @ts-expect-error - replaced at build time
    allmapsViewerVersion = __ALLMAPS_VIEWER_VERSION__
  } catch {
    // Couldn't get version from vite config
  }

  const uiState = getUiState()
</script>

<Modal bind:open={uiState.modalOpen.about}>
  {#snippet background()}
    <MovingMapsBackground
      {mapsApiBaseUrl}
      href={(id) => `${viewerBaseUrl}/?url=${annotationsApiBaseUrl}/${id}`}
    />
  {/snippet}

  {#snippet title()}
    <span class="flex items-center gap-2">
      <div class="size-8"><Logo /></div>
      <span>Allmaps <span class="font-light">Viewer</span></span>
    </span>
  {/snippet}

  <div class="flex max-w-sm flex-col gap-2">
    <p>
      Allmaps Viewer is a web application to view georeferenced <a
        href="https://iiif.io/"
        class="underline">IIIF maps</a
      >.
    </p>
    <p>
      To display one or more georeferenced maps, Allmaps Viewer needs a <a
        href="https://iiif.io/api/extension/georef/"
        class="underline">Georeference Annotation</a
      >. You can use
      <a href="https://editor.allmaps.org/" class="underline">Allmaps Editor</a>
      to georeference any map that's available through IIIF and create these annotations.
      <a href="https://here.allmaps.org/" class="underline">Allmaps Here</a> helps
      you find georeferenced maps around your current location.
    </p>

    <p>
      For more information about Allmaps, see <a
        class="underline"
        href="https://allmaps.org">allmaps.org</a
      >. The source code of Allmaps Viewer is
      <a
        class="underline"
        href="https://github.com/allmaps/allmaps/tree/main/apps/viewer"
        >available on GitHub</a
      >.
    </p>

    {#if allmapsViewerVersion}
      <p class="text-xs text-gray-500">
        Allmaps Viewer version: {allmapsViewerVersion}
      </p>
    {/if}
  </div>
</Modal>
