<script lang="ts">
  import {
    MouseLeftClick as MouseLeftClickIcon,
    MouseRightClick as MouseRightClickIcon
  } from 'phosphor-svelte'

  import { Kbd } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal } from '@allmaps/components'

  const uitState = getUiState()
</script>

<Modal bind:open={uitState.modalsVisible.keyboard}>
  {#snippet title()}
    Keyboard shortcuts
  {/snippet}
  <table class="w-auto md:w-lg">
    <tbody class="first:pt-0">
      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">Images and maps</td></tr
      >

      <tr>
        <td class="p-1">Previous image</td>
        <td class="p-1"><Kbd>&#91;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Next image</td>
        <td class="p-1"><Kbd>&#93;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Previous map</td>
        <td class="p-1"><Kbd>&#123;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Next map</td>
        <td class="p-1"><Kbd>&#125;</Kbd></td>
      </tr>

      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">Switch view</td></tr
      >

      <tr>
        <td class="p-1">Images</td>
        <td class="p-1"><Kbd>1</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Draw mask</td>
        <td class="p-1"><Kbd>2</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Georeference</td>
        <td class="p-1"><Kbd>3</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Results</td>
        <td class="p-1"><Kbd>4</Kbd></td>
      </tr>

      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">Editing</td></tr
      >

      <tr>
        <td class="p-1">Rotate map or image</td>
        <td class="p-1"
          ><div class="flex flex-row items-center gap-1">
            <Kbd>Ctrl</Kbd> + <MouseLeftClickIcon class="size-6" />
            <span>Left click</span>
          </div></td
        >
      </tr>

      <tr>
        <td class="p-1">Add vertex</td>
        <td class="p-1">
          <div class="flex flex-row items-center gap-1">
            <MouseLeftClickIcon class="size-6" />
            <span>Left click</span>
          </div></td
        >
      </tr>

      <tr>
        <td class="p-1">Delete vertex</td>
        <td class="p-1">
          <div class="flex flex-row items-center gap-1">
            <MouseRightClickIcon class="size-6" />
            <span>Right click</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</Modal>
