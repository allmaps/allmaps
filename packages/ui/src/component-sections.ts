import type { CollectionEntry } from 'astro:content'

type Sections = NonNullable<CollectionEntry<'docs'>['data']['sections']>

function heading(text: string, depth: number) {
  return { text, depth, slug: text.toLowerCase().replaceAll(' ', '-') }
}

export function getComponentSections(sections: Sections) {
  return sections.map((section) => ({
    ...heading(typeof section === 'string' ? section : section.title, 2),
    children:
      typeof section === 'string'
        ? []
        : section.children.map((title) => ({
            ...heading(title, 3),
            children: []
          }))
  }))
}
