<script lang="ts">
  import {
    MouseLeftClick as MouseLeftClickIcon,
    MouseRightClick as MouseRightClickIcon
  } from 'phosphor-svelte'

  import { Kbd } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte'
  import { m } from '$lib/paraglide/messages.js'

  import { Modal } from '@allmaps/components'

  const uiState = getUiState()
</script>

<Modal bind:open={uiState.modalOpen.keyboard}>
  {#snippet title()}
    {m.keyboard_shortcuts()}
  {/snippet}
  <table class="w-auto md:w-lg">
    <tbody class="first:pt-0">
      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">{m.general()}</td></tr
      >

      <tr>
        <td class="p-1">{m.show_command_palette()}</td>
        <td class="p-1"><Kbd>Cmd</Kbd>+<Kbd>K</Kbd></td>
      </tr>

      <!-- <tr>
        <td class="p-1">Toggle georeferenced map opacity</td>
        <td class="p-1"><Kbd>Space</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Increase georeferenced map opacity</td>
        <td class="p-1"><Kbd>Ctrl</Kbd><span>+</span><Kbd>+</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Decrease georeferenced map opacity</td>
        <td class="p-1"><Kbd>Ctrl</Kbd><span>+</span><Kbd>-</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Toggle mask rendering</td>
        <td class="p-1"><Kbd>M</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">Toggle background</td>
        <td class="p-1"><Kbd>B</Kbd></td>
      </tr> -->

      <!-- <tr>
        <td class="p-1">Show Keyboard shortcuts</td>
        <td class="p-1"><Kbd>Ctrl</Kbd>+<Kbd>k</Kbd></td>
      </tr> -->

      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">{m.images_and_maps()}</td></tr
      >

      <tr>
        <td class="p-1">{m.previous_image()}</td>
        <td class="p-1"><Kbd>&#91;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">{m.next_image()}</td>
        <td class="p-1"><Kbd>&#93;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">{m.previous_map()}</td>
        <td class="p-1"><Kbd>&#123;</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">{m.next_map()}</td>
        <td class="p-1"><Kbd>&#125;</Kbd></td>
      </tr>

      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">{m.switch_view()}</td></tr
      >

      <tr>
        <td class="p-1">{m.images()}</td>
        <td class="p-1"><Kbd>1</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">{m.draw_mask()}</td>
        <td class="p-1"><Kbd>2</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">{m.georeference()}</td>
        <td class="p-1"><Kbd>3</Kbd></td>
      </tr>

      <tr>
        <td class="p-1">{m.results()}</td>
        <td class="p-1"><Kbd>4</Kbd></td>
      </tr>

      <tr class="border-b-2 border-pink font-bold"
        ><td class="p-1" colspan="2">{m.editing()}</td></tr
      >

      <tr>
        <td class="p-1">{m.rotate_map_or_image()}</td>
        <td class="p-1"
          ><div class="flex flex-row items-center gap-1">
            <Kbd>Ctrl</Kbd> + <MouseLeftClickIcon class="size-6" />
            <span>{m.left_click()}</span>
          </div></td
        >
      </tr>

      <tr>
        <td class="p-1">{m.add_point()}</td>
        <td class="p-1">
          <div class="flex flex-row items-center gap-1">
            <MouseLeftClickIcon class="size-6" />
            <span>{m.left_click()}</span>
          </div></td
        >
      </tr>

      <tr>
        <td class="p-1">{m.delete_point()}</td>
        <td class="p-1">
          <div class="flex flex-row items-center gap-1">
            <MouseRightClickIcon class="size-6" />
            <span>{m.right_click()}</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</Modal>
