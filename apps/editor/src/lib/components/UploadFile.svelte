<script lang="ts">
  import { FileArrowUpIcon } from 'phosphor-svelte'
  import { m } from '$lib/paraglide/messages.js'

  type Props = { value: string }

  let {
    // eslint-disable-next-line no-useless-assignment
    value = $bindable()
  }: Props = $props()

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
  class="flex cursor-pointer items-center gap-1 rounded-sm border
    border-white/20 bg-white/10 px-1 py-1
    text-sm
    shadow-md transition-colors hover:bg-white/20"
>
  <FileArrowUpIcon class="size-5" />
  <span>{m.upload_file()}</span>
  <input bind:files id="upload" type="file" class="hidden" />
</label>
