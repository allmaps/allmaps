<script lang="ts">
  import { onMount, setContext } from 'svelte'
  import { LoginMenu, LoginDialog, type LoginUser } from '$lib/auth.js'
  import {
    fetchLoginProviders,
    loginProviderLoaderKey
  } from '$lib/auth/login-providers.js'
  import Button from '$lib/components/ui/button/button.svelte'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  let { component }: { component: 'LoginMenu' | 'LoginDialog' } = $props()
  const apiBaseUrl: string = import.meta.env.PUBLIC_REST_BASE_URL
  if (!apiBaseUrl) {
    throw new Error('Set PUBLIC_REST_BASE_URL to run the login playgrounds.')
  }

  let session = $state('My session')
  let sessionUser = $state<LoginUser | null>(null)
  let sessionError = $state('')
  const demoUser = { name: 'Alex', email: 'alex@example.org' }
  const user = $derived(
    session === 'My session'
      ? sessionUser
      : session === 'Logged in'
        ? demoUser
        : null
  )
  let open = $state(false)
  let message = $state('')

  setContext<typeof fetchLoginProviders>(
    loginProviderLoaderKey,
    async (endpoint, returnTo, signal) => {
      const providers = await fetchLoginProviders(endpoint, returnTo, signal)
      return providers.map(({ provider }) => ({
        provider,
        url: `?demo-provider=${encodeURIComponent(provider)}#playground`
      }))
    }
  )

  $effect(() => {
    if (component !== 'LoginMenu' || session !== 'My session') return
    const controller = new AbortController()
    const endpoint = new URL(
      'auth/get-session',
      apiBaseUrl.replace(/\/?$/, '/')
    )
    sessionUser = null
    sessionError = ''

    async function loadSession() {
      try {
        const response = await fetch(endpoint, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        })
        if (response.status === 401) return
        if (!response.ok) throw new Error('Session request failed')
        const result: { user?: LoginUser } | null = await response.json()
        if (!controller.signal.aborted) sessionUser = result?.user ?? null
      } catch {
        if (!controller.signal.aborted)
          sessionError = 'Could not load your Allmaps session.'
      }
    }

    void loadSession()
    return () => controller.abort()
  })

  onMount(() => {
    const url = new URL(window.location.href)
    const method = url.searchParams.get('demo-provider')
    if (!method) return
    message = `Selected ${method === 'google' ? 'Google' : method === 'github' ? 'GitHub' : method}.`
    session = 'Logged in'
    url.searchParams.delete('demo-provider')
    history.replaceState(history.state, '', url)
  })
</script>

{#snippet sessionControls()}
  <PlaygroundSelect
    label="Session"
    options={['My session', 'Logged out', 'Logged in']}
    bind:value={
      () => session,
      (value) => {
        session = value
        message = ''
      }
    }
  />
{/snippet}

<Playground controls={component === 'LoginMenu' ? sessionControls : undefined}>
  {#snippet preview()}
    <div class="grid justify-items-center gap-3">
      {#if component === 'LoginMenu'}
        <LoginMenu
          {user}
          {apiBaseUrl}
          onSignOut={() => {
            session = 'Logged out'
            message = 'Session set to Logged out.'
          }}
        />
      {:else}
        <Button onclick={() => (open = true)}>Log in</Button>
        <LoginDialog bind:open {apiBaseUrl} />
      {/if}
      {#if message || (session === 'My session' && sessionError)}
        <p role="status" class="text-sm">{message || sessionError}</p>
      {/if}
    </div>
  {/snippet}
</Playground>
