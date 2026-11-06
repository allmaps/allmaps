<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { page } from '$app/state'
  import { Dialog } from 'bits-ui'
  import { ListIcon, XIcon } from 'phosphor-svelte'

  import logoUrl from '$lib/images/allmaps-logo.svg'
  import { getStartedLink } from '$lib/data/navigation.js'
  import DesktopNavigation from './DesktopNavigation.svelte'
  import SiteNavigationLinks from './SiteNavigationLinks.svelte'

  const headerOffset = 96
  let hasScrolledPastTitle = $state(false)
  let mobileMenuOpen = $state(false)
  let desktopMenuOpen = $state(false)

  const isHomepage = $derived(page.url.pathname === '/')
  const isVisible = $derived(
    !isHomepage || hasScrolledPastTitle || desktopMenuOpen || mobileMenuOpen
  )

  let observer: IntersectionObserver | undefined

  onMount(() => {
    const desktop = window.matchMedia('(min-width: 48rem)')
    const closeMenus = () => {
      desktopMenuOpen = false
      mobileMenuOpen = false
    }
    desktop.addEventListener('change', closeMenus)
    return () => desktop.removeEventListener('change', closeMenus)
  })

  $effect(() => {
    // Track route changes so client-side navigation closes both menus.
    void page.url.pathname
    desktopMenuOpen = false
    mobileMenuOpen = false
  })

  function closeMobileMenu() {
    mobileMenuOpen = false
  }

  $effect(() => {
    let cancelled = false
    observer?.disconnect()

    if (!isHomepage) {
      hasScrolledPastTitle = true
      return
    }

    hasScrolledPastTitle = false

    tick().then(() => {
      if (cancelled) {
        return
      }

      const titleElement = document.getElementById('title')

      if (!titleElement) {
        hasScrolledPastTitle = true
        return
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          hasScrolledPastTitle = !entry.isIntersecting
        },
        {
          rootMargin: `-${headerOffset}px 0px 0px 0px`,
          threshold: 0
        }
      )

      observer.observe(titleElement)
    })

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  })
</script>

{#snippet brand()}
  <a class="flex shrink-0 items-center gap-3 no-underline" href="/">
    <img class="h-8 w-auto" src={logoUrl} alt="" />
    <span class="text-xl font-bold text-black">Allmaps</span>
  </a>
{/snippet}

<header
  class={[
    isHomepage ? 'fixed' : 'sticky',
    isVisible ? 'translate-y-0' : '-translate-y-full',
    'top-0 z-20 w-full border-b border-black/10 transition-transform duration-300 focus-within:translate-y-0 focus-within:transition-none'
  ]}
>
  <!-- Keep the backdrop separate so the dropdown can blur the page too. -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 -z-10 bg-white/90 backdrop-blur"
  ></div>
  <div
    class="page-width flex h-16 items-center justify-between gap-6 max-[380px]:gap-2 md:grid md:grid-cols-[10rem_minmax(0,1fr)_8rem]"
  >
    {@render brand()}

    <DesktopNavigation bind:open={desktopMenuOpen} />

    <div class="flex items-center justify-end gap-2">
      <Dialog.Root bind:open={mobileMenuOpen}>
        <Dialog.Trigger
          class="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold text-black transition hover:text-pink md:hidden"
          aria-label="Open main menu"
        >
          <ListIcon class="size-5" weight="bold" />
          <span class="hidden min-[380px]:inline">Menu</span>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content
            class="site-mobile-menu fixed top-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-white/90 shadow-xl backdrop-blur md:hidden"
          >
            <div class="shrink-0 border-b border-black/10">
              <div
                class="page-width flex h-16 items-center justify-between max-[380px]:w-[calc(100%-1rem)]"
              >
                {@render brand()}
                <Dialog.Title class="sr-only">Allmaps navigation</Dialog.Title>
                <Dialog.Description class="sr-only">
                  Site navigation
                </Dialog.Description>

                <Dialog.Close
                  class="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-black/70 transition hover:bg-black/5 hover:text-black focus-visible:bg-black/5 focus-visible:text-black"
                  aria-label="Close main menu"
                >
                  <XIcon class="size-5" weight="bold" />
                </Dialog.Close>
              </div>
            </div>

            <div
              class="site-mobile-menu-links min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 max-[380px]:px-2 max-[380px]:py-4"
            >
              <SiteNavigationLinks mobile onNavigate={closeMobileMenu} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <a
        class="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md bg-pink-100 px-3 text-base font-bold text-pink no-underline transition-colors hover:bg-[#ffeef8] focus-visible:bg-[#ffeef8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink motion-reduce:transition-none"
        href={getStartedLink.href}
      >
        {getStartedLink.label}
      </a>
    </div>
  </div>
</header>
