<script lang="ts">
  // import { parseResourceMask } from '@allmaps/io'

  import { Modal } from '@allmaps/components'

  import FileUpload from '$lib/components/UploadFile.svelte'
  import Textarea from '$lib/components/Textarea.svelte'
  import Message from '$lib/components/Message.svelte'
  import YesNo from '$lib/components/YesNo.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { Message as MessageType } from '$lib/types/shared.js'
  import type { ResourceMask } from '$lib/types/maps.js'

  type Props = {
    open: boolean
    map: GeoreferencedMap
    onsubmit: (resourceMask: ResourceMask) => void
  }

  let { open = $bindable(), map, onsubmit }: Props = $props()

  let resourceDimensions = $derived(
    map.resource ? [map.resource.width, map.resource.height] : undefined
  )

  let resourceMaskString = $state<string>(
    resourceMaskToString(map.resourceMask)
  )
  let resourceMask = $state<ResourceMask>(map.resourceMask)
  let message = $state<MessageType>(
    getMessageFromResourceMask(map.resourceMask)
  )

  function getMessageFromResourceMask(resourceMask: ResourceMask): MessageType {
    return {
      text: `Successfully parsed mask with ${resourceMask.length} points`,
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
        throw new Error(`Couldn't parse ${x},${y} as numbers`)
      }
    } else {
      throw new Error(`Line does not have two parts: ${pair}`)
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
        throw new Error('Resource mask is not a valid array of points')
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
          throw new Error(
            'Each line should be of the form "x,y" where x and y are numbers'
          )
        }
      }
    }

    if (resourceMask) {
      if (resourceMask.length >= 3) {
        return resourceMask
      } else {
        throw new Error('Resource mask should have at least 3 points')
      }
    }

    throw new Error('Could not parse resource mask')
  }

  $effect(() => {
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
    Edit Mask
  {/snippet}

  <p>
    Edit the mask of the current map in the text field below. Supported formats:
  </p>

  <ul class="list-inside list-disc">
    <li>
      Plain text list of coordinate pairs, one per line, e.g. <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >x,y</code
      >
    </li>
    <li>
      JSON array of coordinate pairs, e.g. <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >[[x1,y1],[x2,y2],[x3,y3]]</code
      >
    </li>
    <li>
      SVG polygon, e.g. <code
        class="rounded-sm border border-gray-100 bg-gray-100/50 px-1 font-mono text-gray-700"
        >&lt;polygon points="x1,y1 x2,y2 x3,y3"/&gt;</code
      >
    </li>
  </ul>
  {#if resourceDimensions}
    <p>
      The dimensions of the current image are {resourceDimensions[0]} × {resourceDimensions[1]}
      pixels
    </p>
  {/if}

  <Textarea rows={10} bind:value={resourceMaskString} />

  <div class="grid grid-cols-[1fr_max-content] gap-2">
    <Message {message} />
    <FileUpload bind:value={resourceMaskString} />
  </div>
  <YesNo
    yes="Save"
    no="Cancel"
    noColor="gray"
    yesDisabled={!resourceMask.length}
    onNo={handleCancel}
    onYes={handleSave}
    class="flex flex-row gap-2 self-center"
  />
</Modal>
