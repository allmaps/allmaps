<script lang="ts">
  import Copy from '$lib/components/CopyButton.svelte'

  import { highlight } from '$lib/shared/highlight.js'

  type Props = {
    value: string
    lang: 'json' | 'javascript' | 'bash'
  }

  let { value, lang }: Props = $props()
</script>

<div class="relative overflow-auto rounded-md">
  <div class="contents *:overflow-auto *:p-2 *:break-all *:whitespace-pre-wrap">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html highlight(value, lang)}
  </div>
  <div class="absolute top-0 right-0 p-2">
    <Copy {value} />
  </div>
</div>
