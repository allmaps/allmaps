export type ContentPageHero = {
  title: string
  palette?:
    | 'all'
    | 'blue'
    | 'darkblue'
    | 'purple'
    | 'orange'
    | 'red'
    | 'pink'
    | 'green'
    | 'yellow'
}

export type ContentPageMetadata = {
  title: string
  description?: string
  label: string
  hero?: ContentPageHero
}

export type ContentPageModule = {
  metadata: Partial<ContentPageMetadata>
}

export function normalizeContentPageMetadata(
  module: ContentPageModule
): ContentPageMetadata {
  const { title, description, label, hero } = module.metadata

  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Missing content page title')
  }

  if (typeof label !== 'string' || !label.trim()) {
    throw new Error('Missing content page label')
  }

  return {
    title: title.trim(),
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : undefined,
    label: label.trim(),
    hero
  }
}
