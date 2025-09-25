<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte'

  import { Modal } from '@allmaps/components'

  const uitState = getUiState()
</script>

<Modal bind:open={uitState.modalsVisible.export}>
  {#snippet title()}
    Export
  {/snippet}

  <div>Georeference Annotation</div>

  <div>XYZ tile layer</div>

  <div>GeoJSON</div>

  <div>Web mapping libraries</div>

  <div>GeoTIFF</div>
</Modal>
