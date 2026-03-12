import annotations from '$lib/content/annotations.yml'

import type { AnnotationObject } from '$lib/components/AnnotationSelector.svelte'

export function load() {
  return {
    annotationObjects: annotations as AnnotationObject[]
  }
}
