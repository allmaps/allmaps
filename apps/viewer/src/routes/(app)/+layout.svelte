<script lang="ts">
  import { error } from '@sveltejs/kit'

  import { generateChecksum } from '@allmaps/id/sync'

  import { getUrlState } from '$lib/shared/params.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setMetadataState } from '$lib/state/metadata.svelte.js'

  import { sourceFromData } from '$lib/shared/source.js'

  import Head from '$lib/components/Head.svelte'

  import type { LayoutProps } from './$types'

  let { data, children }: LayoutProps = $props()

  let errorMessage = $state<string>()

  const urlState = getUrlState()
  const uiState = setUiState()
  const sourceState = setSourceState(urlState, uiState)
  const metadataState = setMetadataState(sourceState, urlState)

  let currentUrlParam = $state<string>()
  let currentDataParamChecksum = $state<string>()

  $effect(() => {
    if (data.source && data.source.url !== currentUrlParam) {
      currentUrlParam = data.source.url
      currentDataParamChecksum = undefined
      sourceState.source = data.source
    } else if (urlState.params.data) {
      const dataChecksum = generateChecksum(urlState.params.data)
      if (dataChecksum !== currentDataParamChecksum) {
        currentDataParamChecksum = dataChecksum
        currentUrlParam = undefined

        // TODO: cancel fetch in sourceFromData when still fetching
        sourceFromData(urlState.params.data)
          .then((source) => {
            sourceState.source = source
          })
          .catch((err) => {
            errorMessage =
              err.message || 'Failed to load source from data parameter'
          })
      }
    } else if (!data.source && !urlState.params.data && !urlState.params.url) {
      sourceState.source = undefined
      currentUrlParam = undefined
      currentDataParamChecksum = undefined
    }
  })
</script>

<Head title={metadataState.appTitle} source={data.source} />

{#if errorMessage}
  <p class="text-red-500">{errorMessage}</p>
{:else}
  {@render children?.()}
{/if}
