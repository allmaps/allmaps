<script lang="ts">
  import Copy from '$lib/components/CopyButton.svelte'

  import { highlight } from '$lib/shared/highlight.js'

  type Props = {
    value: string
    lang: 'json' | 'javascript' | 'bash'
  }

  let { value, lang }: Props = $props()
</script>

<div class="relative rounded-md overflow-auto">
  <div class="contents *:overflow-auto *:p-2 *:whitespace-pre-wrap *:break-all">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html highlight(value, lang)}
  </div>
  <div class="absolute top-0 right-0 p-2">
    <Copy {value} />
  </div>
</div>
