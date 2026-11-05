const heroPagePathnames = new Set([
  ...Object.keys(import.meta.glob('/src/routes/*/*/+page.svx'))
    .filter((path) => path.startsWith('/src/routes/(content)/'))
    .map((path) => `/${path.split('/').at(-2)}`),
  '/iiif-partnership'
])

export function isMaskHeroPathname(pathname: string) {
  return heroPagePathnames.has(pathname.replace(/\/$/, ''))
}

type HeroNavigation = {
  from: { route: { id: string | null }; url: URL } | null
  to: { route: { id: string | null }; url: URL } | null
  type: string
  delta?: number
}

export function getHeroTransitionDirection(
  navigation: HeroNavigation,
  environment: { supported: boolean; visible: boolean; reducedMotion: boolean }
): 'forward' | 'back' | undefined {
  const pathname = (url: URL) => url.pathname.replace(/\/$/, '')

  if (
    !environment.supported ||
    !environment.visible ||
    environment.reducedMotion ||
    !navigation.from?.route.id ||
    !navigation.to?.route.id ||
    !isMaskHeroPathname(navigation.from.url.pathname) ||
    !isMaskHeroPathname(navigation.to.url.pathname) ||
    pathname(navigation.from.url) === pathname(navigation.to.url)
  ) {
    return
  }

  return navigation.type === 'popstate' && (navigation.delta ?? 0) < 0
    ? 'back'
    : 'forward'
}
