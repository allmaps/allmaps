<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    id?: string
    title: string
    description: Snippet
    media: Snippet
    class?: string
  }

  let { id, title, description, media, class: className = '' }: Props = $props()
</script>

<li
  {id}
  class={[
    'm-0 grid items-center gap-6 p-0 max-md:rounded-xl max-md:bg-[color-mix(in_srgb,var(--feature-color)_10%,white)] max-md:p-6 md:grid-cols-2 md:gap-16 md:odd:[&>div:first-child]:order-2 max-md:[&>div_h3]:text-(--feature-color) max-md:[&>div_a]:text-(--feature-color) max-md:[&>a]:bg-transparent max-md:[&>a]:p-0 [&>div>p:last-child]:mb-0 [&_h3]:mt-0 [&_p]:text-lg [&_p]:leading-relaxed [&_img]:m-0 [&_img]:w-full [&>a]:w-full [&>a]:justify-self-center',
    className
  ]}
>
  <div>
    <h3 class="mt-0!">{title}</h3>
    {@render description()}
  </div>
  {@render media()}
</li>
