<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import Modal from '$lib/components/Modal.svelte'
  import Title from '$lib/components/Title.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  const uitState = getUiState()

  function handleClose() {
    uitState.showAboutModal = false
  }
</script>

<Modal bind:open={uitState.showAboutModal}>
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

  <div class="flex align-center justify-center pt-4">
    <button
      class="bg-pink text-white font-bold px-4 py-2 cursor-pointer rounded-xl hover:bg-pink/80 transition-colors"
      onclick={handleClose}>Close</button
    >
  </div>
</Modal>
