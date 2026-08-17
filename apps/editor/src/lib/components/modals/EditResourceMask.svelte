<script lang="ts">
  // import { parseResourceMask } from '@allmaps/io'

  import { Modal } from '@allmaps/ui'

  import FileUpload from '$lib/components/UploadFile.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import Message from '$lib/components/Message.svelte'
  import YesNo from '$lib/components/YesNo.svelte'
  import { m } from '$lib/paraglide/messages.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { Message as MessageType } from '$lib/types/shared.js'
  import type { ResourceMask } from '$lib/types/maps.js'

  type Props = {
    open: boolean
    map: GeoreferencedMap
    onsubmit: (resourceMask: ResourceMask) => void
  }

  let { open = $bindable(), map, onsubmit }: Props = $props()

  let resourceDimensions = $derived.by<[number, number] | undefined>(() => {
    const width = map.resource?.width
    const height = map.resource?.height

    if (width !== undefined && height !== undefined) {
      return [width, height]
    }
  })

  let resourceMaskString = $state<string>(
    resourceMaskToString(map.resourceMask)
  )
  let resourceMask = $state<ResourceMask>(map.resourceMask)
  let message = $state<MessageType>(
    getMessageFromResourceMask(map.resourceMask)
  )

  function getMessageFromResourceMask(resourceMask: ResourceMask): MessageType {
    return {
      text: m.successfully_parsed_mask({ count: resourceMask.length }),
      type: 'success'
    }
  }

  function resourceMaskToString(resourceMask: number[][]) {
    return resourceMask.map((point) => point.join(',')).join('\n')
  }

  function parseCoordinatePair(pair: string[]): [number, number] {
    if (pair.length === 2 && pair[0] && pair[1]) {
      let x = Number(pair[0])
      let y = Number(pair[1])

      if (!isNaN(x) && !isNaN(y)) {
        return [x, y]
      } else {
        throw new Error(m.parse_numbers_error({ x, y }))
      }
    } else {
      throw new Error(m.line_two_parts_error({ pair: pair.join(',') }))
    }
  }

  function parseResourceMask(resourceMaskString: string): ResourceMask {
    let resourceMask: ResourceMask | undefined

    try {
      let jsonResourceMask = JSON.parse(resourceMaskString)
      if (
        Array.isArray(jsonResourceMask) &&
        jsonResourceMask.every(
          (point) =>
            Array.isArray(point) &&
            point.length === 2 &&
            typeof point[0] === 'number' &&
            typeof point[1] === 'number'
        )
      ) {
        resourceMask = jsonResourceMask
      } else {
        throw new Error(m.invalid_resource_mask_array())
      }
    } catch {
      // Not JSON. Try other formats
    }

    if (!resourceMask) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(
          resourceMaskString,
          'application/xml'
        )

        // TODO: show message when SVG contains multiple polygons
        const polygon = doc.querySelector('polygon')
        const points = polygon?.getAttribute('points')

        resourceMask = points
          ?.trim()
          ?.split(/\s+/)
          .map((pair) => pair.split(','))
          .map(parseCoordinatePair)
      } catch {
        // Not SVG. Try other formats
      }
    }

    if (!resourceMask) {
      if (
        resourceMaskString
          .split('\n')
          .every((line) => line.length >= 3 && line.includes(','))
      ) {
        try {
          resourceMask = resourceMaskString.split('\n').map((line) => {
            const pair = line.split(',').map((part) => part.trim())
            return parseCoordinatePair(pair)
          })
        } catch {
          throw new Error(m.coordinate_line_format_error())
        }
      }
    }

    if (resourceMask) {
      if (resourceMask.length >= 3) {
        return resourceMask
      } else {
        throw new Error(m.resource_mask_minimum_points())
      }
    }

    throw new Error(m.resource_mask_parse_error())
  }

  $effect(() => {
    const trimmedResourceMaskString = resourceMaskString.trim()
    if (trimmedResourceMaskString.length > 0) {
      try {
        const parsedResourceMask = parseResourceMask(resourceMaskString.trim())
        message = getMessageFromResourceMask(parsedResourceMask)
        resourceMask = parsedResourceMask
      } catch (err) {
        resourceMask = []
        message = {
          text: err instanceof Error ? err.message : String(err),
          type: 'error'
        }
      }
    } else {
      resourceMask = []
      message = {
        text: m.no_mask_provided(),
        type: 'info'
      }
      return
    }
  })

  function handleCancel() {
    open = false
  }

  function handleSave() {
    onsubmit($state.snapshot(resourceMask) as ResourceMask)
    open = false
  }
</script>

<Modal bind:open>
  {#snippet title()}
    {m.edit_mask_title()}
  {/snippet}

  <p>{m.edit_mask_description()}</p>

  <ul class="list-inside list-disc">
    <li>
      {m.plain_text_coordinate_pairs()}
      <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >x,y</code
      >
    </li>
    <li>
      {m.json_coordinate_pairs()}
      <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >[[x1,y1],[x2,y2],[x3,y3]]</code
      >
    </li>
    <li>
      {m.svg_polygon()}
      <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >&lt;polygon points="x1,y1 x2,y2 x3,y3"/&gt;</code
      >
    </li>
  </ul>
  {#if resourceDimensions}
    <p>
      {m.current_image_dimensions({
        width: resourceDimensions[0],
        height: resourceDimensions[1]
      })}
    </p>
  {/if}

  <Textarea rows={10} bind:value={resourceMaskString} />

  <div class="grid grid-cols-[1fr_max-content] gap-2">
    <Message {message} />
    <FileUpload bind:value={resourceMaskString} />
  </div>
  <YesNo
    yes={m.save()}
    no={m.cancel()}
    noColor="gray"
    yesDisabled={!resourceMask.length}
    onNo={handleCancel}
    onYes={handleSave}
    class="flex flex-row gap-2 self-center"
  />
</Modal>
