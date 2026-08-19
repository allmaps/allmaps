import type { OrganizationPlan } from '$lib/organization-plans.js'

export type Organization = {
  id: string
  name: string
  slug: string
  logo?: string | null
  homepage?: string | null
  location?: {
    type: 'Point'
    coordinates: [number, number]
  } | null
  createdAt: string
  domains: string[]
  plan: OrganizationPlan | null
  displayCollections: boolean
  users?: {
    role: string
    createdAt: string
    user: {
      id: string
      name: string
      email: string
    }
  }[]
}

export type ConsoleUser = {
  id: string
  name?: string | null
  slug?: string | null
  email?: string | null
  image?: string | null
  banned?: boolean | null
  role?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
  emailVerified?: boolean | null
  organizations?: {
    userRole: string
    createdAt?: string
    organization: {
      id: string
      slug: string
      name: string
      logo?: string | null
      createdAt?: string
    }
  }[]
}

export type ConsoleSessionData = {
  user?: ConsoleUser
  session?: {
    id: string
    expiresAt?: string | Date
  }
} | null

export type LanguageString = {
  [language: string]: (string | number | boolean)[]
}

export type ListItem = {
  listId: string
  mapId: string | null
  mapImageId: string | null
  mapChecksum: string | null
  mapVersion: number | null
  imageId: string | null
  canvasId: string | null
  manifestId: string | null
  createdAt: string | null
  canvasLabel: LanguageString | null
  manifestLabel: LanguageString | null
}

export type ListSummary = {
  id: string
  name: string
  label: string | null
  createdAt: string
}

export type ListDetail = ListSummary & {
  items: ListItem[]
}
