<script lang="ts">
  import {
    MouseLeftClick as MouseLeftClickIcon,
    MouseRightClick as MouseRightClickIcon
  } from 'phosphor-svelte'

  import { Kbd, Modal } from '@allmaps/components'

  type Props = {
    open?: boolean
  }

  let { open = $bindable(false) }: Props = $props()
</script>

<Modal bind:open>
  {#snippet title()}
    Keyboard shortcuts
  {/snippet}

  <table class="w-auto md:w-lg">
    <tbody>
      <tr class="border-b-2 border-pink font-bold">
        <td class="p-1" colspan="2">General</td>
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
        <td class="p-1 whitespace-nowrap"><Kbd>M</Kbd></td>
      </tr>
      <tr>
        <td class="p-1">Switch to image view</td>
        <td class="p-1 whitespace-nowrap"><Kbd>I</Kbd></td>
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
        <td class="p-1 whitespace-nowrap"><Kbd>B</Kbd></td>
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
    </tbody>
  </table>
</Modal>
