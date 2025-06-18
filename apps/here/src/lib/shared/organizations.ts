const organisationsByDomain: Record<string, string> = {
  'iiif.nypl.org': 'the New York Public Library',
  'www.davidrumsey.com': 'the David Rumsey Map Collection',
  'iiif.digitalcommonwealth.org': 'Digital Commonwealth',
  'collections.library.yale.edu': 'Yale University Library',
  'service.archief.nl': 'the National Archives of the Netherlands',
  'cdm21033.contentdm.oclc.org': 'Vrije Universiteit Amsterdam',
  'iiif.universiteitleiden.nl': 'Leiden University Libraries',
  'images.uba.uva.nl': 'UvA Bijzondere Collecties / Allard Pierson Museum'
}

export function organizationNameFromImageServiceDomain(domain: string) {
  return organisationsByDomain[domain]
}
