<script lang="ts">
  import {
    MouseLeftClick as MouseLeftClickIcon,
    MouseRightClick as MouseRightClickIcon
  } from 'phosphor-svelte'

  import { Kbd, Modal } from '@allmaps/ui'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
</script>

<Modal bind:open={uiState.modalOpen.keyboard}>
  {#snippet title()}
    Keyboard shortcuts
  {/snippet}

  <table class="w-auto md:w-lg">
    <tbody>
      <tr class="border-b-2 border-pink font-bold">
        <td class="p-1" colspan="2">General</td>
      </tr>
      <tr>
        <td class="p-1">Zoom in</td>
        <td class="p-1 whitespace-nowrap"><Kbd>+</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Zoom out</td>
        <td class="p-1 whitespace-nowrap"><Kbd>-</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Zoom to extent</td>
        <td class="p-1 whitespace-nowrap"><Kbd>0</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Previous map</td>
        <td class="p-1 whitespace-nowrap"><Kbd>[</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Next map</td>
        <td class="p-1 whitespace-nowrap"><Kbd>]</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Switch to map view</td>
        <td class="p-1 whitespace-nowrap"><Kbd>m</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Switch to image view</td>
        <td class="p-1 whitespace-nowrap"><Kbd>i</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Open map list</td>
        <td class="p-1 whitespace-nowrap"><Kbd>Meta</Kbd> + <Kbd>/</Kbd></td>
      </tr>

      <tr class="border-b-2 border-pink font-bold">
        <td class="p-1 pt-4" colspan="2">Map</td>
      </tr>
      <tr>
        <td class="p-1">Temporarily hide warped maps</td>
        <td class="p-1 whitespace-nowrap"><Kbd>Space</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Temporarily remove background color</td>
        <td class="p-1 whitespace-nowrap"><Kbd>b</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Select map</td>
        <td class="p-1 whitespace-nowrap">
          <div class="flex flex-row items-center gap-1">
            <MouseLeftClickIcon class="size-6" />
            <span>Left click</span>
          </div>
        </td>
      </tr>
      <tr>
        <td class="p-1">Open map menu</td>
        <td class="p-1 whitespace-nowrap">
          <div class="flex flex-row items-center gap-1">
            <MouseRightClickIcon class="size-6" />
            <span>Right click</span>
          </div>
        </td>
      </tr>
      <tr>
        <td class="p-1">Rotate map</td>
        <td class="p-1 whitespace-nowrap">
          <div class="flex flex-row items-center gap-1">
            <MouseRightClickIcon class="size-6" />
            <span>Right click</span> + drag
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</Modal>
