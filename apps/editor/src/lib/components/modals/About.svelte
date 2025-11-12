<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal, Logo } from '@allmaps/components'

  import AboutBackground from '$lib/components/AboutBackground.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  let allmapsEditorVersion = $state<string>()

  try {
    // @ts-expect-error - replaced at build time
    allmapsEditorVersion = __ALLMAPS_EDITOR_VERSION__
  } catch {
    // Couldn't get version from vite config
  }

  const uiState = getUiState()
</script>

<Modal bind:open={uiState.modalOpen.about}>
  {#snippet background()}
    <AboutBackground />
  {/snippet}

  {#snippet title()}
    <span class="flex items-center gap-2">
      <div class="size-8"><Logo /></div>
      <span>Allmaps <span class="font-light">Editor</span></span>
    </span>
  {/snippet}
  <div class="flex max-w-sm flex-col gap-2">
    <p>
      Georeference any <a class="underline" href="https://iiif.io/">IIIF</a> map
      with Allmaps Editor.
      <a class="underline" href="https://allmaps.org/#getting-started"
        >Find a map</a
      > in the digital collections of an institution or public repository that supports
      IIIF , copy its IIIF URL and paste it into Allmaps Editor.
    </p>
    <!-- TODO: Add link to terms of use -->
    <div
      class="rounded-md border-1 border-green-400 bg-green-100 p-2 text-green-600 inset-shadow-sm"
    >
      <TermsOfUse />
    </div>

    <p>
      For more information about Allmaps, see <a
        class="underline"
        href="https://allmaps.org">allmaps.org</a
      >. The source code of Allmaps Editor is
      <a
        class="underline"
        href="https://github.com/allmaps/allmaps/tree/main/apps/editor"
        >available on GitHub</a
      >.
    </p>
    {#if allmapsEditorVersion}
      <p class="text-xs text-gray-500">
        Allmaps Editor version: {allmapsEditorVersion}
      </p>
    {/if}
  </div>
</Modal>
