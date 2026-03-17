import annotations from '$lib/content/annotations.yml'
import projections from '$lib/content/projections.yml'

import type { AnnotationObject } from '$lib/components/AnnotationSelector.svelte'
import type { Projection } from '@allmaps/project'

export function load() {
  return {
    annotationObjects: annotations as AnnotationObject[],
    extraProjections: projections as Projection[]
  }
}
