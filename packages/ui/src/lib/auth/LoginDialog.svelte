<script lang="ts">
  import GithubLogo from 'phosphor-svelte/lib/GithubLogoIcon'
  import GoogleLogo from 'phosphor-svelte/lib/GoogleLogoIcon'
  import AllmapsLogo from '../components/AllmapsLogo.svelte'
  import * as Dialog from '../dialog.js'
  import Button from '../components/ui/button/button.svelte'
  import { fetchLoginProviders } from './login-providers.js'
  import type { SignInProvider } from './types.js'

  let {
    open = $bindable(false),
    apiBaseUrl = 'https://api.allmaps.org',
    signInProviders,
    signInURL,
    returnFocus
  }: {
    open?: boolean
    apiBaseUrl?: string
    signInProviders?: SignInProvider[]
    signInURL?: string
    returnFocus?: HTMLElement | null
  } = $props()
  let discovered = $state<SignInProvider[]>()
  let loadFailed = $state(false)
  let providers = $derived(signInProviders ?? discovered ?? [])
  let loading = $derived(
    !signInProviders && !signInURL && !discovered && !loadFailed
  )

  $effect(() => {
    discovered = undefined
    loadFailed = false
    if (!open || signInProviders !== undefined || signInURL) return

    const controller = new AbortController()
    fetchLoginProviders(apiBaseUrl, window.location.href, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) discovered = result
      })
      .catch(() => {
        if (!controller.signal.aborted) loadFailed = true
      })
    return () => controller.abort()
  })
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="max-h-[calc(100dvh-2rem)] overflow-y-auto font-allmaps-ui sm:max-w-sm"
    onCloseAutoFocus={(event) => {
      if (returnFocus?.isConnected) {
        event.preventDefault()
        returnFocus.focus()
      }
    }}
  >
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 pe-6">
        <AllmapsLogo alt="" class="size-8 shrink-0" />
        Log in to Allmaps
      </Dialog.Title>
      <Dialog.Description aria-live="polite">
        {#if loading}Loading login methods…
        {:else if loadFailed}Could not load login methods. Close and reopen to
          try again.
        {:else if providers.length || signInURL}Choose how you want to log in.
        {:else}No login methods are available.{/if}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-3">
      {#each providers as { provider, url } (provider)}
        <Button href={url}>
          {#snippet icon()}
            {#if provider === 'google'}<GoogleLogo class="size-5" />
            {:else if provider === 'github'}<GithubLogo class="size-5" />{/if}
          {/snippet}
          Continue with {provider === 'google'
            ? 'Google'
            : provider === 'github'
              ? 'GitHub'
              : provider}
        </Button>
      {:else}
        {#if signInURL}
          <Button href={signInURL}>Continue to log in</Button>
        {/if}
      {/each}
    </div>
  </Dialog.Content>
</Dialog.Root>
