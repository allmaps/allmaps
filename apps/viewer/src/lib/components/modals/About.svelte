<script lang="ts">
  import {
    ArrowRight as ArrowRightIcon,
    MapPinSimple as MapPinSimpleIcon,
    PencilSimple as PencilSimpleIcon
  } from 'phosphor-svelte'

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

  <div class="flex max-w-lg flex-col gap-4">
    <h3 class="text-lg font-medium leading-tight sm:text-xl">
      Explore georeferenced maps in their modern geographic context
    </h3>
    <p class="text-sm leading-6 sm:text-base">
      Allmaps Viewer places digitized <a
        href="https://iiif.io/"
        class="text-pink underline">IIIF maps</a
      > back onto the world, so old atlases, building plans and aerial photos can
      be overlayed and compared.
    </p>

    <p>
      To display georeferenced maps, Allmaps Viewer uses <a
        href="https://iiif.io/api/image/3.0/"
        class="text-pink underline">IIIF Images</a
      >
      and
      <a
        href="https://iiif.io/api/extension/georef/"
        class="text-pink underline">Georeference Annotations</a
      >, small open data files that describes how a map image lines up with the
      earth.
    </p>

    <section aria-label="Related Allmaps tools" class="grid gap-2">
      <a
        href="https://editor.allmaps.org/"
        class="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm transition-colors hover:border-pink/40 hover:bg-pink/5"
      >
        <span
          class="flex size-9 items-center justify-center rounded-full bg-pink/10 text-pink"
        >
          <PencilSimpleIcon class="size-5" />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="font-medium group-hover:text-pink">Allmaps Editor</span>
          <span class="group-hover:text-pink">
            Georeference any map that's available through IIIF.
          </span>
        </span>
        <ArrowRightIcon
          class="size-4 text-gray-400 transition-colors group-hover:text-pink"
        />
      </a>

      <a
        href="https://here.allmaps.org/"
        class="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm transition-colors hover:border-pink/40 hover:bg-pink/5"
      >
        <span
          class="flex size-9 items-center justify-center rounded-full bg-pink/10 text-pink"
        >
          <MapPinSimpleIcon class="size-5" />
        </span>
        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="font-medium group-hover:text-pink">Allmaps Here</span>
          <span class="group-hover:text-pink">
            Find georeferenced maps around your current location.
          </span>
        </span>
        <ArrowRightIcon
          class="size-4 text-gray-400 transition-colors group-hover:text-pink"
        />
      </a>
    </section>

    <footer
      class="flex flex-col gap-2 rounded-md bg-pink/10 p-3 text-sm leading-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <p class="text-pink">
        For more information about Allmaps, see <a
          class="underline"
          href="https://allmaps.org">allmaps.org</a
        >. The source code of Allmaps is
        <a class="underline" href="https://github.com/allmaps/allmaps"
          >available on GitHub</a
        >.
      </p>
    </footer>

    {#if allmapsViewerVersion}
      <p class="shrink-0 text-xs text-gray-500">
        Allmaps Viewer version: {allmapsViewerVersion}
      </p>
    {/if}
  </div>
</Modal>
