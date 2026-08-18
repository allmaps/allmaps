<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- breadcrumbs are built from the active route */
  import { onNavigate } from '$app/navigation'
  import { navigating, page } from '$app/state'

  import favicon from '$lib/assets/favicon.png'

  import { Header } from '@allmaps/ui'
  import { setAuthContext } from '@allmaps/ui/auth'
  import type { AllmapsAuthClient } from '@allmaps/ui/auth'

  import ConsoleUserMenu from '$lib/components/ConsoleUserMenu.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import { authClient } from '$lib/auth-client.js'

  import type { Snippet } from 'svelte'

  import './layout.css'
  import '@allmaps/ui/css/fonts.css'

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
    if (
      !document.startViewTransition ||
      document.visibilityState !== 'visible' ||
      navigation.willUnload
    ) {
      return
    }

    return new Promise<void>((resolve) => {
      try {
        const transition = document.startViewTransition(async () => {
          resolve()
          await navigation.complete
        })

        transition.ready.catch(() => {})
        transition.updateCallbackDone.catch(() => {})
        transition.finished.catch(() => {})
      } catch {
        resolve()
      }
    })
  })

  const listBreadcrumbId = $derived(
    page.route.id === '/profile/lists/[listId]' ? page.params.listId : null
  )
  const resolvedListBreadcrumbLabel = $derived(
    listBreadcrumbId
      ? page.data.list?.label || page.data.list?.name || 'List'
      : null
  )

  const organizationBreadcrumbId = $derived(
    page.route.id === '/organizations/[organizationId]'
      ? page.params.organizationId
      : null
  )
  const resolvedOrganizationBreadcrumbLabel = $derived(
    organizationBreadcrumbId
      ? page.data.organization?.name || 'Organization'
      : null
  )

  const userBreadcrumbId = $derived(
    page.route.id === '/users/[userId]' ? page.params.userId : null
  )
  const resolvedUserBreadcrumbLabel = $derived(
    userBreadcrumbId
      ? page.data.user?.name || page.data.user?.email || 'User'
      : null
  )

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
        label = d.isCurrentUser
          ? 'My Profile'
          : (resolvedUserBreadcrumbLabel ?? 'User')
      else if (prev === 'organizations')
        label = resolvedOrganizationBreadcrumbLabel ?? 'Organization'
      else if (prev === 'lists') label = resolvedListBreadcrumbLabel ?? 'List'
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
  {#if navigating.to}
    <div
      class="fixed inset-x-0 top-0 z-[60] h-0.5 animate-pulse bg-blue-600"
      role="progressbar"
      aria-label="Loading page"
    ></div>
  {/if}
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
        <ConsoleUserMenu />
      </div>
    </Header>
  </div>
  <DotsPattern color="#d1d5db" opacity={0.9}>
    {@render pageChildren()}
  </DotsPattern>
</div>
