import { env } from '$env/dynamic/public'
import { error } from '@sveltejs/kit'
import {
  organizationPlans,
  combinePartners,
  type OrganizationPlan,
  type PartnerOrganization as Organization
} from '$lib/data/partners.js'

import type { PageLoad } from './$types'

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function isOrganizationPlan(value: unknown): value is OrganizationPlan {
  return (
    typeof value === 'string' &&
    organizationPlans.includes(value as OrganizationPlan)
  )
}

function normalizeOrganization(value: unknown): Organization | undefined {
  if (!value || typeof value !== 'object') {
    return
  }

  const organization = value as Record<string, unknown>

  if (
    typeof organization.id !== 'string' ||
    typeof organization.name !== 'string' ||
    typeof organization.slug !== 'string' ||
    !isOrganizationPlan(organization.plan)
  ) {
    return
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: typeof organization.logo === 'string' ? organization.logo : null,
    homepage:
      typeof organization.homepage === 'string' ? organization.homepage : null,
    plan: organization.plan
  }
}

async function fetchOrganizationsByPlan(
  fetch: typeof globalThis.fetch,
  restBaseUrl: string,
  plan: OrganizationPlan
) {
  const url = new URL(joinUrl(restBaseUrl, '/organizations'))
  url.searchParams.set('plan', plan)
  url.searchParams.set('limit', '200')

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
      .map(normalizeOrganization)
      .filter(
        (organization): organization is Organization =>
          organization?.plan === plan
      )
  } catch {
    return []
  }
}

export const load: PageLoad = async ({ fetch, data }) => {
  const restBaseUrl = env.PUBLIC_REST_BASE_URL

  if (!restBaseUrl) {
    error(500, 'PUBLIC_REST_BASE_URL is not configured')
  }

  const organizations = await Promise.all(
    organizationPlans.map((plan) =>
      fetchOrganizationsByPlan(fetch, restBaseUrl, plan)
    )
  )

  return {
    ...data,
    organizations: combinePartners(organizations.flat())
  }
}
