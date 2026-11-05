<script lang="ts">
  import {
    navigationGroups,
    type NavigationGroup
  } from '$lib/data/navigation.js'

  let {
    mobile = false,
    activeGroupIndex,
    onActiveGroupChange,
    onGroupPointerLeave,
    onNavigate,
    onFocusHeading
  }: {
    mobile?: boolean
    activeGroupIndex?: number
    onActiveGroupChange?: (index: number, source: 'pointer' | 'focus') => void
    onGroupPointerLeave?: () => void
    onNavigate: () => void
    onFocusHeading?: (index: number) => void
  } = $props()

  const id = $props.id()
  let navigation: HTMLElement

  function handleLinkKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

    const columns = Array.from(
      navigation.querySelectorAll('[data-navigation-column]'),
      (column) => Array.from(column.querySelectorAll<HTMLAnchorElement>('a'))
    )
    let columnIndex = columns.findIndex((links) =>
      links.includes(event.currentTarget as HTMLAnchorElement)
    )
    if (columnIndex === -1) return
    let linkIndex = columns[columnIndex].indexOf(
      event.currentTarget as HTMLAnchorElement
    )

    switch (event.key) {
      case 'ArrowUp':
        if (linkIndex === 0 && onFocusHeading) {
          event.preventDefault()
          onFocusHeading(columnIndex)
          return
        }
        linkIndex -= 1
        break
      case 'ArrowDown':
        linkIndex += 1
        break
      case 'ArrowLeft':
        columnIndex = Math.max(0, columnIndex - 1)
        break
      case 'ArrowRight':
        columnIndex = Math.min(columns.length - 1, columnIndex + 1)
        break
      case 'Home':
        linkIndex = 0
        break
      case 'End':
        linkIndex = columns[columnIndex].length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const links = columns[columnIndex]
    links[Math.max(0, Math.min(links.length - 1, linkIndex))]?.focus()
  }
</script>

{#snippet navigationSection(group: NavigationGroup, index: number)}
  <section
    aria-labelledby={`${id}-${index}`}
    data-navigation-column={mobile ? undefined : ''}
    data-active={!mobile && activeGroupIndex === index ? '' : undefined}
    class={mobile ? undefined : 'row-span-2 grid grid-rows-subgrid'}
    onpointerenter={(event) => {
      if (event.pointerType === 'mouse') onActiveGroupChange?.(index, 'pointer')
    }}
    onpointerleave={onGroupPointerLeave}
    onfocusin={() => onActiveGroupChange?.(index, 'focus')}
  >
    <h2
      id={`${id}-${index}`}
      class={mobile ? 'mb-2 text-base font-bold text-black' : 'sr-only'}
    >
      {#if mobile}
        <a
          href={group.href}
          class="rounded-sm no-underline hover:text-pink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink"
          onclick={onNavigate}
          onkeydown={handleLinkKeydown}
        >
          {group.title}
        </a>
      {:else}
        {group.title}
      {/if}
    </h2>
    <!-- Temporarily hidden column descriptions.
    {#if !mobile}
      <p
        class={[
          'text-sm leading-5 font-semibold transition-colors duration-150 motion-reduce:transition-none',
          activeGroupIndex === index ? 'text-pink' : 'text-gray-700'
        ]}
      >
        {group.description}
      </p>
    {/if}
    -->
    <ul class="m-0 grid list-none content-start gap-1 p-0">
      {#each group.links as link (link.href)}
        <li>
          <a
            class={[
              'block rounded-sm py-2 text-sm no-underline transition-colors duration-150 hover:text-pink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink motion-reduce:transition-none',
              mobile
                ? 'flex min-h-11 items-center text-black/80'
                : activeGroupIndex === index
                  ? 'font-semibold text-black'
                  : 'text-gray-700'
            ]}
            href={link.href}
            onclick={onNavigate}
            onkeydown={handleLinkKeydown}
          >
            {link.label}
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

<nav
  bind:this={navigation}
  aria-label="Main navigation"
  class={mobile
    ? 'flex gap-4 max-[380px]:gap-3'
    : 'grid grid-cols-4 gap-x-4 gap-y-3'}
>
  {#if mobile}
    {#each [0, 1] as columnIndex (columnIndex)}
      <div data-navigation-column class="flex min-w-0 flex-1 flex-col gap-6">
        {#each navigationGroups as group, index (group.title)}
          {#if index % 2 === columnIndex}
            {@render navigationSection(group, index)}
          {/if}
        {/each}
      </div>
    {/each}
  {:else}
    {#each navigationGroups as group, index (group.title)}
      {@render navigationSection(group, index)}
    {/each}
  {/if}
</nav>
