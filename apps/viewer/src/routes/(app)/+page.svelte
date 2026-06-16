<script lang="ts">
  import { Footer } from '@allmaps/components'
  import { Loading } from '@allmaps/ui'
  import { pink } from '@allmaps/tailwind'

  import Title from '$lib/components/Title.svelte'
  import Examples from '$lib/components/Examples.svelte'
  import View from '$lib/components/View.svelte'
  import PageSection from '$lib/components/PageSection.svelte'
  import Map from '$lib/components/Map.svelte'
  import Controls from '$lib/components/Controls.svelte'
  import Header from '$lib/components/Header.svelte'
  import Info from '$lib/components/Info.svelte'
  import AnnotationInput from '$lib/components/AnnotationInput.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'
  import Error from '$lib/components/Error.svelte'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getMetadataState } from '$lib/state/metadata.svelte.js'
  import { getImagesState } from '$lib/state/images.svelte.js'

  import { UiEvents } from '$lib/shared/ui-events.js'

  import type { PageProps } from './$types'
  import type { ImageError } from '$lib/state/images.svelte.js'
  import type { SourceError } from '$lib/state/source.svelte.js'

  type ActiveError =
    | {
        type: 'source'
        sourceError: SourceError
      }
    | {
        type: 'images'
        imageErrors: ImageError[]
        sourceImageCount: number
      }

  let { data }: PageProps = $props()

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const metadataState = getMetadataState()
  const imagesState = getImagesState()

  let map = $state.raw<Map>()

  let shouldHaveSource = $derived(
    urlState.params.url !== undefined || urlState.params.data !== undefined
  )

  let isLoading = $derived(shouldHaveSource && !sourceState.source)
  let imageErrors = $derived([...imagesState.imageErrors.values()])
  let activeError = $derived.by((): ActiveError | undefined => {
    if (sourceState.error) {
      return {
        type: 'source',
        sourceError: sourceState.error
      }
    }

    if (imagesState.allSourceImagesFailed) {
      return {
        type: 'images',
        imageErrors,
        sourceImageCount: imagesState.sourceImageCount
      }
    }
  })

  uiState.addEventListener(UiEvents.ZOOM_TO_EXTENT, () => map?.zoomToExtent())
  uiState.addEventListener(UiEvents.ZOOM_IN, () => map?.zoomIn())
  uiState.addEventListener(UiEvents.ZOOM_OUT, () => map?.zoomOut())
  uiState.addEventListener(UiEvents.RESET_BEARING, () => map?.resetBearing())
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

{#if activeError}
  <View floatingHeader={true}>
    {#snippet header()}
      <Header appName="Viewer">
        {#if activeError.type === 'images' && sourceState.source}
          {@const source = sourceState.source}
          <Info
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
      sourceError={activeError.type === 'source'
        ? activeError.sourceError
        : undefined}
      imageErrors={activeError.type === 'images'
        ? activeError.imageErrors
        : undefined}
      sourceImageCount={activeError.type === 'images'
        ? activeError.sourceImageCount
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
          ><Info
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
          onResetBearing={() => uiState.dispatchResetBearing()}
        />
      {/snippet}
      <Map
        bind:this={map}
        {source}
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
      <p class="text-center text-black">
        View warped maps and their metadata with Allmaps Viewer. Explore
        georeferenced maps, compare them with modern maps.
      </p>
    </div>
    <div class="w-full max-w-xl">
      <AnnotationInput autoFocus />
    </div>
    <div></div>
  </PageSection>

  <div class="bg-pink/10">
    <DotsPattern color={pink} opacity={0.3}>
      <div class="pb-16">
        <PageSection>
          <Examples previewUrl={data.env.PUBLIC_PREVIEW_BASE_URL} />
        </PageSection>
      </div>
    </DotsPattern>
  </div>
  <Footer />
{/if}
