<script lang="ts">
  import { onMount } from 'svelte'
  import { green } from '@allmaps/tailwind'

  const { baseUrl }: { baseUrl: string } = $props()
  const normalizedBaseUrl = $derived(`${baseUrl.replace(/\/$/, '')}/`)
  const sizes = $state<Record<string, number>>({})
  const files = [
    {
      filename: 'annotations.json',
      format: 'Georeference Annotations',
      description:
        'Use maps with Allmaps libraries and other tools that understand the IIIF Georeference Extension. An AnnotationPage containing the annotations.'
    },
    {
      filename: 'maps-flattened.geojson',
      format: 'GeoJSON with flat properties',
      description:
        'Explore map footprints in GIS software. Includes identifiers and selected properties in a simple table, without the full georeference data.'
    },
    {
      filename: 'maps.geojson',
      format: 'GeoJSON',
      description:
        'Build spatial indexes and analyze map coverage. A FeatureCollection of geographic footprints with the full map data in nested properties.'
    },
    {
      filename: 'maps.geojsonl',
      format: 'Newline-delimited GeoJSON',
      description:
        'Process the same geographic features one at a time, with one feature per line.'
    },
    {
      filename: 'maps.json',
      format: 'JSON',
      description:
        'Work with the Allmaps map records in your own code. A JSON array containing control points, masks and IIIF resource links.'
    },
    {
      filename: 'maps.ndjson',
      format: 'Newline-delimited JSON',
      description:
        'Stream map records through scripts and data pipelines, with one record per line.'
    }
  ]

  onMount(() => {
    const controller = new AbortController()
    void loadFileSizes(controller.signal)
    return () => controller.abort()
  })

  async function loadFileSizes(signal: AbortSignal) {
    try {
      const response = await fetch(`${normalizedBaseUrl}files.json`, {
        signal
      })
      if (!response.ok) return
      const manifest: unknown = await response.json()
      if (!manifest || typeof manifest !== 'object' || !('files' in manifest)) {
        return
      }
      if (!Array.isArray(manifest.files)) return
      for (const file of manifest.files) {
        if (
          file &&
          typeof file.filename === 'string' &&
          typeof file.size === 'number' &&
          Number.isFinite(file.size) &&
          file.size > 0
        ) {
          sizes[file.filename] = file.size
        }
      }
    } catch {
      // File sizes are optional; downloads remain available if loading fails.
    }
  }

  function formatSize(size: number | undefined) {
    if (!size) return '—'
    return size >= 1e9
      ? `${(size / 1e9).toFixed(1)} GB`
      : `${Math.round(size / 1e6)} MB`
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable table region needs keyboard access.) -->
<div
  class="mt-8 max-w-full overflow-x-auto focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--accent)"
  style:--accent={green}
  role="region"
  aria-label="Open data downloads"
  tabindex="0"
>
  <table
    class="w-full sm:min-w-[38rem] border-collapse text-left text-base [&_th]:border-b [&_th]:border-[color-mix(in_srgb,var(--accent)_25%,white)] [&_th]:px-2 sm:[&_th]:px-4 [&_th]:py-5 [&_th]:align-top [&_td]:border-b [&_td]:border-[color-mix(in_srgb,var(--accent)_25%,white)] [&_td]:px-2 sm:[&_td]:px-4 [&_td]:py-5 [&_td]:align-top [&_thead_th]:bg-[color-mix(in_srgb,var(--accent)_12%,white)] [&_thead_th]:py-3 [&_thead_th]:font-bold sm:[&_tbody_th]:w-[30%] [&_tbody_th]:font-normal"
  >
    <thead>
      <tr>
        <th scope="col">Download</th>
        <th scope="col" class="hidden sm:table-cell">Use it for</th>
        <th scope="col" class="text-right whitespace-nowrap tabular-nums"
          >Size</th
        >
      </tr>
    </thead>
    <tbody>
      {#each files as file (file.filename)}
        <tr>
          <th scope="row">
            <a
              class="text-[color-mix(in_srgb,var(--accent)_65%,#121a1c)] underline underline-offset-3 hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-(--accent)"
              href={`${normalizedBaseUrl}${file.filename}`}
              download
              ><code class="font-mono text-sm [overflow-wrap:anywhere]"
                >{file.filename}</code
              ></a
            >
            <span class="mt-1.5 block text-sm text-[#505b5e]"
              >{file.format}</span
            >
          </th>
          <td class="hidden sm:table-cell">{file.description}</td>
          <td class="text-right whitespace-nowrap tabular-nums"
            >{formatSize(sizes[file.filename])}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</div>
