<script lang="ts">
  import { onMount } from 'svelte'

  type Props = {
    baseUrl: string
  }

  type FilesManifest = {
    files: {
      filename: string
      size: number
    }[]
  }

  const { baseUrl }: Props = $props()

  const files = $state([
    {
      filename: 'annotations.json',
      type: 'Georeference Annotations',
      typeUrl: 'https://iiif.io/api/extension/georef/',
      size: 0
    },
    {
      filename: 'maps.json',
      type: 'JSON',
      size: 0
    },
    {
      filename: 'maps.ndjson',
      type: 'Newline-delimited JSON',
      size: 0
    },
    {
      filename: 'maps.geojson',
      type: 'GeoJSON',
      size: 0
    },
    {
      filename: 'maps.geojsonl',
      type: 'Newline-delimited GeoJSON',
      typeUrl: 'https://stevage.github.io/ndgeojson/',
      size: 0
    }
  ])

  onMount(() => {
    void loadFileSizes()
  })

  async function loadFileSizes() {
    const response = await fetch(`${baseUrl}files.json`).catch(() => undefined)

    if (!response?.ok) {
      return
    }

    const filesManifest = (await response.json()) as FilesManifest
    const fileSizes = new Map(
      filesManifest.files.map((file) => [file.filename, file.size])
    )

    files.forEach((file, index) => {
      files[index].size = fileSizes.get(file.filename) ?? 0
    })
  }

  function formatSize(size: number) {
    return size ? `${Math.round(size / 1024 / 1024)} MB` : ''
  }
</script>

<table class="!table w-full">
  <thead>
    <tr>
      <th class="text-left">File</th>
      <th class="text-left">Type</th>
      <th class="!text-right">Size</th>
    </tr>
  </thead>
  <tbody>
    {#each files as file}
      <tr>
        <td>
          <a href={`${baseUrl}${file.filename}`}>
            <code>{file.filename}</code>
          </a>
        </td>
        <td
          >{#if file.typeUrl}
            <a href={file.typeUrl}>{file.type}</a>
          {:else}
            {file.type}
          {/if}
        </td>
        <td class="text-right">{formatSize(file.size)}</td>
      </tr>
    {/each}
  </tbody>
</table>
