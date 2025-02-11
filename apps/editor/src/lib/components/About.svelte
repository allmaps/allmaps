<script lang="ts">
  import Title from '$lib/components/Title.svelte'

  type Props = {
    onclose?: () => void
  }

  let { onclose }: Props = $props()
</script>

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

  <!-- TODO: Add link to terms of use -->

  <div class="bg-yellow p-4 text-black rounded-xl">
    All changes are saved automatically and published as open data under <a
      class="underline"
      href="https://creativecommons.org/public-domain/cc0/">CC0</a
    >. By using Allmaps Editor, you're agreeing to our terms of use and to
    automatically publishing your edits as open data.
  </div>

  <div class="flex align-center justify-center pt-4">
    <button
      class="bg-pink text-white font-bold px-4 py-2 cursor-pointer rounded-xl hover:bg-pink/80 transition-colors"
      onclick={() => onclose?.()}>Close</button
    >
  </div>
</div>
