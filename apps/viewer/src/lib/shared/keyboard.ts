export function shouldIgnoreMapShortcut(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  return (
    !!target.closest('dialog[open], [aria-modal="true"]') ||
    (event.code === 'Space' && !!target.closest('button')) ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}
