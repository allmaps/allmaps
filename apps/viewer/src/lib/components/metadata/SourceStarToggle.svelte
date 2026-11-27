<script lang="ts">
  import { onDestroy } from 'svelte'
  import { LoginDialog } from '@allmaps/ui/auth'
  import { StarToggle } from '@allmaps/ui/star-toggle'
  import * as Tooltip from '@allmaps/ui/tooltip'

  import { authClient, restBaseUrl } from '$lib/shared/auth.js'
  import type { StarredResource } from '$lib/shared/starred.js'
  import { getStarredState } from '$lib/state/starred.svelte.js'

  let { resource, label }: { resource?: StarredResource; label: string } =
    $props()

  const session = authClient.useSession()
  const starredState = getStarredState()

  let loginOpen = $state(false)
  let trigger = $state<HTMLButtonElement | null>(null)
  let feedback = $state<string>()
  let feedbackTimer: ReturnType<typeof setTimeout>

  let accountId = $derived(
    $session.data?.user?.isAnonymous ? undefined : $session.data?.user?.id
  )
  let starred = $derived(
    !!(accountId && resource && starredState.isStarred(resource))
  )
  let loading = $derived(
    !!(
      accountId &&
      resource &&
      ['idle', 'loading'].includes(starredState.status)
    )
  )
  let disabled = $derived(
    $session.isPending || loading || (!!accountId && !resource)
  )
  let title = $derived.by(() => {
    if (loading) return 'Checking Starred…'
    if (accountId && resource && starredState.status === 'error')
      return 'Could not load Starred. Click to retry.'
    if (accountId && !resource) return 'This item is unavailable in Allmaps.'
    if (starred) return `Remove ${resource?.type} from Starred`
    return label
  })

  $effect(() => {
    if (accountId && resource && starredState.status === 'idle') {
      void starredState.load()
    }
  })

  onDestroy(() => clearTimeout(feedbackTimer))

  function showFeedback(message: string) {
    clearTimeout(feedbackTimer)
    feedback = message
    feedbackTimer = setTimeout(() => (feedback = undefined), 3000)
  }

  async function handleStarredChange(
    add: boolean,
    details: { cancel: () => void }
  ) {
    if (disabled) {
      details.cancel()
      return
    }

    if (!accountId) {
      details.cancel()
      loginOpen = true
      return
    }

    if (starredState.status === 'error') {
      details.cancel()
      await starredState.load()
      if (starredState.status === 'error')
        showFeedback('Could not load Starred. Try again.')
      return
    }
    if (!resource || !starredState.list) {
      details.cancel()
      showFeedback('Your Starred list is unavailable.')
      return
    }

    feedback = undefined
    const target = resource
    const savedBy = accountId
    try {
      if (await starredState.save(resource, add)) {
        if (
          !trigger?.isConnected ||
          savedBy !== accountId ||
          resource !== target
        )
          return
        showFeedback(add ? 'Added to Starred' : 'Removed from Starred')
      }
    } catch (error) {
      if (!trigger?.isConnected || savedBy !== accountId || resource !== target)
        return
      showFeedback(
        error instanceof Error && error.name !== 'TypeError'
          ? error.message
          : 'Could not update Starred. Try again.'
      )
    }
  }
</script>

<StarToggle
  {starred}
  bind:ref={trigger}
  class="zoom-90"
  showFeedback={false}
  aria-label={label}
  aria-haspopup={accountId ? undefined : 'dialog'}
  aria-busy={$session.isPending || loading || starredState.saving || undefined}
  {disabled}
  onStarredChange={handleStarredChange}
  {title}
/>

{#if feedback}
  <Tooltip.Root open>
    <Tooltip.Content anchor={trigger ?? undefined} side="right"
      >{feedback}</Tooltip.Content
    >
  </Tooltip.Root>
{/if}
<span class="sr-only" aria-live="polite">{feedback ?? ''}</span>

{#if !accountId}
  <LoginDialog
    bind:open={loginOpen}
    apiBaseUrl={restBaseUrl}
    returnFocus={trigger}
  />
{/if}
