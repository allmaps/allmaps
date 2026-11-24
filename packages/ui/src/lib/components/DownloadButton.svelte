<script lang="ts">
  import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import CodeAction from './CodeAction.svelte'

  let {
    text,
    filename,
    ondownload,
    ...attributes
  }: Omit<
    HTMLButtonAttributes,
    'children' | 'onclick' | 'type' | 'ondownload'
  > &
    (
      | { text: string; filename: string; ondownload?: () => void }
      | { ondownload: () => void; text?: string; filename?: string }
    ) = $props()

  function download() {
    if (ondownload) return ondownload()
    if (text === undefined || !filename) return
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/plain;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
</script>

<CodeAction
  {...attributes}
  label={filename ? `Download ${filename}` : 'Download file'}
  onclick={download}
>
  <DownloadSimpleIcon class="size-4" aria-hidden="true" />
</CodeAction>
