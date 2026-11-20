import { env } from '$env/dynamic/public'

function publicUrl(name: `PUBLIC_${string}`) {
  const value = env[name]
  if (!value) throw new Error('Missing Open in Allmaps configuration: ' + name)
  return new URL(value).href
}

export function openConfig() {
  return {
    restBaseUrl: publicUrl('PUBLIC_REST_BASE_URL'),
    annotationsBaseUrl: publicUrl('PUBLIC_ANNOTATIONS_BASE_URL'),
    viewerBaseUrl: publicUrl('PUBLIC_VIEWER_BASE_URL'),
    editorBaseUrl: publicUrl('PUBLIC_EDITOR_BASE_URL'),
    docsUrl: new URL(
      '/guides/open-in-allmaps',
      publicUrl('PUBLIC_DOCS_BASE_URL')
    ).href
  }
}
