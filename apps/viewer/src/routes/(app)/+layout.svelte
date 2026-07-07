<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/state'

  import { generateChecksum } from '@allmaps/id/sync'

  import { getUrlState } from '$lib/shared/params.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setMetadataState } from '$lib/state/metadata.svelte.js'
  import { setImagesState } from '$lib/state/images.svelte.js'
  import { setErrorsState } from '$lib/state/errors.svelte.js'
  import { setBackgroundColorsState } from '$lib/state/background-colors.svelte.js'
  import { setIiifState } from '$lib/state/iiif.svelte.js'

  import { sourceFromUrl, sourceFromData } from '$lib/shared/source.js'
  import {
    getSourceErrorCode,
    getSourceErrorDetails,
    getSourceErrorTitle
  } from '$lib/shared/source-errors.js'

  import Attribution from '$lib/components/modals/Attribution.svelte'
  import Head from '$lib/components/app/Head.svelte'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  const urlState = getUrlState()
  const uiState = getUiState()

  // svelte-ignore state_referenced_locally
  const sourceState = setSourceState(uiState, data.source)
  const mapsState = setMapsState(sourceState, urlState, uiState)
  const metadataState = setMetadataState(mapsState, urlState)
  const imagesState = setImagesState(mapsState)
  setErrorsState(sourceState, mapsState, imagesState)
  setIiifState(mapsState)
  if (browser) {
    setBackgroundColorsState(mapsState, imagesState)
  }

  // svelte-ignore state_referenced_locally
  let currentUrlParam = $state<string | undefined>(
    data.source && data.urlParam ? data.urlParam : undefined
  )
  let currentDataParamChecksum = $state<string>()

  function getCurrentUrlParam() {
    const pageUrlParam = page.url.searchParams.get('url') || undefined

    if (browser) {
      return new URL(window.location.href).searchParams.get('url') || undefined
    }

    return pageUrlParam
  }

  let urlParam = $derived.by(() => getCurrentUrlParam())

  function setSource(source: typeof sourceState.source) {
    mapsState.clearMapRenderErrors()
    sourceState.source = source
  }

  function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback
  }

  function isCorsLikely(url: string, err: unknown) {
    if (!browser || !(err instanceof Error)) {
      return false
    }

    try {
      return (
        new URL(url, window.location.href).origin !== window.location.origin &&
        err.message.toLowerCase().includes('fetch')
      )
    } catch {
      return false
    }
  }

  $effect(() => {
    if (urlParam) {
      if (
        data.source &&
        data.urlParam &&
        data.urlParam === urlParam &&
        data.urlParam !== currentUrlParam
      ) {
        currentUrlParam = data.urlParam
        currentDataParamChecksum = undefined
        setSource(data.source)
      } else if (
        data.clientSourceLoadReason &&
        (!data.source || data.source.url !== urlParam)
      ) {
        const requestedUrlParam = urlParam

        currentUrlParam = requestedUrlParam
        currentDataParamChecksum = undefined
        setSource(undefined)
        sourceFromUrl(data.env.PUBLIC_ANNOTATIONS_BASE_URL, requestedUrlParam)
          .then((source) => {
            if (getCurrentUrlParam() === requestedUrlParam) {
              setSource(source)
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
                code: getSourceErrorCode(err),
                title: getSourceErrorTitle(err),
                details: getSourceErrorDetails(err),
                corsLikely: isCorsLikely(requestedUrlParam, err),
                sourceUrl: requestedUrlParam
              }
            }
          })
      }

      return
    }

    const dataParam = urlState.params.data

    if (!dataParam) {
      setSource(undefined)
      currentUrlParam = undefined
      currentDataParamChecksum = undefined
    } else {
      const dataChecksum = generateChecksum(dataParam)
      if (dataChecksum !== currentDataParamChecksum) {
        currentDataParamChecksum = dataChecksum
        currentUrlParam = undefined
        setSource(undefined)

        // TODO: cancel fetch in sourceFromData when still fetching
        sourceFromData(data.env.PUBLIC_ANNOTATIONS_BASE_URL, dataParam)
          .then((source) => {
            setSource(source)
          })
          .catch((err) => {
            sourceState.error = {
              reason: 'data',
              message: getErrorMessage(
                err,
                'Failed to load source from data parameter'
              ),
              code: getSourceErrorCode(err),
              title: getSourceErrorTitle(err),
              details: getSourceErrorDetails(err)
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
  <Attribution />
{/if}
