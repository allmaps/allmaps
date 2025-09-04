import type { Organization, OrganizationWithId } from '$lib/types/shared.js'

export const organizationsWithCollectionsOnHomepage: OrganizationWithId[] = [
  {
    title: 'Leiden University Libraries',
    id: 'leiden',
    baseUrls: ['https://iiif.universiteitleiden.nl']
  },
  {
    id: 'lmec',
    title: 'Leventhal Map & Education Center',
    label: (title: string) => `the ${title}`,
    allowRedirect: true,
    subtitle:
      'Norman B. Leventhal Map & Education Center at the Boston Public Library',
    baseUrls: [
      'https://leventhalmap.org',
      'https://www.leventhalmap.org',
      'https://collections.leventhalmap.org'
    ]
  },
  {
    id: 'nls',
    title: 'National Library of Scotland',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://map-view.nls.uk']
  },
  {
    id: 'loc',
    title: 'Library of Congress',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://tile.loc.gov']
  },
  {
    id: 'agsl',
    title: 'American Geographical Society Library',
    subtitle:
      'American Geographical Society Library at the University of Wisconsin-Milwaukee',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://cdm17272.contentdm.oclc.org']
  }
]

const otherOrganizations: (Organization | OrganizationWithId)[] = [
  {
    title: 'New York Public Library',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://iiif.nypl.org']
  },
  {
    title: 'David Rumsey Map Collection',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://www.davidrumsey.com']
  },
  {
    title: 'Digital Commonwealth',
    baseUrls: ['https://iiif.digitalcommonwealth.org']
  },
  {
    title: 'Yale University Library',
    baseUrls: ['https://collections.library.yale.edu']
  },
  {
    title: 'National Archives of the Netherlands',
    label: (title: string) => `the ${title}`,
    baseUrls: ['https://service.archief.nl']
  },
  {
    title: 'Vrije Universiteit Amsterdam',
    baseUrls: ['https://cdm21033.contentdm.oclc.org']
  },
  {
    title: 'UvA Bijzondere Collecties / Allard Pierson Museum',
    baseUrls: ['https://images.uba.uva.nl']
  },
  {
    title: 'Bibliothèque nationale de France',
    baseUrls: ['https://gallica.bnf.fr']
  },
  {
    title: 'University of Chicago Library',
    baseUrls: ['https://iiif-server.lib.uchicago.edu']
  },
  {
    title: 'Stanford University Libraries',
    baseUrls: ['https://stacks.stanford.edu']
  },
  {
    title: 'Stadsarchief Amsterdam',
    baseUrls: [
      'https://images.memorix.nl/ams/',
      'http://images.memorix.nl/ams/'
    ]
  },
  {
    title: 'Het Noord-Hollands Archief',
    baseUrls: ['https://images.memorix.nl/ranh/']
  },
  {
    title: 'Rijksdienst voor het Cultureel Erfgoed',
    baseUrls: ['https://images.memorix.nl/rce/']
  },
  {
    title: 'Het Nieuwe Instituut',
    baseUrls: ['https://images.memorix.nl/nai']
  },
  {
    title: 'DigHimapper',
    baseUrls: ['https://dighimapper.eu'],
    allowRedirect: true
  },
  {
    title: 'Gouda Tijdmachine',
    baseUrls: ['https://www.goudatijdmachine.nl'],
    allowRedirect: true
  }
]

export const organizations: (Organization | OrganizationWithId)[] = [
  ...organizationsWithCollectionsOnHomepage,
  ...otherOrganizations
]

export function organizationFromImageServiceUrl(url: string) {
  const organization = organizations.find(({ baseUrls }) =>
    baseUrls.some((imageServiceUrl) => url.startsWith(imageServiceUrl))
  )

  return organization
}
