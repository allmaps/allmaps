<script lang="ts">
  import PopupPortal from '../popup-portal.svelte'
  import type { ComponentProps } from 'svelte'

  let props: ComponentProps<typeof PopupPortal> = $props()
</script>

<PopupPortal {...props} />
