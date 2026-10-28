<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { validateScreenshotGeometry } from '@allmaps/ui/screenshots'
  import { editorExportScreenshot } from '../screenshots/editor-export.js'
  import capturedGeometry from '../images/screenshots/editor-export-version.geometry.json'

  let { src }: { src: string } = $props()
  const geometry = validateScreenshotGeometry(capturedGeometry)
</script>

<Screenshot
  {...editorExportScreenshot}
  {src}
  {geometry}
  shadow
  highlights={['export']}
  alt="Allmaps Editor’s Results tab showing the BnF map of Saigon over a modern basemap, with the export panel outlined in pink and Current version selected."
>
  {#snippet highlight({ bounds })}
    {@const padding = 20}
    {@const x = Math.max(2, bounds.x - padding)}
    {@const y = Math.max(2, bounds.y - padding)}
    <rect
      {x}
      {y}
      width={Math.min(
        geometry.viewport.width - 2,
        bounds.x + bounds.width + padding
      ) - x}
      height={Math.min(
        geometry.viewport.height - 2,
        bounds.y + bounds.height + padding
      ) - y}
      rx="20"
      class="fill-none stroke-pink-500 stroke-[3]"
      vector-effect="non-scaling-stroke"
    />
  {/snippet}
</Screenshot>
