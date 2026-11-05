<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    color,
    href,
    label,
    external = false,
    maxWidth = 'none'
  }: {
    children: Snippet
    color: string
    href: string
    label?: string
    external?: boolean
    maxWidth?: string
  } = $props()
</script>

<a
  class="screenshot-frame relative w-full max-w-(--panel-max-width) justify-self-center overflow-hidden no-underline focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-(--accent)"
  {href}
  aria-label={label}
  rel={external ? 'external' : undefined}
  style:--accent={color}
  style:--panel-max-width={maxWidth}
>
  <div
    class="relative aspect-3/2 [&_.screenshot]:flex! [&_.screenshot]:h-full [&_.screenshot]:flex-col [&_.screenshot]:overflow-hidden! [&_.toolbar]:shrink-0 [&_.image]:min-h-0 [&_.image]:flex-1 [&_img]:h-full! [&_img]:object-cover [&_img]:object-top [&>img]:rounded-[0.625rem]"
  >
    {@render children()}
  </div>
</a>
