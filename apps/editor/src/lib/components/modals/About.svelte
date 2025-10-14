<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal, Logo } from '@allmaps/components'

  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  const uiState = getUiState()
</script>

<Modal
  bind:open={
    () => uiState.getModalOpen('about'),
    (open) => uiState.setModalOpen('about', open)
  }
  closeButton={true}
>
  {#snippet title()}
    <span class="flex items-center gap-2">
      <div class="size-8"><Logo /></div>
      <span>Allmaps <span class="font-light">Editor</span></span>
    </span>
  {/snippet}
  <div class="max-w-md">
    <div class="">
      <p>Allmaps Editor is a web-based tool for georeferencing IIIF maps.</p>
      <p>
        For more information about Allmaps, see <a href="https://allmaps.org"
          >allmaps.org</a
        >.
      </p>
    </div>

    <!-- TODO: Add link to terms of use -->
    <div class="bg-yellow p-2 text-black rounded-md">
      <TermsOfUse />
    </div>
  </div>
</Modal>
