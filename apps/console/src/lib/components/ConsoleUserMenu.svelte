<script lang="ts">
  import { page } from '$app/state'
  import { UserMenu } from '@allmaps/ui/auth'

  import { authClient } from '$lib/auth-client.js'

  const signInURL = $derived(
    page.data.loginUrl
      ? `${page.data.loginUrl}?returnTo=${encodeURIComponent(page.url.href)}`
      : undefined
  )

  async function signOut() {
    await authClient.signOut()
    window.location.href = page.url.href
  }
</script>

<UserMenu user={page.data.session?.user} {signInURL} onSignOut={signOut} />
