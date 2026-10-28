<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import { validateScreenshotGeometry } from '@allmaps/ui/screenshots'
  import { editorSettingsScreenshot } from '../screenshots/editor-settings.js'
  import capturedGeometry from '../images/screenshots/editor-display-settings.geometry.json'

  let { src }: { src: string } = $props()
  const geometry = validateScreenshotGeometry(capturedGeometry)
</script>

<Screenshot
  {...editorSettingsScreenshot}
  {src}
  {geometry}
  shadow
  highlights={['settings']}
  alt="Allmaps Editor showing a historical map of Delfland and a reference map with four numbered ground control points, with the open display settings panel outlined in pink."
>
  {#snippet highlight({ bounds })}
    {@const padding = 20}
    <rect
      x={bounds.x - padding}
      y={bounds.y - padding}
      width={bounds.width + padding * 2}
      height={bounds.height + padding * 2}
      rx="20"
      class="fill-none stroke-pink-500 stroke-[3]"
      vector-effect="non-scaling-stroke"
    />
  {/snippet}
</Screenshot>
