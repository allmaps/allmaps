<script lang="ts">
  import { onNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import { tick } from 'svelte'
  import { Stats } from '@allmaps/ui'

  import Footer from '$lib/components/Footer.svelte'
  import Header from '$lib/components/Header.svelte'
  import PageHead from '$lib/components/PageHead.svelte'
  import { getHeroTransitionDirection } from '$lib/hero/navigation.js'
  import { heroLayoutEvent } from '$lib/hero/grid.js'

  import '../app.css'

  let { children } = $props()

  const pagesWithoutGlobalFooter = new Set([
    '/',
    '/iiif-partnership',
    '/iiif-partnership/'
  ])

  const showFooter = $derived(!pagesWithoutGlobalFooter.has(page.url.pathname))

  let activeHeroTransition: ViewTransition | undefined

  async function settleHeroLayout() {
    await tick()
    await document.fonts.ready
    // Measure synchronously before the destination snapshot, then flush the
    // cleared cells without holding navigation for extra animation frames.
    window.dispatchEvent(new Event(heroLayoutEvent))
    await tick()
  }

  onNavigate((navigation) => {
    activeHeroTransition?.skipTransition()

    const direction = getHeroTransitionDirection(navigation, {
      supported: Boolean(document.startViewTransition),
      visible: document.visibilityState === 'visible',
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
    })
    if (!direction) return

    document.documentElement.dataset.heroNavigation = direction

    return new Promise<void>((resolve) => {
      try {
        const transition = document.startViewTransition(async () => {
          resolve()
          await navigation.complete
          await settleHeroLayout()
        })
        activeHeroTransition = transition
        const cleanUp = () => {
          if (activeHeroTransition === transition) {
            activeHeroTransition = undefined
            delete document.documentElement.dataset.heroNavigation
          }
        }
        void transition.ready.catch(() => {})
        void transition.updateCallbackDone.catch(() => {})
        void transition.finished.then(cleanUp, cleanUp)
      } catch {
        delete document.documentElement.dataset.heroNavigation
        resolve()
      }
    })
  })
</script>

<PageHead />

<Stats />
<div class="flex min-h-dvh flex-col">
  <Header />

  <div class="flex-1">
    {@render children()}
  </div>

  {#if showFooter}
    <Footer />
  {/if}
</div>
