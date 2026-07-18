<script lang="ts">
  import { parseGcps } from '@allmaps/io'

  import { Modal } from '@allmaps/ui'

  import Textarea from '$lib/components/Textarea.svelte'
  import Message from '$lib/components/Message.svelte'
  import YesNo from '$lib/components/YesNo.svelte'
  import FileUpload from '$lib/components/UploadFile.svelte'
  import { m } from '$lib/paraglide/messages.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { GCPs } from '$lib/types/maps.js'
  import type { Message as MessageType } from '$lib/types/shared.js'

  type Props = {
    open: boolean
    map: GeoreferencedMap
    onsubmit: (gcps: GCPs) => void
  }

  let { open = $bindable(), map, onsubmit }: Props = $props()

  function generateGeoreferencedMapGcps(map: GeoreferencedMap): string {
    // TODO: Use generateGeoreferencedMapGcps from @allmaps/io
    // Ask Manuel how to return GCPs in lat/lon
    const gcps = Object.values(map.gcps)

    return gcps
      .map(({ geo, resource }) =>
        [...resource, ...geo.map((coord) => coord.toFixed(8))].join(' ')
      )
      .join('\n')
  }

  let gcpsString = $state<string>(generateGeoreferencedMapGcps(map))
  let gcps = $state<GCPs>(map.gcps)
  let message = $state<MessageType>(getMessageFromGcps(map.gcps))

  function getMessageFromGcps(gcps: GCPs): MessageType {
    return {
      text: m.successfully_parsed_gcps({ count: gcps.length }),
      type: 'success'
    }
  }

  $effect(() => {
    const trimmedGcpsString = gcpsString.trim()

    if (trimmedGcpsString.length > 0) {
      try {
        const parsedGcps = parseGcps(gcpsString.trim())
        message = getMessageFromGcps(parsedGcps.gcps)
        gcps = parsedGcps.gcps
      } catch (err) {
        gcps = []
        message = {
          text: err instanceof Error ? err.message : String(err),
          type: 'error'
        }
      }
    } else {
      gcps = []
      message = {
        text: m.no_gcps_provided(),
        type: 'info'
      }
    }
  })

  function handleCancel() {
    open = false
  }

  function handleSave() {
    onsubmit($state.snapshot(gcps) as GCPs)
    open = false
  }
</script>

<Modal bind:open>
  {#snippet title()}
    {m.edit_gcps_title()}
  {/snippet}
  <p>{m.edit_gcps_description()}</p>
  <p>{m.edit_gcps_formats()}</p>

  <Textarea rows={10} bind:value={gcpsString} />

  <div class="grid grid-cols-[1fr_max-content] gap-2">
    <Message {message} />
    <FileUpload bind:value={gcpsString} />
  </div>

  <YesNo
    yes={m.save()}
    no={m.cancel()}
    noColor="gray"
    yesDisabled={!gcps.length}
    onNo={handleCancel}
    onYes={handleSave}
    class="flex flex-row gap-2 self-center"
  />
</Modal>
