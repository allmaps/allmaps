<script lang="ts">
  import type { Snippet } from 'svelte'
  import ArrowLabel from './ArrowLabel.svelte'

  let {
    title,
    description,
    children,
    href,
    action,
    class: className = ''
  }: {
    title: string
    description: Snippet
    children: Snippet
    href: string
    action: string
    class?: string
  } = $props()
</script>

<article
  class={[
    'grid min-w-0 grid-rows-[auto_1fr_auto] gap-6 rounded-lg border border-[#121a1c]/10 bg-white p-6',
    className
  ]}
>
  <div>
    <h3 class="subsection-title m-0">{title}</h3>
    <p class="mt-3 text-base text-[#46565c]">
      {@render description()}
    </p>
  </div>
  <div
    class="min-w-0 overflow-hidden rounded-sm border border-[#bac4c8] [--allmaps-code-border-width:0px] [--allmaps-code-font-size:0.875rem] [--allmaps-code-line-height:1.6] [--allmaps-code-padding-inline:1.25rem] [&_.code-block]:scheme-light!"
  >
    {@render children()}
  </div>
  <a
    class="group inline-flex w-fit text-base font-bold text-inherit no-underline focus-visible:outline-3 focus-visible:outline-offset-5 focus-visible:outline-[#003653]"
    {href}
  >
    <ArrowLabel>{action}</ArrowLabel>
  </a>
</article>
