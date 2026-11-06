import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
import { toolIdentities } from './tool-identities.js'

export type NavigationLink = {
  label: string
  href: string
}

export type NavigationGroup = {
  title: string
  href: string
  description: string
  links: NavigationLink[]
}

const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')

// Shared by the desktop menu, mobile menu and footer.
export const navigationGroups: NavigationGroup[] = [
  {
    title: 'About',
    href: '/about',
    description: 'Learn about Allmaps, our partners and how we work.',
    links: [
      { label: 'About Allmaps', href: '/about' },
      { label: 'Partners', href: '/partners' },
      { label: 'IIIF Partnership', href: '/iiif-partnership' },
      { label: 'Terms & Usage', href: '/terms' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' }
    ]
  },
  {
    title: 'Tools',
    href: '/tools',
    description: 'Georeference and explore maps.',
    links: [
      { label: toolIdentities.editor.name, href: toolIdentities.editor.href },
      { label: toolIdentities.viewer.name, href: toolIdentities.viewer.href },
      { label: toolIdentities.here.name, href: toolIdentities.here.href },
      { label: toolIdentities.latest.name, href: toolIdentities.latest.href },
      { label: 'More tools', href: '/tools' }
    ]
  },
  {
    title: 'Resources',
    href: '/get-started',
    description: 'Find inspiration, guides and open data.',
    links: [
      { label: 'Get Started', href: '/get-started' },
      { label: 'Showcase', href: '/showcase' },
      { label: 'Open Data', href: '/data' }
    ]
  },
  {
    title: 'Open Source',
    href: '/open-source',
    description: 'Build with Allmaps in your own projects.',
    links: [
      { label: 'Plugins', href: '/open-source#plugins' },
      { label: 'Libraries', href: '/open-source#libraries' },
      { label: 'APIs', href: `${docsBaseUrl}/apis` },
      { label: 'CLI', href: `${docsBaseUrl}/packages/cli` },
      { label: 'Docs', href: docsBaseUrl },
      { label: 'GitHub', href: 'https://github.com/allmaps/allmaps' }
    ]
  }
]

export const getStartedLink = {
  label: 'Get started',
  href: '/get-started'
}
