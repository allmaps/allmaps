<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal, Logo, MovingMapsBackground } from '@allmaps/ui'

  import TermsOfUse from '$lib/components/TermsOfUse.svelte'
  import { getViewerUrl } from '$lib/shared/urls.js'
  import { getVarsState } from '$lib/state/vars.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  import type { EditorPublicEnv } from '@allmaps/env/editor'

  let allmapsEditorVersion = $state<string>()

  try {
    // @ts-expect-error - replaced at build time
    allmapsEditorVersion = __ALLMAPS_EDITOR_VERSION__
  } catch {
    // Couldn't get version from vite config
  }

  const uiState = getUiState()
  const varsState = getVarsState<EditorPublicEnv>()

  const annotationsApiBaseUrl = varsState.PUBLIC_ANNOTATIONS_BASE_URL
  const mapsApiBaseUrl = varsState.PUBLIC_REST_BASE_URL
  const viewerBaseUrl = varsState.PUBLIC_VIEWER_BASE_URL
</script>

<Modal bind:open={uiState.modalOpen.about}>
  {#snippet background()}
    <MovingMapsBackground
      {mapsApiBaseUrl}
      href={(id) =>
        getViewerUrl(viewerBaseUrl, annotationsApiBaseUrl, id, true)}
    />
  {/snippet}

  {#snippet title()}
    <span class="flex items-center gap-2">
      <div class="size-8"><Logo /></div>
      <span>Allmaps <span class="font-light">Editor</span></span>
    </span>
  {/snippet}
  <div class="flex max-w-sm flex-col gap-2">
    <p>
      {m.about_intro()}
      <a class="underline" href="https://allmaps.org/#getting-started"
        >{m.find_a_map()}</a
      >.
      {m.about_find_map()}
    </p>
    <!-- TODO: Add link to terms of use -->
    <div
      class="rounded-md border-1 border-green-400 bg-green-100 p-2 text-green-600 inset-shadow-sm"
    >
      <TermsOfUse />
    </div>

    <p>
      {m.about_more_info()}
      <a class="underline" href="https://allmaps.org">allmaps.org</a>. {m.about_source_code()}
      <a
        class="underline"
        href="https://github.com/allmaps/allmaps/tree/main/apps/editor"
        >{m.available_on_github()}</a
      >.
    </p>
    {#if allmapsEditorVersion}
      <p class="text-xs text-gray-500">
        {m.editor_version({ version: allmapsEditorVersion })}
      </p>
    {/if}
  </div>
</Modal>
