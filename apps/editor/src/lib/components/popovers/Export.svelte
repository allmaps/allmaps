<script lang="ts">
  import { Code as CodeIcon } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getVarsState } from '$lib/state/vars.svelte.js'

  import {
    getAnnotationUrl,
    getViewerUrl,
    getXyzTilesUrl
  } from '$lib/shared/urls.js'

  import { Switch } from '@allmaps/components'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Scope from '$lib/components/Scope.svelte'
  import ExportUrl from '$lib/components/ExportUrl.svelte'
  import Cloud from '$lib/components/Cloud.svelte'

  import type { Env } from '$lib/types/env.js'

  const scopeState = getScopeState()
  const uiState = getUiState()
  const varsState = getVarsState<Env>()

  const viewerBaseUrl = varsState.get('PUBLIC_ALLMAPS_VIEWER_URL')
  const tileServerBaseUrl = varsState.get('PUBLIC_ALLMAPS_TILE_SERVER_URL')
  const annotationsApiBaseUrl = varsState.get(
    'PUBLIC_ALLMAPS_ANNOTATIONS_API_URL'
  )
</script>

<div class="flex flex-col gap-4">
  {#if scopeState.mapsCount}
    <div class="flex items-center gap-2">
      <span class="shrink-0">Export options for</span>
      <div class="w-48">
        <Scope />
      </div>
    </div>

    {#if scopeState.allmapsId}
      <ExportUrl
        url={getViewerUrl(
          viewerBaseUrl,
          annotationsApiBaseUrl,
          scopeState.allmapsId
        )}
        label="View in Allmaps Viewer"
      >
        <!-- <p>View the georeferenced map</p> -->
      </ExportUrl>

      <ExportUrl
        url={getAnnotationUrl(annotationsApiBaseUrl, scopeState.allmapsId)}
        label="Georeference Annotation"
      >
        {#snippet header()}
          <button
            onclick={() => (uiState.modalOpen.annotation = true)}
            class="flex cursor-pointer flex-row items-center gap-1.5 rounded-full bg-darkblue/90
        px-3 py-1 text-sm font-medium
      text-white shadow-none transition-all hover:bg-darkblue/100 hover:shadow-md"
          >
            <CodeIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
              class="hidden sm:inline-block"
              >Code
            </span>
          </button>
        {/snippet}
        <!-- <p>This Web Annotation contains all georeference data. You can use</p> -->
      </ExportUrl>

      <ExportUrl
        url={getXyzTilesUrl(
          tileServerBaseUrl,
          scopeState.allmapsId,
          uiState.retinaTiles
        )}
        label="XYZ map tiles"
      >
        {#snippet header()}
          <Switch bind:checked={uiState.retinaTiles}>2x resolution</Switch>
        {/snippet}
      </ExportUrl>

      <button
        onclick={() => (uiState.modalOpen.export = true)}
        class="cursor-pointer self-center rounded-full bg-green px-4 py-2
        font-medium text-white drop-shadow-xs
        transition-all hover:bg-green/90 hover:drop-shadow-lg/30"
        >Show more export options</button
      >
    {/if}
  {:else}
    <StartGeoreferencing />
  {/if}
  <Cloud />
</div>
