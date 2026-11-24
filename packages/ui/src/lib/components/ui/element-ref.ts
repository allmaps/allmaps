import type { Attachment } from 'svelte/attachments'

export function elementRef<T extends HTMLElement>(
  get: () => T | null,
  set: (element: T | null) => void
): Attachment<T> {
  return (element) => {
    set(element)
    return () => {
      if (get() === element) set(null)
    }
  }
}
