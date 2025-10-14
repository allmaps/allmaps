<script lang="ts">
  import { FileArrowUp as FileArrowUpIcon } from 'phosphor-svelte'

  type Props = { value: string }

  let { value = $bindable() }: Props = $props()

  let files = $state<FileList>()

  async function loadFile(files: FileList): Promise<string> {
    const file = files.item(0)
    const text = await file?.text()
    return text || ''
  }

  $effect(() => {
    if (files) {
      loadFile(files).then((text) => {
        value = text || ''
      })
    }
  })
</script>

<label
  for="upload"
  class="cursor-pointer border border-white/20 rounded-sm px-1 py-1
    text-sm bg-white/10 hover:bg-white/20 transition-colors
    shadow-md
    flex items-center gap-1"
>
  <FileArrowUpIcon class="size-5" />
  <span>Upload file</span>
  <input bind:files id="upload" type="file" class="hidden" />
</label>
