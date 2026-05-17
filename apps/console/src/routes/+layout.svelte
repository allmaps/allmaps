<script lang="ts">
  import { onNavigate } from '$app/navigation'
  import { page } from '$app/state'

  import favicon from '$lib/assets/favicon.png'

  import { Header } from '@allmaps/components'
  import { setAuthContext, UserMenu } from '@allmaps/components/auth'
  import type { AllmapsAuthClient } from '@allmaps/components/auth'

  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import { authClient } from '$lib/auth-client.js'

  import type { Snippet } from 'svelte'

  import './layout.css'
  import '@allmaps/components/css/fonts.css'

  type Props = {
    children: Snippet
  }

  type Crumb = {
    label: string
    href: string
  }

  let { children: pageChildren }: Props = $props()

  const apiBaseURL = page.data.env.PUBLIC_REST_BASE_URL

  setAuthContext({
    client: authClient as unknown as AllmapsAuthClient,
    apiBaseURL
  })

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      return
    }

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  let crumbs = $derived.by((): Crumb[] => {
    const segments = page.url.pathname.split('/').filter(Boolean)
    if (segments.length === 0) {
      return []
    }

    const d = page.data
    const result: Crumb[] = []

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const href = '/' + segments.slice(0, i + 1).join('/')
      const prev = segments[i - 1]

      let label: string
      if (seg === 'users') label = 'Users'
      else if (seg === 'organizations') label = 'Organizations'
      else if (seg === 'profile') label = 'Profile'
      else if (seg === 'lists') label = 'Lists'
      else if (seg === 'new') label = 'New'
      else if (prev === 'users')
        label = d.isCurrentUser ? 'My Profile' : (d.user?.name ?? seg)
      else if (prev === 'organizations') label = d.organization?.name ?? seg
      else if (prev === 'lists') label = d.listName ?? seg
      else label = seg

      result.push({ label, href })
    }

    return result
  })
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Allmaps Console</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 flex flex-col h-screen">
  <div class="sticky top-0 z-50 bg-white">
    <Header appName="Console">
      <div class="flex items-center justify-between w-full gap-3">
        <div class="flex items-center gap-3 font-sans text-sm">
          {#each crumbs as crumb, i (crumb.href)}
            <span class="text-gray-300 select-none">/</span>
            {#if i < crumbs.length - 1}
              <a
                href={crumb.href}
                class="text-gray-500 hover:text-gray-900 transition whitespace-nowrap"
                >{crumb.label}</a
              >
            {:else}
              <span class="text-gray-900 font-medium whitespace-nowrap"
                >{crumb.label}</span
              >
            {/if}
          {/each}
        </div>
        <UserMenu />
      </div>
    </Header>
  </div>
  <DotsPattern color="#d1d5db" opacity={0.9}>
    {@render pageChildren()}
  </DotsPattern>
</div>
