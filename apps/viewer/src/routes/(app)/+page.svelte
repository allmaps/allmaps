<script lang="ts">
  import { onMount } from 'svelte'

  import { Footer } from '@allmaps/ui'
  import { Loading } from '@allmaps/ui'
  import { green } from '@allmaps/tailwind'

  import Title from '$lib/components/app/Title.svelte'
  import Examples from '$lib/components/input/Examples.svelte'
  import View from '$lib/components/app/View.svelte'
  import PageSection from '$lib/components/app/PageSection.svelte'
  import Map from '$lib/components/map/Map.svelte'
  import Controls from '$lib/components/controls/Controls.svelte'
  import Header from '$lib/components/app/Header.svelte'
  import SourceInfoPopover from '$lib/components/metadata/SourceInfoPopover.svelte'
  import AnnotationInput from '$lib/components/input/AnnotationInput.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Error from '$lib/components/errors/Error.svelte'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getMetadataState } from '$lib/state/metadata.svelte.js'
  import { getErrorsState } from '$lib/state/errors.svelte.js'

  import { UiEvents } from '$lib/shared/ui-events.js'

  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const metadataState = getMetadataState()
  const errorsState = getErrorsState()

  let map = $state.raw<Map>()

  let shouldHaveSource = $derived(
    urlState.params.url !== undefined || urlState.params.data !== undefined
  )

  let isLoading = $derived(shouldHaveSource && !sourceState.source)
  let viewerBlockingError = $derived(errorsState.viewerBlockingError)

  onMount(() => {
    const handleZoomToExtent = () => map?.zoomToExtent()
    const handleZoomIn = () => map?.zoomIn()
    const handleZoomOut = () => map?.zoomOut()
    const handleResetBearing = () => map?.resetBearing()
    const handleLocateUser = () => map?.locateUser()

    uiState.addEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
    uiState.addEventListener(UiEvents.ZOOM_IN, handleZoomIn)
    uiState.addEventListener(UiEvents.ZOOM_OUT, handleZoomOut)
    uiState.addEventListener(UiEvents.RESET_BEARING, handleResetBearing)
    uiState.addEventListener(UiEvents.LOCATE_USER, handleLocateUser)

    return () => {
      uiState.removeEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
      uiState.removeEventListener(UiEvents.ZOOM_IN, handleZoomIn)
      uiState.removeEventListener(UiEvents.ZOOM_OUT, handleZoomOut)
      uiState.removeEventListener(UiEvents.RESET_BEARING, handleResetBearing)
      uiState.removeEventListener(UiEvents.LOCATE_USER, handleLocateUser)
    }
  })
</script>

{#snippet loading()}
  <View>
    {#snippet header()}
      <Header appName="Viewer" />
    {/snippet}
    <section class="w-full h-full flex flex-1 items-center justify-center p-8">
      <Loading />
    </section>
  </View>
{/snippet}

{#if viewerBlockingError}
  <View floatingHeader={true}>
    {#snippet header()}
      <Header appName="Viewer">
        {#if viewerBlockingError.type === 'images' && sourceState.source}
          {@const source = sourceState.source}
          <SourceInfoPopover
            {source}
            labels={metadataState.labels}
            title={metadataState.title}
            titleBadge={metadataState.titleBadge}
            organization={metadataState.organization}
            mapsHierarchy={mapsState.mapsHierarchy}
            bind:selectedMapId={urlState.params.mapId}
          />
        {/if}
      </Header>
    {/snippet}
    <Error
      sourceError={viewerBlockingError.type === 'source'
        ? viewerBlockingError.sourceError
        : undefined}
      imageErrors={viewerBlockingError.type === 'images'
        ? viewerBlockingError.imageErrors
        : undefined}
      sourceImageCount={viewerBlockingError.type === 'images'
        ? viewerBlockingError.sourceImageCount
        : undefined}
      title={viewerBlockingError.type === 'map-render'
        ? 'Could not render map'
        : undefined}
      message={viewerBlockingError.type === 'map-render'
        ? 'This georeferenced map was loaded, but Allmaps Viewer could not create a warped map from it.'
        : undefined}
      details={viewerBlockingError.type === 'map-render'
        ? viewerBlockingError.mapRenderError.message
        : undefined}
      sourceUrl={viewerBlockingError.type === 'map-render' &&
      sourceState.source?.sourceType === 'url'
        ? sourceState.source.url
        : undefined}
    />
  </View>
{:else if isLoading}
  {@render loading()}
{:else if shouldHaveSource && sourceState.source}
  {@const source = sourceState.source}
  <!-- TODO: instead of using key, the Map component could
   fly to the new location instead? -->
  {#key source.hash}
    <View>
      {#snippet header()}
        <Header appName="Viewer"
          ><SourceInfoPopover
            {source}
            labels={metadataState.labels}
            title={metadataState.title}
            titleBadge={metadataState.titleBadge}
            organization={metadataState.organization}
            mapsHierarchy={mapsState.mapsHierarchy}
            bind:selectedMapId={urlState.params.mapId}
          /></Header
        >
      {/snippet}
      {#snippet controls()}
        <Controls
          mapBearing={uiState.mapBearing}
          imageUpBearing={uiState.view === 'image'
            ? uiState.imageUpBearing
            : undefined}
          onZoomIn={() => uiState.dispatchZoomIn()}
          onZoomOut={() => uiState.dispatchZoomOut()}
          onZoomToExtent={() => uiState.dispatchZoomToExtent()}
          onLocateUser={() => uiState.dispatchLocateUser()}
          locateUserActive={uiState.locatingUser}
          onResetBearing={() => uiState.dispatchResetBearing()}
        />
      {/snippet}
      <Map
        bind:this={map}
        view={uiState.view}
        opacity={uiState.opacity}
        removeBackground={uiState.removeBackground}
        bind:selectedMapId={urlState.params.mapId}
        bind:bearing={uiState.mapBearing}
        bind:imageUpBearing={uiState.imageUpBearing}
      />
    </View>
  {/key}
{:else}
  <PageSection>
    <div class="flex w-full max-w-md flex-col items-center gap-6">
      <Title />
      <p class="text-center text-green font-medium text-lg leading-snug">
        View georeferenced maps and their metadata with Allmaps Viewer. Compare
        them with modern maps and discover the history behind each map.
      </p>
    </div>
    <div class="w-full max-w-xl">
      <AnnotationInput autoFocus />
    </div>
    <p class="w-full max-w-xl text-sm text-center text-gray-600">
      To get started, enter the URL of a <a
        class="underline"
        href="https://iiif.io/api/extension/georef/">Georeference Annotation</a
      >
      or
      <a class="underline" href="https://iiif.io/api/presentation/3.0/"
        >IIIF Manifest</a
      >
      in the input box. You can also paste or drag and drop their complete JSON contents.
      If you enter a IIIF Manifest, Allmaps Viewer will use the manifest's
      <a
        class="underline"
        href="https://iiif.io/api/presentation/3.0/#annotations"
        >embedded annotations</a
      > or look for associated georeferenced maps in the Allmaps database.
    </p>
  </PageSection>

  <div class="bg-green/10">
    <DotsPattern color={green} opacity={0.3}>
      <div class="pb-16">
        <PageSection>
          <Examples previewUrl={data.env.PUBLIC_PREVIEW_BASE_URL} />
        </PageSection>
      </div>
    </DotsPattern>
  </div>
  <Footer />
{/if}
