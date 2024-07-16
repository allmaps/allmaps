<script lang="ts">
  import { generateId } from '@allmaps/id'

  let userUrl: string | null = null
  let hash: string | null = null
  let type: string | null = 'images'
  import { onMount } from 'svelte'
  import {
    IIIF,
    Image as IIIFImage,
    Manifest as IIIFManifest,
    Collection as IIIFCollection
  } from '@allmaps/iiif-parser'
  import CodeBlock from './CodeBlock.svelte'
  import IiifPreviewBlock from './IiifPreviewBlock.svelte'
  let parsedIiif: IIIFImage | IIIFManifest | IIIFCollection
  let editorHover: boolean = false
  let viewerHover: boolean = false
  let hashHover: boolean = false
  let path: string | null = null
  let fileJson: string | null = null
  let updatedCode: string = 'console.log("first load")'
  const loadUrl = () => {
    //VVN TODO do i need to sanitize userUrl
    // Figure out what kind of URL it is
    console.log('load url clicked')
    if (isIIIFResourceUrl(userUrl)) {
      loadId()
      // Get URI
      // Get kind of IIIF resource
    } else if (isAllmapsId(userUrl)) {
    } else if (isGeoreferenceAnnotation(userUrl)) {
    } else {
      // Not a valid URL
    }

    // Populate fields based on that

    hash = '5dece1679edba0dd'
  }

  onMount(() => {
    updatedCode = 'console.log("hello")'
  })

  const isIIIFResourceUrl = (u) => {
    return true
  }

  const isAllmapsId = (u) => {
    return false
  }

  const isGeoreferenceAnnotation = (u) => {
    return false
  }

  const loadId = async () => {
    let json = await fetch(userUrl).then((response) => response.json())
    parsedIiif = IIIF.parse(json)
    fileJson = JSON.stringify(json)

    if (parsedIiif instanceof IIIFImage) {
      path = `/images/`
    } else if (parsedIiif instanceof IIIFManifest) {
      path = `/manifests/`
    } else if (parsedIiif instanceof IIIFCollection) {
      path = `/collections/`
    }
    // const stringManifest = JSON.stringify(manifest)
    hash = await generateId(parsedIiif.uri)
  }
</script>

<div class="not-content">
  <div
    class="text-2xl font-bold underline decoration-yellow underline-offset-4 decoration-4 mt-4"
  >
    URL
  </div>
  <div class="flex flex-row mt-4">
    <input
      class="grow bg-yellow/30 border-yellow/30 border-2 rounded-l-md focus:outline-none focus:border-yellow focus:ring-0 p-1 pl-2"
      bind:value={userUrl}
    />
    <button
      class="flex flex-col justify-center bg-purple-600 text-white px-10 rounded-r-md cursor-pointer"
      on:click={loadUrl}
    >
      <div>Load</div>
    </button>
  </div>
  <div class="text-sm italic font-thin text-gray-600">
    IIIF manifests can be loaded into Allmaps to georeference maps.
  </div>
  <div class="w-full mt-4 h-64">
    <slot code={"console.log('on first load')"} />
    <!-- <CodeBlock code={fileJson} /> -->
  </div>
  <div class="flex flex-row gap-4 mt-4">
    <div class="flex flex-col basis-1/3 shrink-0">
      <div class="text-2xl font-bold">Hash</div>
      <div
        class="text-lg bg-yellow/30 border-yellow/30 p-2 py-4 mt-2 border-2 rounded-md hover:border-yellow hover:bg-yellow"
        on:pointerenter={() => {
          hashHover = true
        }}
        on:pointerleave={() => {
          hashHover = false
        }}
      >
        {parsedIiif ? hash : 'no url'}
      </div>
      <div class="italic text-sm font-thin text-gray-600">
        <!-- This needs to be a localized string VVN TODO -->
        This hash is used to load the manifest in the Allmaps Editor and viewer
      </div>
    </div>
    <div class="flex flex-col basis-2/3 grow-0">
      <div class="text-2xl font-bold">Open in the Allmaps...</div>
      <div class="flex flex-row w-full mt-2">
        <div class="">
          <div
            class="font-bold text-2xl w-24 text-center py-2 rounded-tl-lg border-blue border-t-2 border-l-2 hover:text-white hover:bg-blue"
            on:pointerenter={() => (editorHover = true)}
            on:pointerleave={() => {
              editorHover = false
            }}
          >
            Editor
          </div>
          <div
            class="text-center cursor-pointer px-4 py-2 rounded-bl-lg bg-purple-600 text-white"
          >
            Copy
          </div>
        </div>
        <div
          class="flex flex-col justify-center not-content grow border-blue border-2 rounded-r-lg p-2"
        >
          {#if hash}
            <div class="grow-0 break-all text-balance text-sm">
              https://<span class={editorHover ? 'bg-blue' : 'bg-blue/30'}
                >editor</span
              >.allmaps.org?url=https://annotations.allmaps.org{path}#/<span
                class="bg-yellow{hashHover ? '' : '/30'}">{hash}</span
              >
            </div>
          {:else}
            <div class="text-gray-400 italic">Load a URL</div>
          {/if}
        </div>
      </div>
      <div class="flex flex-row w-full mt-2">
        <div class="">
          <div
            class="font-bold text-2xl w-24 text-center py-2 rounded-tl-lg border-pink border-t-2 border-l-2 hover:text-white hover:bg-pink"
            on:pointerenter={() => (viewerHover = true)}
            on:pointerleave={() => {
              viewerHover = false
            }}
          >
            Viewer
          </div>
          <div
            class="text-center cursor-pointer px-4 py-2 rounded-bl-lg bg-purple-600 text-white"
          >
            Copy
          </div>
        </div>
        <div
          class="flex flex-col justify-center not-content grow border-pink border-2 rounded-r-lg p-2"
        >
          {#if hash}
            <div class="grow-0 break-all text-balance text-sm">
              https://<span class={viewerHover ? 'bg-pink' : 'bg-pink/30'}
                >viewer</span
              >.allmaps.org?url=https://annotations.allmaps.org{path}#/<span
                class="bg-yellow{hashHover ? '' : '/30'}">{hash}</span
              >
            </div>
          {:else}
            <div class="text-gray-400 italic">Load a URL</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- .sl-markdown-content :not(a, strong, em, del, span, input, code) + :not(a, strong, em, del, span, input, code, :where(.not-content *)) -->
