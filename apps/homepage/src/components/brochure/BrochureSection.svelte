<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    colorClasses: string
  }

  const { children, colorClasses }: Props = $props()
</script>

<section class="m-0 min-h-0 justify-center items-start max-w-7xl mx-auto p-4">
  <div class={[colorClasses, 'p-4 md:p-8 rounded-xl']}>
    {@render children()}
  </div>
</section>
