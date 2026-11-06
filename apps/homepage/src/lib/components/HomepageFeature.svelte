<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    description: Snippet
    media: Snippet
  }

  let { title, description, media }: Props = $props()
</script>

<li
  class="m-0 grid items-center gap-6 p-0 md:grid-cols-2 md:gap-16 md:odd:[&>div:first-child]:order-2 [&>div>p:last-child]:mb-0 [&_h3]:mt-0 [&_p]:text-lg [&_p]:leading-relaxed [&_img]:m-0 [&_img]:w-full [&>a]:w-full [&>a]:justify-self-center"
>
  <div>
    <h3>{title}</h3>
    {@render description()}
  </div>
  {@render media()}
</li>
