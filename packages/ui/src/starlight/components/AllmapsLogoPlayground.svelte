<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  export function formatUsage(inverted = false) {
    return svelteExample(
      ["import { AllmapsLogo } from '@allmaps/ui'"],
      inverted ? '<AllmapsLogo inverted />' : '<AllmapsLogo />'
    )
  }
</script>

<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import AllmapsLogo from '$lib/components/AllmapsLogo.svelte'
  import Playground from './Playground.svelte'

  let inverted = $state(false)
</script>

<Playground usage={formatUsage(inverted)}>
  {#snippet preview()}
    <AllmapsLogo {inverted} />
  {/snippet}
  {#snippet controls()}
    <Checkbox bind:checked={inverted}>Inverted</Checkbox>
  {/snippet}
</Playground>
