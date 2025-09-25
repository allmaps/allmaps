<script lang="ts">
  import { generateGeoreferencedMapGcps, parseGcps } from '@allmaps/io'

  import { toGeoreferencedMap } from '$lib/shared/maps.js'

  import { getUiState } from '$lib/state/ui.svelte'
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import { Modal } from '@allmaps/components'

  const uitState = getUiState()
  const mapsState = getMapsState()

  let files = $state<FileList>()

  let gcps = $state<string>()

  mapsState.activeMap

  let georeferencedMap = $derived(
    mapsState.activeMap ? toGeoreferencedMap(mapsState.activeMap) : undefined
  )

  $effect(() => {
    try {
      gcps = georeferencedMap
        ? generateGeoreferencedMapGcps(georeferencedMap)
        : undefined
    } catch {
      gcps = undefined
    }
  })

  // let newGcps = $derived.by(() => {
  //   try {
  //     return gcps ? parseGcps(gcps) : undefined
  //   } catch {
  //     return undefined
  //   }
  // })

  async function parseGcpFile(files: FileList) {
    const file = files.item(0)
    const text = await file?.text()
    if (text) {
      try {
        const { gcps } = parseGcps(text)
        if (georeferencedMap && gcps.length) {
          return gcps
        }
      } catch {
        return []
      }
    }

    return []
  }

  $effect(() => {
    if (files) {
      parseGcpFile(files).then((parsedGcps) => {
        if (parsedGcps.length) {
          // TODO: use parsedGcps
        }
      })
    }
  })
</script>

<Modal
  bind:open={uitState.modalsVisible.editGcps}
  class="flex flex-col gap-2 max-w-xl"
>
  {#snippet title()}
    Edit Ground Control Points
  {/snippet}
  <p>
    You can use the formats used by QGIS, GDAL, ESRI. You can use the Upload
    button to read the GCPs from a file on your computer.
  </p>

  {#if gcps}
    <textarea
      name="gcps"
      rows={10}
      class="w-full h-auto font-mono inset-shadow-2xs
      p-2 rounded-md
      bg-[:#2e3440ff] text-[#d8dee9ff]"
      bind:value={gcps}
    ></textarea>

    <div>
      <label for="upload">
        <span
          class="cursor-pointer border border-gray-300 rounded-lg px-2 py-1"
        >
          Upload a GCP file
        </span>
        <input bind:files id="upload" type="file" class="hidden" />
      </label>
    </div>

    <!-- <div>{JSON.stringify(newGcps)}</div> -->
    <div class="flex flex-row justify-center gap-2">
      <button
        class="cursor-pointer"
        onclick={() => (uitState.modalsVisible.editGcps = false)}>Cancel</button
      >
      <button class="cursor-pointer">Save</button>
    </div>
  {:else}
    <div>No GCPs...</div>
  {/if}
</Modal>
