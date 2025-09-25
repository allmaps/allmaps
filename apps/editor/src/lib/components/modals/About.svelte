<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal } from '@allmaps/components'

  import Title from '$lib/components/Title.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  const uitState = getUiState()
</script>

<Modal bind:open={uitState.modalsVisible.about} closeButton={true}>
  {#snippet title()}
    About Allmaps Editor
  {/snippet}
  <div class="max-w-md">
    <Title />

    <div class="px-4">
      <p>Allmaps Editor is a web-based tool for georeferencing IIIF maps.</p>
      <p>
        For more information about Allmaps, see <a href="https://allmaps.org"
          >allmaps.org</a
        >.
      </p>
    </div>

    <!-- TODO: Add link to terms of use -->

    <div class="bg-yellow p-4 text-black rounded-xl">
      <TermsOfUse />
    </div>
  </div>
</Modal>
