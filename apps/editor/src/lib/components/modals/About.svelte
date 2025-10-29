<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal, Logo } from '@allmaps/components'

  import AboutBackground from '$lib/components/AboutBackground.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

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
      with Allmaps Editor. It's easy: find a map, copy its IIIF URL and paste it
      into Allmaps Editor.
    </p>
    <!-- TODO: Add link to terms of use -->
    <div
      class="inset-shadow-sm border-1 rounded-md border-green-400 bg-green-100 p-2 text-green-600"
    >
      <TermsOfUse />
    </div>

    <p>
      For more information about Allmaps, see <a
        class="underline"
        href="https://allmaps.org">allmaps.org</a
      >.
    </p>
    <p>
      The source code of Allmaps Editor is
      <a
        class="underline"
        href="https://github.com/allmaps/allmaps/tree/main/apps/editor"
        >available on GitHub</a
      >.
    </p>
  </div>
</Modal>
