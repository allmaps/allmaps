// Curated selections for the partners page, keyed by organization slug.
// Map IDs and image services come from each organization's Allmaps collection.
// Keep selections here until they can be managed through the organization API.
// Selected 2026-10-29 using production /maps.geojson with intersects=lat,lon
// and imageServiceDomain, favoring landscape images and small footprints.
// API partner selections contain their organization's production API location.
// NLS has no API location: use George IV Bridge, [-3.19191, 55.94861], from
// https://www.trove.scot/designation/LB27684 (confirmed site choice).
// Wales uses a country map until a more local covering map is georeferenced.
// Leiden and VU have no API location: use their main library neighborhoods.
export type HighlightedPartnerMap = {
  mapId: string
  annotationUrl?: string
  imageServiceUrl: string
  previewImageUrl?: string
  previewWidth?: number
  // Request the crop directly from IIIF when a full-image preview loses detail.
  previewRegion?: boolean
  // Usable map interior as fractions of the source: left, top, right, bottom.
  // Excludes sheet edges, frames and legends before centering the preview.
  previewBounds?: [number, number, number, number]
  // Institution location in longitude, latitude; used when generating crops.
  location?: [number, number]
  title: string
  attribution?: string
  rightsLabel?: string
  rightsUrl?: string
}

export type PartnerOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
  homepage: string | null
  plan: OrganizationPlan | 'partner'
}

export const organizationPlans = ['innovator', 'supporter'] as const

export type OrganizationPlan = (typeof organizationPlans)[number]

// Balance tall emblems and wide wordmarks within the shared logo area.
export const partnerLogoSizes: Partial<
  Record<string, { width: number; height: number }>
> = {
  bnf: { width: 128, height: 56 },
  bodleian: { width: 68, height: 104 },
  nls: { width: 128, height: 88 },
  'stanford-libraries': { width: 128, height: 80 },
  yale: { width: 112, height: 80 }
}

// Editorial partners are independent of API membership plans.
export const partnerOrganizations: PartnerOrganization[] = [
  {
    id: 'agsl',
    name: 'University of Wisconsin–Milwaukee Libraries',
    slug: 'agsl',
    logo: 'https://files.allmaps.org/images/organizations/uwm.svg',
    homepage: 'https://uwm.edu/libraries/agsl/',
    plan: 'partner'
  },
  {
    id: 'tudelft',
    name: 'Delft University of Technology Library',
    slug: 'tudelft',
    logo: 'https://files.allmaps.org/images/organizations/tudelft.svg',
    homepage: 'https://heritage.tudelft.nl/',
    plan: 'partner'
  },
  {
    id: 'ghent',
    name: 'Ghent Centre for Digital Humanities',
    slug: 'ghent',
    logo: 'https://files.allmaps.org/images/organizations/ghentcdh.svg',
    homepage: 'https://www.ghentcdh.ugent.be/',
    plan: 'partner'
  },
  {
    id: 'knaw',
    name: 'KNAW Humanities Cluster',
    slug: 'knaw',
    logo: 'https://files.allmaps.org/images/organizations/knaw.png',
    homepage: 'https://huc.knaw.nl/',
    plan: 'partner'
  },
  {
    id: 'lmec',
    name: 'Leventhal Map & Education Center at the Boston Public Library',
    slug: 'lmec',
    logo: 'https://files.allmaps.org/images/organizations/lmec.png',
    homepage: 'https://www.leventhalmap.org/',
    plan: 'partner'
  },
  {
    id: 'nls',
    name: 'National Library of Scotland',
    slug: 'nls',
    logo: 'https://files.allmaps.org/images/organizations/nls-2025.svg',
    homepage: 'https://maps.nls.uk/',
    plan: 'partner'
  },
  {
    id: 'leiden',
    name: 'Universitaire Bibliotheken Leiden',
    slug: 'leiden',
    logo: 'https://files.allmaps.org/images/organizations/leiden-black.svg',
    homepage:
      'https://digitalcollections.universiteitleiden.nl/islandora/search',
    plan: 'partner'
  },
  {
    id: 'vu',
    name: 'Universiteitsbibliotheek VU',
    slug: 'vu',
    logo: 'https://files.allmaps.org/images/organizations/vu.svg',
    homepage: 'https://vu.contentdm.oclc.org/digital/collection/krt',
    plan: 'partner'
  }
]

export function combinePartners(organizations: PartnerOrganization[]) {
  const bySlug = new Map(
    [...partnerOrganizations, ...organizations].map((organization) => [
      organization.slug,
      organization
    ])
  )
  return [...bySlug.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
  )
}

export const highlightedPartnerMaps: Partial<
  Record<string, HighlightedPartnerMap>
> = {
  leiden: {
    previewRegion: true,
    mapId: '6a74aa1b0a1cd30f',
    imageServiceUrl:
      'https://iiif.universiteitleiden.nl/iiif/2/hdl:1887.1%252Fitem:3276606',
    title: 'Nieuwe kaart der stad Leyden',
    location: [4.481, 52.155],
    previewBounds: [0.08, 0.12, 0.92, 0.88],
    attribution: 'Universitaire Bibliotheken Leiden'
  },
  vu: {
    previewRegion: true,
    mapId: 'db74b6e0a64ca306',
    imageServiceUrl: 'https://cdm21033.contentdm.oclc.org/iiif/2/krt:2842',
    title: 'Spoorwegverbindingen met de Havens-West bij Amsterdam, 1916',
    location: [4.866, 52.334],
    previewBounds: [0.07, 0.08, 0.93, 0.92],
    attribution: 'Universiteitsbibliotheek VU'
  },
  agsl: {
    // TODO: Fetch a sharper campus-area example when the image service recovers.
    // Original map: 71ac69b6934ac831 (cdm17272.contentdm.oclc.org).
    mapId: '71ac69b6934ac831',
    imageServiceUrl: 'https://cdm17272.contentdm.oclc.org/iiif/2/agdm:22377',
    title: 'Milwaukee quadrangle, Wisconsin — topographic map',
    location: [-87.88, 43.076944],
    previewRegion: true,
    attribution: 'American Geographical Society Library'
  },
  ghent: {
    previewRegion: true,
    previewBounds: [0.06, 0.37, 0.8, 0.88],
    mapId: 'e7e2af75953e3c7c',
    imageServiceUrl:
      'https://iiif.ghentcdh.ugent.be/iiif/images/gereduceerd_kadaster:Gand:Gand:Gand_1853',
    title: 'Cadastral map of Ghent, 1853',
    location: [3.724, 51.044],
    attribution: 'Ghent Centre for Digital Humanities'
  },
  knaw: {
    previewBounds: [0.1, 0.1, 0.9, 0.9],
    // KNAW Humanities Cluster, Oudezijds Achterburgwal 185. Map from UvA.
    previewRegion: true,
    mapId: 'f6b4464cc1690fc2',
    imageServiceUrl:
      'https://images.uba.uva.nl/iiif/2/erfgoed!kaarten!7!9!9!990009339970205131!101-04-VI-E-25-33.jpg',
    title: 'Nieuwe kaart van Amsterdam, 1829',
    location: [4.8965, 52.3701],
    attribution: 'Universiteitsbibliotheek van Amsterdam'
  },
  lmec: {
    previewRegion: true,
    previewBounds: [0.09, 0.12, 0.9, 0.76],
    mapId: '0ce95fc49fc74621',
    imageServiceUrl:
      'https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:1257bs08b',
    title: 'Atlas of the city of Boston: Boston proper and Back Bay',
    location: [-71.078, 42.3493],
    attribution: 'Leventhal Map & Education Center, Boston Public Library'
  },
  tudelft: {
    previewRegion: true,
    previewBounds: [0.06, 0.08, 0.9, 0.92],
    mapId: '0e490a7e3fc7cfa6',
    imageServiceUrl:
      'https://dlc.services/iiif-img/7/4/8432d50c-5238-4d8d-b394-9e46937aebc3',
    title: 'Technische Hogeschool city map of Delft',
    location: [4.3779, 52.0025],
    attribution: 'Delft University of Technology Library'
  },
  bnf: {
    previewBounds: [0.09, 0.12, 0.91, 0.88],
    location: [2.375766, 48.833653],
    previewRegion: true,
    mapId: 'd59aa3698f042fba',
    imageServiceUrl:
      'https://openapi.bnf.fr/iiif/image/v3/ark:/12148/btv1b84588881/f1',
    title: 'Plan de Paris monumental, 1930',
    attribution: 'Bibliothèque nationale de France'
  },
  bodleian: {
    location: [-1.254038, 51.754077],
    previewRegion: true,
    mapId: '69d5547f484c7a2f',
    imageServiceUrl:
      'https://iiif.bodleian.ox.ac.uk/iiif/image/50021415-4611-4c31-9296-ffd72bedbbc0',
    title: 'Map of Oxford illustrating Dr. Acland’s report on cholera, 1855',
    attribution: '© Bodleian Libraries, University of Oxford',
    rightsLabel: 'CC BY-NC 4.0',
    rightsUrl: 'https://creativecommons.org/licenses/by-nc/4.0/'
  },
  rara: {
    previewBounds: [0.09, 0.17, 0.73, 0.83],
    location: [24.738983, 59.430411],
    previewRegion: true,
    mapId: '11fc4077f885118e',
    imageServiceUrl:
      'https://i3fproxy.testdigar2.rara.ee/YToyOntzOjI6ImlkIjtzOjg6ImIxNTU2NjAyIjtzOjQ6ImZpbGUiO3M6MTU6IklNQUdFUy8wMDAxLmpwMiI7fQ',
    // The IIIF proxy returns 403. Use the same map's published viewer preview:
    // https://www.digar.ee/viewer/en/nlib-digar:127633
    previewImageUrl: 'https://www.digar.ee/viewer/zoom/15586/page/1/4898/2772',
    title: 'Skeem orienteerumiseks Suvistel Pidustustel Tallinnas, 1938',
    attribution: 'Eesti Rahvusraamatukogu',
    rightsLabel: 'In Copyright',
    rightsUrl: 'http://rightsstatements.org/vocab/InC/1.0/'
  },
  'indiana-university': {
    location: [-86.516795, 39.171021],
    previewRegion: true,
    mapId: '5a8bcca0d27e120d',
    imageServiceUrl:
      'https://iiif.uits.iu.edu/iiif/2/vq280q98b%2Ffiles%2F24fe6c15-51e0-4689-8495-48aa8af7d117%2Ffcr:versions%2Fversion1',
    title: 'Bloomington, Indiana, 1977'
  },
  nls: {
    previewRegion: true,
    previewBounds: [0.03, 0.03, 0.93, 0.97],
    location: [-3.19191, 55.94861],
    mapId: '9793344dd31784d0',
    imageServiceUrl: 'https://map-view.nls.uk/iiif/2/7441%2F74415483',
    // The generator applies NLS's 270,000-pixel limit to the requested region.
    title: 'Edinburgh Castle, George IV Bridge and the Old Town',
    attribution: 'National Library of Scotland'
  },
  nypl: {
    previewBounds: [0.11, 0.18, 0.84, 0.9],
    location: [-73.981875, 40.753406],
    previewRegion: true,
    mapId: '5ab73fabb5cc4307',
    // The unversioned annotation is unavailable; retain the curated version.
    annotationUrl:
      'https://annotations.allmaps.org/maps/5ab73fabb5cc4307@6c6848fecb656ebc',
    imageServiceUrl: 'https://iiif.nypl.org/iiif/2/1524630',
    title: 'Bryant Park and the New York Public Library · Plate 26',
    attribution: 'New York Public Library'
  },
  'stanford-libraries': {
    previewRegion: true,
    previewBounds: [0.12, 0.04, 0.87, 0.59],
    location: [-122.1697, 37.4284],
    mapId: '960c049acff828ca',
    imageServiceUrl:
      'https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~312332~90081718',
    title: 'Stanford University, Edward M. Farmer, 1934',
    attribution: 'David Rumsey Historical Map Collection, Stanford Libraries'
  },
  tamu: {
    previewBounds: [0.04, 0.08, 0.94, 0.94],
    location: [-96.338939, 30.617058],
    previewRegion: true,
    mapId: '8cd180903139a1b5',
    imageServiceUrl:
      'https://digitalcollections.library.tamu.edu/iiif/2/6b4%2Fimage-3983257-beaf2655-81c9-49f1-ac2e-d9be069bca84.jp2',
    title: 'Texas A&M University campus map, 2010',
    attribution:
      'Provided by Cushing Memorial Library and Archives, Texas A&M University',
    rightsLabel: 'In Copyright – Educational Use Permitted',
    rightsUrl: 'http://rightsstatements.org/vocab/InC-EDU/1.0/'
  },
  llyfrgell: {
    location: [-4.068444, 52.414642],
    previewRegion: true,
    mapId: 'b577acfcd3aa1869',
    imageServiceUrl: 'https://iiif.llyfrgell.cymru/iiif/4896522',
    title: 'Cambriae typus · Map of Wales',
    attribution: 'Llyfrgell Genedlaethol Cymru – The National Library of Wales',
    rightsLabel: 'Public domain',
    rightsUrl: 'https://creativecommons.org/publicdomain/mark/1.0/'
  },
  uva: {
    previewRegion: true,
    previewBounds: [0.08, 0.1, 0.92, 0.9],
    location: [4.893027, 52.368797],
    mapId: 'eaa990689f45a090',
    imageServiceUrl:
      'https://images.uba.uva.nl/iiif/2/default!1!3!1!990009413700205131!HB-KZL-25-02-04.jpg',
    title: 'Kaart van Amsterdam 1:10.000 — Dienst der Publieke Werken',
    attribution: 'Universiteitsbibliotheek van Amsterdam'
  },
  uchicago: {
    previewBounds: [0.06, 0.23, 0.94, 0.9],
    location: [-87.599959, 41.79211],
    previewRegion: true,
    mapId: '33a8c78442008516',
    imageServiceUrl:
      'https://iiif-server.lib.uchicago.edu/ark:61001/b2fn56j6c570/00000001',
    title: 'A Map of the University of Chicago, 1933',
    attribution: 'University of Chicago Library',
    rightsLabel: 'CC BY-NC 4.0',
    rightsUrl: 'http://creativecommons.org/licenses/by-nc/4.0/'
  },
  univie: {
    location: [16.36074, 48.213061],
    previewRegion: true,
    mapId: 'b7626b31393b96e8',
    imageServiceUrl:
      'https://goobi-viewer.univie.ac.at/viewer/api/v1/records/AC03804006/files/images/AC03804006.tif',
    title: 'Neuester Plan von Wien und dessen 34 Vorstädten, 1840',
    attribution: 'Universitätsbibliothek Wien'
  },
  yale: {
    previewRegion: true,
    previewBounds: [0.08, 0.1, 0.92, 0.9],
    location: [-72.928494, 41.311061],
    mapId: '1254821971f2b8c6',
    imageServiceUrl: 'https://collections.library.yale.edu/iiif/2/15691419',
    title: 'Price, Lee & Co.’s new map of the city of New Haven, 1883',
    attribution: 'Yale University Library'
  }
}
