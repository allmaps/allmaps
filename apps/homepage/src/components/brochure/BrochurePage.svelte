<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  const { children }: Props = $props()
</script>

<section>
  {@render children()}
</section>

<style scoped>
  section {
    margin: 0;
    aspect-ratio: 3 / 2;
    min-height: 0;
    /* page-break-before: always; */
    /* width: 297mm; */
    /* height: 210mm; */
    display: flex;
    justify-content: center;
    align-items: center;

    overflow: hidden;
  }
</style>
