<script lang="ts">
  import { generateChecksum } from '@allmaps/id/sync'

  import { getUrlState } from '$lib/shared/params.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMetadataState } from '$lib/state/metadata.svelte.js'

  import { sourceFromUrl, sourceFromData } from '$lib/shared/source.js'

  import Head from '$lib/components/Head.svelte'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  let errorMessage = $state<string>()

  const urlState = getUrlState()
  const uiState = setUiState()

  // svelte-ignore state_referenced_locally
  const sourceState = setSourceState(urlState, uiState, data.source)
  const metadataState = setMetadataState(sourceState, urlState)

  let currentUrlParam = $state<string>()
  let currentDataParamChecksum = $state<string>()

  $effect(() => {
    if (data.source && data.source.url !== currentUrlParam) {
      currentUrlParam = data.source.url
      currentDataParamChecksum = undefined
      sourceState.source = data.source
    } else if (!data.source && data.urlParam) {
      currentUrlParam = data.urlParam
      currentDataParamChecksum = undefined
      sourceFromUrl(data.env.PUBLIC_REST_BASE_URL, data.urlParam)
        .then((source) => {
          sourceState.source = source
        })
        .catch((err) => {
          errorMessage =
            err.message || 'Failed to load source from url parameter'
        })
    } else if (urlState.params.data) {
      const dataChecksum = generateChecksum(urlState.params.data)
      if (dataChecksum !== currentDataParamChecksum) {
        currentDataParamChecksum = dataChecksum
        currentUrlParam = undefined

        // TODO: cancel fetch in sourceFromData when still fetching
        sourceFromData(data.env.PUBLIC_REST_BASE_URL, urlState.params.data)
          .then((source) => {
            sourceState.source = source
          })
          .catch((err) => {
            errorMessage =
              err.message || 'Failed to load source from data parameter'
          })
      }
    } else if (!data.source && !urlState.params.data && !data.urlParam) {
      sourceState.source = undefined
      currentUrlParam = undefined
      currentDataParamChecksum = undefined
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
{:else}
  {@render children?.()}
{/if}
