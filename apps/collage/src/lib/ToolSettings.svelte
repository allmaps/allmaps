<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { flip } from 'svelte/animate'
  import { prefersReducedMotion } from 'svelte/motion'
  import { DotsSixVertical, X } from 'phosphor-svelte'
  import ToolIcon from './ToolIcon.svelte'
  import { defaultToolSettings, toolLabels, reorderTool } from './tool-settings'
  import type { ToolSetting } from './tool-settings'
  import type { Control } from './control-layout'
  import type { ImportTransformation } from './model'
  let {
    settings,
    importTransformation,
    onchange,
    onimportchange,
    onclose
  }: {
    settings: ToolSetting[]
    importTransformation: ImportTransformation
    onchange: (settings: ToolSetting[]) => void
    onimportchange: (value: ImportTransformation) => void
    onclose: () => void
  } = $props()
  let list: HTMLOListElement
  let scroll: HTMLDivElement
  let dialog: HTMLDialogElement
  let dragging = $state<Control>()
  let gesture:
    | {
        tool: Control
        pointer: number
        startY: number
        y: number
        before: ToolSetting[]
      }
    | undefined
  let frame: number | undefined

  function reorderAtPointer() {
    if (!gesture || !dragging) return
    const rows = [...list.querySelectorAll<HTMLElement>('[data-tool]')].filter(
      (row) => row.dataset.tool !== gesture!.tool
    )
    const index = rows.filter(
      (row) =>
        gesture!.y > row.getBoundingClientRect().top + row.offsetHeight / 2
    ).length
    if (settings[index]?.tool !== gesture.tool)
      onchange(reorderTool(settings, gesture.tool, index))
  }
  function autoScroll() {
    if (!gesture || !dragging) return
    const rect = scroll.getBoundingClientRect()
    const amount =
      gesture.y < rect.top + 32 ? -6 : gesture.y > rect.bottom - 32 ? 6 : 0
    if (amount) {
      scroll.scrollTop += amount
      reorderAtPointer()
    }
    frame = requestAnimationFrame(autoScroll)
  }
  function start(event: PointerEvent, tool: Control) {
    if (event.button !== 0 || gesture) return
    // On touchscreens, leave labels available for scrolling; drag the grip.
    if (
      event.pointerType === 'touch' &&
      !(event.target as Element).closest('.tool-grip')
    )
      return
    event.preventDefault()
    ;(event.currentTarget as HTMLElement).focus({ preventScroll: true })
    gesture = {
      tool,
      pointer: event.pointerId,
      startY: event.clientY,
      y: event.clientY,
      before: [...settings]
    }
    dialog.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer) return
    gesture.y = event.clientY
    if (!dragging && Math.abs(gesture.y - gesture.startY) > 4) {
      dragging = gesture.tool
      frame = requestAnimationFrame(autoScroll)
    }
    if (dragging) {
      event.preventDefault()
      reorderAtPointer()
    }
  }
  function finish(event?: PointerEvent, cancel = false) {
    if (!gesture || (event && event.pointerId !== gesture.pointer)) return
    if (cancel) onchange(gesture.before)
    if (dialog.hasPointerCapture(gesture.pointer))
      dialog.releasePointerCapture(gesture.pointer)
    gesture = undefined
    dragging = undefined
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }
  function reorderKey(event: KeyboardEvent, tool: Control) {
    const index = settings.findIndex((entry) => entry.tool === tool)
    const next =
      event.key === 'ArrowUp'
        ? index - 1
        : event.key === 'ArrowDown'
          ? index + 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? settings.length - 1
              : undefined
    if (next === undefined) return
    event.preventDefault()
    event.stopPropagation()
    onchange(reorderTool(settings, tool, next))
    void tick().then(() =>
      list
        .querySelector<HTMLButtonElement>(`[data-tool="${tool}"] button`)
        ?.focus({ preventScroll: true })
    )
  }
  function close() {
    finish(undefined, true)
    onclose()
  }
  function showDialog(node: HTMLDialogElement) {
    node.showModal()
    let startedOutside = false
    const outside = (event: PointerEvent) => {
      const r = node.getBoundingClientRect()
      return (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
    }
    const down = (event: PointerEvent) => {
      startedOutside = outside(event)
    }
    const up = (event: PointerEvent) => {
      if (startedOutside && outside(event)) close()
      startedOutside = false
    }
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointerup', up)
    return {
      destroy() {
        node.removeEventListener('pointerdown', down)
        node.removeEventListener('pointerup', up)
        node.close()
      }
    }
  }
  onDestroy(() => {
    if (frame !== undefined) cancelAnimationFrame(frame)
  })
</script>

<svelte:window
  onpointermove={move}
  onpointerup={(event) => finish(event)}
  onpointercancel={(event) => finish(event, true)}
  onblur={() => finish(undefined, true)}
/>
<div class="modal-backdrop">
  <dialog
    class="input-dialog tools-dialog"
    bind:this={dialog}
    use:showDialog
    aria-labelledby="settings-title"
    oncancel={(event) => {
      event.preventDefault()
      if (gesture) finish(undefined, true)
      else close()
    }}
  >
    <button class="close-dialog" aria-label="Close" onclick={close}
      ><X size={22} /></button
    >
    <h2 id="settings-title">Settings</h2>
    <div class="settings-scroll" bind:this={scroll}>
      <h3 id="tools-title">Tools</h3>
      <ol class="tool-settings" aria-labelledby="tools-title" bind:this={list}>
        {#each settings as entry (entry.tool)}
          <li
            data-tool={entry.tool}
            class:reordering={dragging === entry.tool}
            animate:flip={{ duration: prefersReducedMotion.current ? 0 : 120 }}
          >
            <button
              class="tool-drag-handle"
              aria-label={'Reorder ' + toolLabels[entry.tool]}
              aria-keyshortcuts="ArrowUp ArrowDown Home End"
              onpointerdown={(event) => start(event, entry.tool)}
              onkeydown={(event) => reorderKey(event, entry.tool)}
            >
              <span class="tool-grip"><DotsSixVertical size={16} /></span
              ><ToolIcon tool={entry.tool} /><span
                >{toolLabels[entry.tool]}</span
              >
            </button>
            <input
              type="checkbox"
              aria-label={toolLabels[entry.tool]}
              checked={entry.enabled}
              onchange={(event) =>
                onchange(
                  settings.map((setting) =>
                    setting.tool === entry.tool
                      ? { ...setting, enabled: event.currentTarget.checked }
                      : setting
                  )
                )}
            />
          </li>
        {/each}
      </ol>
      <div class="import-setting">
        <label for="import-transformation">Import maps as</label>
        <select
          id="import-transformation"
          value={importTransformation}
          onchange={(event) =>
            onimportchange(
              event.currentTarget.value === 'polynomial'
                ? 'polynomial'
                : 'helmert'
            )}
        >
          <option value="helmert">Helmert</option><option value="polynomial"
            >Polynomial</option
          >
        </select>
      </div>
    </div>
    <div class="export-actions">
      <button
        class="quiet-button"
        onclick={() => {
          onchange(defaultToolSettings())
          onimportchange('helmert')
        }}>Reset</button
      >
      <button class="primary-button" onclick={close}>Done</button>
    </div>
  </dialog>
</div>
