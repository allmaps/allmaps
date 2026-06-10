<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/state'

  import { generateChecksum } from '@allmaps/id/sync'

  import { getUrlState } from '$lib/shared/params.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMetadataState } from '$lib/state/metadata.svelte.js'
  import { setImagesState } from '$lib/state/images.svelte.js'
  import { setBackgroundColorsState } from '$lib/state/background-colors.svelte.js'

  import { sourceFromUrl, sourceFromData } from '$lib/shared/source.js'

  import Head from '$lib/components/Head.svelte'
  import About from '$lib/components/modals/About.svelte'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  let errorMessage = $state<string>()

  const urlState = getUrlState()
  const uiState = setUiState()

  // svelte-ignore state_referenced_locally
  const sourceState = setSourceState(urlState, uiState, data.source)
  const metadataState = setMetadataState(sourceState, urlState)
  const imagesState = setImagesState(sourceState)
  if (browser) {
    setBackgroundColorsState(sourceState, imagesState)
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

  $effect(() => {
    if (!urlParam && !urlState.params.data) {
      errorMessage = undefined
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
      errorMessage = undefined
      sourceState.source = data.source
    } else if ((!data.source || data.source.url !== urlParam) && urlParam) {
      const requestedUrlParam = urlParam

      currentUrlParam = requestedUrlParam
      currentDataParamChecksum = undefined
      sourceFromUrl(data.env.PUBLIC_REST_BASE_URL, requestedUrlParam)
        .then((source) => {
          if (getCurrentUrlParam() === requestedUrlParam) {
            errorMessage = undefined
            sourceState.source = source
          }
        })
        .catch((err) => {
          if (getCurrentUrlParam() === requestedUrlParam) {
            errorMessage =
              err.message || 'Failed to load source from url parameter'
          }
        })
    } else if (urlState.params.data) {
      const dataChecksum = generateChecksum(urlState.params.data)
      if (dataChecksum !== currentDataParamChecksum) {
        currentDataParamChecksum = dataChecksum
        currentUrlParam = undefined

        // TODO: cancel fetch in sourceFromData when still fetching
        sourceFromData(data.env.PUBLIC_REST_BASE_URL, urlState.params.data)
          .then((source) => {
            errorMessage = undefined
            sourceState.source = source
          })
          .catch((err) => {
            errorMessage =
              err.message || 'Failed to load source from data parameter'
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

{#if errorMessage}
  <p class="text-red-500">{errorMessage}</p>
{:else if browser}
  {@render children?.()}
  <About
    mapsApiBaseUrl={data.env.PUBLIC_REST_BASE_URL}
    annotationsApiBaseUrl={data.env.PUBLIC_ANNOTATIONS_BASE_URL}
    viewerBaseUrl={data.env.PUBLIC_VIEWER_BASE_URL}
  />
{/if}
