const organisationsByDomain: Record<string, string> = {
  'https://iiif.nypl.org': 'the New York Public Library',
  'https://www.davidrumsey.com': 'the David Rumsey Map Collection',
  'https://iiif.digitalcommonwealth.org': 'Digital Commonwealth',
  'https://collections.library.yale.edu': 'Yale University Library',
  'https://service.archief.nl': 'the National Archives of the Netherlands',
  'https://cdm21033.contentdm.oclc.org': 'Vrije Universiteit Amsterdam',
  'https://iiif.universiteitleiden.nl': 'Leiden University Libraries',
  'https://images.uba.uva.nl':
    'UvA Bijzondere Collecties / Allard Pierson Museum',
  'https://map-view.nls.uk': 'the National Library of Scotland',
  'https://tile.loc.gov': 'the Library of Congress',
  'https://cdm17272.contentdm.oclc.org':
    'American Geographical Society Library at the University of Wisconsin-Milwaukee',
  'https://gallica.bnf.fr': 'Bibliothèque nationale de France',
  'https://iiif-server.lib.uchicago.edu': 'the University of Chicago Library',
  'https://images.memorix.nl/ams/': 'Stadsarchief Amsterdam',
  'http://images.memorix.nl/ams/': 'Stadsarchief Amsterdam',
  'https://stadsarchiefamsterdam.memorix.io': 'Stadsarchief Amsterdam',
  'https://stacks.stanford.edu': 'Stanford University Libraries',
  // 'https://images.memorix.nl/sad/': '',
  'https://images.memorix.nl/ranh/': 'Het Noord-Hollands Archief',
  'https://images.memorix.nl/rce/': 'Rijksdienst voor het Cultureel Erfgoed'
}

export function organizationNameFromImageServiceUrl(url: string) {
  const name = Object.entries(organisationsByDomain).find(([imageServiceUrl]) =>
    url.startsWith(imageServiceUrl)
  )?.[1]

  return name
}
