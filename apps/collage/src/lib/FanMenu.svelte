<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { fly } from 'svelte/transition'
  import type { Polygon } from 'phosphor-svelte'

  let {
    label,
    value,
    options,
    disabled = false,
    onselect
  }: {
    label: string
    value: string
    options: { value: string; label: string; icon: typeof Polygon }[]
    disabled?: boolean
    onselect: (value: string) => void
  } = $props()
  let open = $state(false)
  let root: HTMLDivElement
  let trigger: HTMLButtonElement
  let labelsRight = $state(false)
  const selected = $derived(
    options.find((option) => option.value === value) ?? options[0]
  )
  const Icon = $derived(selected.icon)

  function fan(node: HTMLElement, index: number) {
    if (prefersReducedMotion.current) return { duration: 0 }

    // Measure from the trigger so the fan also folds correctly on small screens
    // and when the labels switch sides.
    const origin = trigger.getBoundingClientRect()
    const destination = node.getBoundingClientRect()
    return fly(node, {
      x:
        origin.left +
        origin.width / 2 -
        destination.left -
        destination.width / 2,
      y:
        origin.top +
        origin.height / 2 -
        destination.top -
        destination.height / 2,
      duration: 240,
      delay: index * 20
    })
  }

  async function toggle() {
    labelsRight = root.getBoundingClientRect().left < 200
    open = !open
    if (open) {
      await tick()
      root.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    }
  }

  function choose(next: string) {
    open = false
    onselect(next)
    trigger.focus()
  }

  onMount(() => {
    const outside = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) open = false
    }
    const keyboard = (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        open = false
        trigger.focus()
      } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        const buttons = [
          ...root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')
        ]
        const current = buttons.indexOf(
          document.activeElement as HTMLButtonElement
        )
        const index =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (current +
                  (event.key === 'ArrowUp' ? 1 : -1) +
                  buttons.length) %
                buttons.length
        buttons[index]?.focus()
      } else if (event.key === 'Tab') open = false
    }
    const resize = () => {
      labelsRight = root.getBoundingClientRect().left < 200
    }
    window.addEventListener('resize', resize)
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('keydown', keyboard, true)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('keydown', keyboard, true)
    }
  })
</script>

<div class="fan-menu" class:labels-right={labelsRight} bind:this={root}>
  <button
    class="quiet-button"
    class:pressed={open}
    aria-label={label}
    data-tooltip={label}
    aria-haspopup="menu"
    aria-expanded={open}
    {disabled}
    bind:this={trigger}
    onclick={toggle}><Icon size={20} /></button
  >
  {#if open}
    <div
      class="fan-options"
      role="menu"
      aria-label={label}
      aria-hidden={!open}
      inert={!open}
    >
      {#each options as option, i (option.value)}
        {@const OptionIcon = option.icon}
        <button
          class="fan-option"
          class:chosen={option.value === value}
          role="menuitemradio"
          aria-checked={option.value === value}
          aria-label={option.label}
          style={`--fan-shift:${i * i * 2}px`}
          transition:fan|global={i}
          onclick={() => choose(option.value)}
          ><span class="fan-icon"><OptionIcon size={20} /></span><span
            class="fan-label">{option.label}</span
          ></button
        >
      {/each}
    </div>
  {/if}
</div>
