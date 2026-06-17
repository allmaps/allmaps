<script lang="ts">
  import { generateId } from '@allmaps/id'

  type Props = {
    regexPattern: string
    testUrl: string
    manifestTemplate: string
  }

  const { regexPattern, testUrl, manifestTemplate }: Props = $props()

  let url = $state<string>()
  let manifestId = $state<string>()
  let editorUrl = $state<string>()
  let viewerUrl = $state<string>()
  let annotationUrl = $state<string>()
  let allmapsId = $state<string>()

  let regex = new RegExp(regexPattern)
  let id = $derived(url ? url.match(regex) : null)

  $effect(() => {
    if (id) {
      manifestId = manifestTemplate.replace('{id}', id[1])
      editorUrl = `https://editor.allmaps.org/#/collection?url=${encodeURIComponent(
        manifestId
      )}`
      checkForAnnotation(manifestId)
    }
  })

  async function checkForAnnotation(manifestId: string) {
    allmapsId = await generateId(manifestId)
    annotationUrl = `https://annotations.allmaps.org/manifests/${allmapsId}`
    let response = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    if (!response.error) {
      viewerUrl = `https://viewer.allmaps.org/?url=${encodeURIComponent(
        annotationUrl
      )}`
    } else {
      viewerUrl = undefined
    }
  }

  function doTest() {
    url = testUrl
  }
</script>

<div>
  <p>
    <input
      class="border-1 border-gray rounded"
      placeholder="Enter URL"
      bind:value={url}
    />
  </p>
  {#if id}
    <ul>
      <li><a target="_blank" href={manifestId}>Open IIIF Manifest</a></li>
      <li>
        <a target="_blank" href={editorUrl}>Open in Allmaps Editor</a>
      </li>
      {#if viewerUrl}
        <li>
          <a target="_blank" href={viewerUrl}>Open in Allmaps Viewer</a>
        </li>
        <li>
          <a target="_blank" href={annotationUrl}
            >Open Georeference Annotation</a
          >
        </li>
      {/if}
    </ul>
  {:else}
    <p>
      <i
        >Please enter a valid URL, e.g. <button
          class="cursor-pointer underline"
          onclick={doTest}>{testUrl}</button
        ></i
      >
    </p>
  {/if}
</div>

<style>
  input {
    width: 100%;
  }
</style>
