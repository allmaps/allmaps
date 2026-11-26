export type ListDialogItem = {
  id: string
  label: string
  detail?: string
  href: string
  thumbnail?: {
    imageInfo?: unknown
    loadImageInfo?: (signal: AbortSignal) => Promise<unknown>
  }
}

export type ListDialogState =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; items: ListDialogItem[]; openAllHref?: string }
