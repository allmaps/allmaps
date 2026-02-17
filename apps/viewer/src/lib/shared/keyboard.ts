export function hasInputTarget(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}
