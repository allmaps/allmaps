<script lang="ts">
  import { onMount } from 'svelte'
  import { LoginMenu, LoginDialog, type SignInProvider } from '$lib/auth.js'
  import Button from '$lib/components/ui/button/button.svelte'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  let { component }: { component: 'LoginMenu' | 'LoginDialog' } = $props()
  let session = $state('Logged out')
  let open = $state(false)
  let message = $state('')

  const signInProviders: SignInProvider[] = [
    { provider: 'google', url: '?demo-provider=google#playground' },
    { provider: 'github', url: '?demo-provider=github#playground' }
  ]
  onMount(() => {
    const url = new URL(window.location.href)
    const method = url.searchParams.get('demo-provider')
    if (!signInProviders.some(({ provider }) => provider === method)) return
    message = `Selected ${method === 'google' ? 'Google' : 'GitHub'} in the demo.`
    session = 'Logged in'
    url.searchParams.delete('demo-provider')
    history.replaceState(history.state, '', url)
  })
</script>

{#snippet sessionControls()}
  <PlaygroundSelect
    label="Session"
    options={['Logged out', 'Logged in']}
    bind:value={session}
  />
{/snippet}

<Playground controls={component === 'LoginMenu' ? sessionControls : undefined}>
  {#snippet preview()}
    <div class="grid justify-items-center gap-3">
      {#if component === 'LoginMenu'}
        <LoginMenu
          user={session === 'Logged in'
            ? { name: 'Alex', email: 'alex@example.org' }
            : null}
          {signInProviders}
          onSignOut={() => {
            session = 'Logged out'
            message = 'Logged out of the demo.'
          }}
        />
      {:else}
        <Button onclick={() => (open = true)}>Log in</Button>
        <LoginDialog bind:open {signInProviders} />
      {/if}
      {#if message}<p role="status" class="text-sm">{message}</p>{/if}
    </div>
  {/snippet}
</Playground>
