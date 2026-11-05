import {
  PUBLIC_ARCADE_BASE_URL,
  PUBLIC_DOCS_BASE_URL,
  PUBLIC_EDITOR_BASE_URL,
  PUBLIC_EXPLORE_BASE_URL,
  PUBLIC_HERE_BASE_URL,
  PUBLIC_LATEST_BASE_URL,
  PUBLIC_VIEWER_BASE_URL
} from '$env/static/public'

const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')

export const toolIdentities = {
  editor: {
    name: 'Allmaps Editor',
    href: PUBLIC_EDITOR_BASE_URL.replace(/\/$/, '')
  },
  viewer: {
    name: 'Allmaps Viewer',
    href: PUBLIC_VIEWER_BASE_URL.replace(/\/$/, '')
  },
  here: {
    name: 'Allmaps Here',
    href: PUBLIC_HERE_BASE_URL.replace(/\/$/, '')
  },
  latest: {
    name: 'Allmaps Latest',
    href: PUBLIC_LATEST_BASE_URL.replace(/\/$/, '')
  },
  cli: {
    name: 'Allmaps CLI',
    href: `${docsBaseUrl}/packages/cli`
  },
  tileServer: {
    name: 'Allmaps Tile Server',
    href: `${docsBaseUrl}/guides/using-maps#xyz-map-tiles`
  },
  arcade: {
    name: 'Allmaps Arcade',
    href: PUBLIC_ARCADE_BASE_URL.replace(/\/$/, '')
  },
  explore: {
    name: 'Allmaps Explore',
    href: PUBLIC_EXPLORE_BASE_URL.replace(/\/$/, '')
  }
}
