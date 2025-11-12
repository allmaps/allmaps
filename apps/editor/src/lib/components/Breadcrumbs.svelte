<script lang="ts">
  type Breadcrumb = {
    label: string
    href: string
  }

  type Props = {
    breadcrumbs: Breadcrumb[]
  }

  let { breadcrumbs }: Props = $props()

  let width = $state(0)
</script>

<div
  class="flex items-center gap-1 rounded-lg border-1 border-blue
  bg-blue-200/30 p-1"
  bind:clientWidth={width}
>
  {#each breadcrumbs as { label, href }, index (index)}
    {@const last = index === breadcrumbs.length - 1}
    <a
      class={[
        'truncate rounded-lg bg-blue/0 px-1 py-0.5 transition-colors',
        last ? '' : 'hover:bg-blue/70'
      ]}
      href={last ? undefined : href}>{label}</a
    >
    {#if !last}
      <span class="shrink-0 text-blue-600">/</span>
    {/if}
  {/each}
</div>
