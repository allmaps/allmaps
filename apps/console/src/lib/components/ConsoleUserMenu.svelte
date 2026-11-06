<script lang="ts">
  import { page } from '$app/state'
  import { UserMenu } from '@allmaps/ui/auth'

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
    await authClient.signOut()
    window.location.href = page.url.href
  }
</script>

<UserMenu
  user={page.data.session?.user}
  {signInProviders}
  onSignOut={signOut}
/>
