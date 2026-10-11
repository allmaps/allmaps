/** Shared hover/focus labels, including controls added by the editing modes. */
export function buttonTooltips(root: HTMLElement) {
  const tooltip = document.createElement('div')
  tooltip.id = `button-tooltip-${crypto.randomUUID()}`
  tooltip.className = 'button-tooltip'
  tooltip.setAttribute('role', 'tooltip')
  tooltip.hidden = true
  // The top layer also keeps labels visible above native modal dialogs.
  const usePopover = typeof tooltip.showPopover === 'function'
  if (usePopover) tooltip.setAttribute('popover', 'manual')
  document.body.append(tooltip)

  let current: HTMLButtonElement | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function label(button: HTMLButtonElement) {
    return button.dataset.tooltip ?? button.getAttribute('aria-label') ?? ''
  }

  function buttonAt(target: EventTarget | null) {
    const button = target instanceof Element ? target.closest('button') : null
    if (
      button &&
      root.contains(button) &&
      button.getAttribute('role') !== 'menuitemradio' &&
      button.getAttribute('aria-expanded') !== 'true' &&
      !button.closest('.map-control.active') &&
      label(button)
    ) {
      return button
    }
  }

  function hide() {
    clearTimeout(timer)
    timer = undefined
    if (usePopover && tooltip.matches(':popover-open')) tooltip.hidePopover()
    tooltip.hidden = true
    if (current) {
      delete current.dataset.tooltipVisible
      const describedBy = (current.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter((id) => id && id !== tooltip.id)
        .join(' ')
      if (describedBy) current.setAttribute('aria-describedby', describedBy)
      else current.removeAttribute('aria-describedby')
    }
    current = undefined
  }

  function position() {
    if (!current) return
    const button = current.getBoundingClientRect()
    const bubble = tooltip.getBoundingClientRect()
    const margin = 8
    const above = button.top - bubble.height - margin
    const left = Math.max(
      margin,
      Math.min(
        button.left + (button.width - bubble.width) / 2,
        window.innerWidth - bubble.width - margin
      )
    )
    const top = Math.max(
      margin,
      Math.min(
        above >= margin ? above : button.bottom + margin,
        window.innerHeight - bubble.height - margin
      )
    )
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }

  function show() {
    timer = undefined
    if (!current || buttonAt(current) !== current) {
      hide()
      return
    }
    tooltip.textContent = label(current)
    tooltip.hidden = false
    if (usePopover) tooltip.showPopover()
    current.dataset.tooltipVisible = ''
    current.setAttribute(
      'aria-describedby',
      [current.getAttribute('aria-describedby'), tooltip.id]
        .filter(Boolean)
        .join(' ')
    )
    position()
  }

  function schedule(button: HTMLButtonElement | undefined, delay: number) {
    if (!button || button === current) return
    hide()
    current = button
    if (delay) timer = setTimeout(show, delay)
    else show()
  }

  function pointerOver(event: PointerEvent) {
    if (event.pointerType === 'touch' || event.buttons) return
    schedule(buttonAt(event.target), 300)
  }

  function pointerOut(event: PointerEvent) {
    if (current && !current.contains(event.relatedTarget as Node | null)) hide()
  }

  function focusIn(event: FocusEvent) {
    const button = buttonAt(event.target)
    if (button?.matches(':focus-visible')) schedule(button, 0)
  }

  function keyDown(event: KeyboardEvent) {
    // Modifier keys can change the function (for example, horizontal/vertical mirror).
    if (!['Alt', 'Control', 'Meta', 'Shift'].includes(event.key)) hide()
  }

  const observer = new MutationObserver(() => {
    if (!current) return
    if (buttonAt(current) !== current) hide()
    else if (!tooltip.hidden) {
      tooltip.textContent = label(current)
      position()
    }
  })
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-tooltip', 'aria-label', 'aria-expanded']
  })

  root.addEventListener('pointerover', pointerOver)
  root.addEventListener('pointerout', pointerOut)
  root.addEventListener('focusin', focusIn)
  root.addEventListener('focusout', hide)
  window.addEventListener('pointerdown', hide, true)
  window.addEventListener('keydown', keyDown, true)
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
  window.addEventListener('blur', hide)

  return {
    destroy() {
      hide()
      observer.disconnect()
      tooltip.remove()
      root.removeEventListener('pointerover', pointerOver)
      root.removeEventListener('pointerout', pointerOut)
      root.removeEventListener('focusin', focusIn)
      root.removeEventListener('focusout', hide)
      window.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('keydown', keyDown, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      window.removeEventListener('blur', hide)
    }
  }
}
