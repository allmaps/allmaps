<script lang="ts">
  import { Dialog } from 'bits-ui'

  import { getUiState } from '$lib/state/ui.svelte'

  import Title from '$lib/components/Title.svelte'
  import TermsOfUse from '$lib/components/TermsOfUse.svelte'

  const uitState = getUiState()

  function handleClose() {
    uitState.showAboutDialog = false
  }
</script>

<!--
class="fixed left-[50%] top-[200px] z-50 w-full max-w-[94%] translate-x-[-50%] rounded-lg
bg-white shadow-lg outline-none border-gray-100 data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
sm:max-w-[490px] md:w-full" -->

<Dialog.Root bind:open={uitState.showAboutDialog}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-black/75 p-4
      data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
    />
    <Dialog.Content
      class="fixed left-[50%] top-[10%] max-h-[85%] sm:top-[20%] sm:max-h-[75%] z-50 w-full max-w-[94%] translate-x-[-50%] rounded-lg
       bg-white shadow-lg outline-none border-gray-100
       sm:max-w-[490px] md:w-full p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 overflow-auto"
    >
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
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<!--
<div
  class="p-4 z-50 rounded-lg overflow-hidden bg-white shadow-md sm:max-w-[490px] md:w-full prose"
>
  <Title />

  <div class="px-4">
    <p>Allmaps Editor is a web-based tool for georeferencing IIIF maps.</p>
    <p>
      For more information about Allmaps, see <a href="https://allmaps.org"
        >allmaps.org</a
      >.
    </p>
  </div>


  <div class="bg-yellow p-4 text-black rounded-xl">
    <TermsOfUse />
  </div>

  <div class="flex align-center justify-center pt-4">
    <button
      class="bg-pink text-white font-bold px-4 py-2 cursor-pointer rounded-xl hover:bg-pink/80 transition-colors"
      onclick={() => onclose?.()}>Close</button
    >
  </div>
</div> -->
