import type { ApiMap } from '@allmaps/api-shared/types'

export type DomainCounts = Map<string, number>

export function addMapDomain(domainCounts: DomainCounts, map: ApiMap) {
  const domain = getDomain(map.resource.id)

  if (!domain) {
    return
  }

  domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1)
}

export function serializeDomainCounts(domainCounts: DomainCounts) {
  return [...domainCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([domain, count]) => ({ domain, count }))
}

export function getDomain(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}
