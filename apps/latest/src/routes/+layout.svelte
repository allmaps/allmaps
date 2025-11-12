<script lang="ts">
  import type { Snippet } from 'svelte'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  type Props = {
    children?: Snippet
  }

  let { children }: Props = $props()
</script>

{@render children?.()}
