<script lang="ts">
  import { List as ListIcon } from 'phosphor-svelte'

  import ControlContainer from '$lib/components/ControlContainer.svelte'
</script>

<ControlContainer>
  <button
    class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
  >
    <ListIcon class="size-5" weight="bold" />
  </button>
</ControlContainer>
