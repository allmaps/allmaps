<script lang="ts">
  import { generateId } from '@allmaps/id'
  export let regexPattern: string
  export let testUrl: string
  export let manifestTemplate: string

  let url: string | null = null
  let manifestId: string = ''
  let editorUrl: string = ''
  let viewerUrl: string | null = null
  let annotationUrl: string | null = null
  let allmapsId: string | null = null

  let regex = new RegExp(regexPattern)
  $: id = url ? url.match(regex) : null

  $: if (id) {
    manifestId = manifestTemplate.replace("{id}", id[1])
    editorUrl = `https://editor.allmaps.org/#/collection?url=${encodeURIComponent(
      manifestId
    )}`
    checkForAnnotation(manifestId)
  }

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
      viewerUrl = null
    }
  }

  function doTest () {
    url = testUrl
  }
</script>

<div>
  <p><input placeholder="Enter URL" bind:value={url} /></p>
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
    <p><i>Please enter a valid URL, e.g. <a href="#" on:click={doTest}>{testUrl}</a></i></p>
  {/if}
</div>

<style>
  input {
    width: 100%;
  }
</style>
