<script lang="ts">
  import { page } from '$app/state'

  import Error from '$lib/components/errors/Error.svelte'
  import {
    getSourceLoadErrorCode,
    getSourceLoadErrorTitle
  } from '$lib/shared/source-errors.js'
  import { formatValidationIssuesFromMessage } from '$lib/shared/validation-error.js'

  let errorMessage = $derived(
    page.error?.message || 'The source could not be loaded.'
  )
  let urlParam = $derived(page.url.searchParams.get('url'))
  let validationIssues = $derived(
    formatValidationIssuesFromMessage(errorMessage)
  )
  let sourceLoadErrorCode = $derived(
    page.error?.code ?? getSourceLoadErrorCode(errorMessage)
  )
  let title = $derived(
    page.error?.title ??
      getSourceLoadErrorTitle(errorMessage) ??
      'Could not load this Georeference Annotation'
  )
  let details = $derived(
    page.error?.details ??
      (validationIssues.length > 0
        ? JSON.stringify(validationIssues, null, 2)
        : undefined)
  )
</script>

<svelte:head>
  <title>Could not load resource | Allmaps Viewer</title>
</svelte:head>

<Error
  {title}
  message={validationIssues.length > 0
    ? 'The source was reached, but Allmaps Viewer could not parse it as a valid Georeference Annotation.'
    : errorMessage}
  secondaryMessage={page.error?.details}
  sourceUrl={urlParam}
  {sourceLoadErrorCode}
  {validationIssues}
  {details}
  annotationInputInitialValue=""
  annotationInputAutoFocus
/>
