<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/state'

  import { generateChecksum } from '@allmaps/id/sync'

  import { getUrlState } from '$lib/shared/params.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setMetadataState } from '$lib/state/metadata.svelte.js'
  import { setImagesState } from '$lib/state/images.svelte.js'
  import { setBackgroundColorsState } from '$lib/state/background-colors.svelte.js'
  import { setIiifState } from '$lib/state/iiif.svelte.js'

  import { sourceFromUrl, sourceFromData } from '$lib/shared/source.js'

  import Head from '$lib/components/Head.svelte'
  import About from '$lib/components/modals/About.svelte'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  const urlState = getUrlState()
  const uiState = setUiState()

  // svelte-ignore state_referenced_locally
  const sourceState = setSourceState(uiState, data.source)
  const mapsState = setMapsState(sourceState, urlState, uiState)
  const metadataState = setMetadataState(mapsState, urlState)
  const imagesState = setImagesState(mapsState)
  setIiifState(mapsState)
  if (browser) {
    setBackgroundColorsState(mapsState, imagesState)
  }

  let currentUrlParam = $state<string>()
  let currentDataParamChecksum = $state<string>()

  function getCurrentUrlParam() {
    const pageUrlParam = page.url.searchParams.get('url') || undefined

    if (browser) {
      return new URL(window.location.href).searchParams.get('url') || undefined
    }

    return pageUrlParam
  }

  let urlParam = $derived.by(() => getCurrentUrlParam())

  function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback
  }

  $effect(() => {
    if (!urlParam && !urlState.params.data) {
      sourceState.source = undefined
      currentUrlParam = undefined
      currentDataParamChecksum = undefined
    } else if (
      data.source &&
      data.urlParam &&
      data.urlParam === urlParam &&
      data.urlParam !== currentUrlParam
    ) {
      currentUrlParam = data.urlParam
      currentDataParamChecksum = undefined
      sourceState.source = data.source
    } else if ((!data.source || data.source.url !== urlParam) && urlParam) {
      const requestedUrlParam = urlParam

      currentUrlParam = requestedUrlParam
      currentDataParamChecksum = undefined
      sourceState.source = undefined
      sourceFromUrl(data.env.PUBLIC_ANNOTATIONS_BASE_URL, requestedUrlParam)
        .then((source) => {
          if (getCurrentUrlParam() === requestedUrlParam) {
            sourceState.source = source
          }
        })
        .catch((err) => {
          if (getCurrentUrlParam() === requestedUrlParam) {
            sourceState.error = {
              reason: 'url',
              message: getErrorMessage(
                err,
                'Failed to load source from url parameter'
              ),
              sourceUrl: requestedUrlParam
            }
          }
        })
    } else if (urlState.params.data) {
      const dataChecksum = generateChecksum(urlState.params.data)
      if (dataChecksum !== currentDataParamChecksum) {
        currentDataParamChecksum = dataChecksum
        currentUrlParam = undefined
        sourceState.source = undefined

        // TODO: cancel fetch in sourceFromData when still fetching
        sourceFromData(
          data.env.PUBLIC_ANNOTATIONS_BASE_URL,
          urlState.params.data
        )
          .then((source) => {
            sourceState.source = source
          })
          .catch((err) => {
            sourceState.error = {
              reason: 'data',
              message: getErrorMessage(
                err,
                'Failed to load source from data parameter'
              )
            }
          })
      }
    }
  })
</script>

<Head
  title={metadataState.appTitle}
  source={data.source}
  previewUrl={data.env.PUBLIC_PREVIEW_BASE_URL}
/>

{#if browser}
  {@render children?.()}
  <About
    mapsApiBaseUrl={data.env.PUBLIC_REST_BASE_URL}
    annotationsApiBaseUrl={data.env.PUBLIC_ANNOTATIONS_BASE_URL}
    viewerBaseUrl={data.env.PUBLIC_VIEWER_BASE_URL}
  />
{/if}
