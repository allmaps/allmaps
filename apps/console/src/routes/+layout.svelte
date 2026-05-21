<script lang="ts">
  import { onNavigate } from '$app/navigation'
  import { page } from '$app/state'

  import favicon from '$lib/assets/favicon.png'

  import { Header } from '@allmaps/components'
  import { setAuthContext } from '@allmaps/components/auth'
  import type { AllmapsAuthClient } from '@allmaps/components/auth'

  import ConsoleUserMenu from '$lib/components/ConsoleUserMenu.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import { authClient } from '$lib/auth-client.js'
  import { getList } from '$lib/lists.remote.js'
  import { getOrganization } from './organizations/organizations.remote.js'
  import { getUser } from './users/users.remote.js'

  import type { Snippet } from 'svelte'
  import type { Organization } from '$lib/types.js'
  import type { ListDetail } from '$lib/lists.remote.js'
  import type { ConsoleUser } from './users/users.remote.js'

  import './layout.css'
  import '@allmaps/components/css/fonts.css'

  type Props = {
    children: Snippet
  }

  type Crumb = {
    label: string
    href: string
  }

  async function getListBreadcrumbLabel(
    listQuery: ReturnType<typeof getList>
  ): Promise<string | null> {
    try {
      const list: ListDetail = await listQuery

      return list.label || list.name
    } catch {
      return null
    }
  }

  async function getOrganizationBreadcrumbLabel(
    organizationQuery: ReturnType<typeof getOrganization>
  ): Promise<string | null> {
    try {
      const organization: Organization = await organizationQuery

      return organization.name
    } catch {
      return null
    }
  }

  async function getUserBreadcrumbLabel(
    userQuery: ReturnType<typeof getUser>
  ): Promise<string | null> {
    try {
      const user: ConsoleUser = await userQuery

      return user.name || user.email || null
    } catch {
      return null
    }
  }

  let { children: pageChildren }: Props = $props()

  const apiBaseURL = page.data.env.PUBLIC_REST_BASE_URL

  setAuthContext({
    client: authClient as unknown as AllmapsAuthClient,
    apiBaseURL
  })

  const viewTransitionTimeoutMs = 1_500
  let activeViewTransition: ViewTransition | null = null

  function timeout(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  onNavigate((navigation) => {
    if (
      !document.startViewTransition ||
      document.visibilityState !== 'visible' ||
      navigation.willUnload
    ) {
      return
    }

    return new Promise((resolve) => {
      try {
        activeViewTransition?.skipTransition()

        const transition = document.startViewTransition(async () => {
          resolve()
          await Promise.race([
            navigation.complete.catch(() => {}),
            timeout(viewTransitionTimeoutMs)
          ])
        })

        activeViewTransition = transition

        transition.ready.catch(() => {})
        transition.updateCallbackDone.catch(() => {})
        transition.finished
          .catch(() => {})
          .finally(() => {
            if (activeViewTransition === transition) {
              activeViewTransition = null
            }
          })
      } catch {
        activeViewTransition = null
        resolve()
      }
    })
  })

  const listBreadcrumbId = $derived(
    page.route.id === '/profile/lists/[listId]' ? page.params.listId : null
  )
  const listBreadcrumbQuery = $derived(
    listBreadcrumbId ? getList(listBreadcrumbId) : null
  )
  const listBreadcrumbLabel = $derived(
    listBreadcrumbQuery
      ? await getListBreadcrumbLabel(listBreadcrumbQuery)
      : null
  )
  const organizationBreadcrumbId = $derived(
    page.route.id === '/organizations/[organizationId]'
      ? page.params.organizationId
      : null
  )
  const organizationBreadcrumbQuery = $derived(
    organizationBreadcrumbId ? getOrganization(organizationBreadcrumbId) : null
  )
  const organizationBreadcrumbLabel = $derived(
    organizationBreadcrumbQuery
      ? await getOrganizationBreadcrumbLabel(organizationBreadcrumbQuery)
      : null
  )
  const userBreadcrumbId = $derived(
    page.route.id === '/users/[userId]' ? page.params.userId : null
  )
  const userBreadcrumbQuery = $derived(
    userBreadcrumbId ? getUser(userBreadcrumbId) : null
  )
  const userBreadcrumbLabel = $derived(
    userBreadcrumbQuery ? await getUserBreadcrumbLabel(userBreadcrumbQuery) : null
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
        label = d.isCurrentUser ? 'My Profile' : (userBreadcrumbLabel ?? seg)
      else if (prev === 'organizations')
        label = organizationBreadcrumbLabel ?? seg
      else if (prev === 'lists') label = listBreadcrumbLabel ?? seg
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
        <ConsoleUserMenu />
      </div>
    </Header>
  </div>
  <DotsPattern color="#d1d5db" opacity={0.9}>
    {@render pageChildren()}
  </DotsPattern>
</div>
