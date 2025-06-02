const organisationsByDomain: Record<string, string> = {
  'iiif.nypl.org': 'the New York Public Library',
  'www.davidrumsey.com': 'the David Rumsey Map Collection'
}

export function organizationNameFromImageServiceDomain(domain: string) {
  return organisationsByDomain[domain]
}
