export type PageMetadata = {
  title: string
  description?: string
  type?: 'website' | 'article'
}

export const defaultPageMetadata: PageMetadata = {
  title: 'Allmaps: curating, georeferencing and exploring IIIF maps',
  description: 'Curating, georeferencing and exploring for IIIF maps'
}
