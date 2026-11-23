<script lang="ts">
  import { page } from '$app/state'
  import { LoginMenu } from '@allmaps/ui/auth'

  import { authClient } from '$lib/auth-client.js'
  import type { LayoutData } from '../../routes/$types'

  const loginProviders: LayoutData['loginProviders'] = $derived(
    page.data.loginProviders ?? []
  )

  const signInProviders = $derived(
    loginProviders.map(({ provider, url }) => {
      const signInURL = new URL(url)
      signInURL.searchParams.set('returnTo', page.url.href)
      return { provider, url: signInURL.href }
    })
  )

  async function signOut() {
    const { error } = await authClient.signOut()
    if (error) throw new Error(error.message)
    window.location.href = page.url.href
  }
</script>

<LoginMenu
  user={page.data.session?.user}
  {signInProviders}
  onSignOut={signOut}
/>
