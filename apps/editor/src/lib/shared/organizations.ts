import type { Organization } from '$lib/types/shared.js'

export default [
  {
    id: 'lmec',
    title: 'Leventhal Map & Education Center',
    subtitle:
      'Norman B. Leventhal Map & Education Center at the Boston Public Library'
  },
  {
    id: 'leiden',
    title: 'Leiden University Libraries',
    subtitle: 'Leiden University Libraries'
  },
  {
    id: 'agsl',
    title: 'American Geographical Society Library',
    subtitle:
      'American Geographical Society Library at the University of Wisconsin-Milwaukee'
  }
] satisfies Organization[]

export const projects = [
  {
    label: 'the <strong>Leventhal Map & Education Center</strong>',
    hostnames: [
      'leventhalmap.org',
      'www.leventhalmap.org',
      'collections.leventhalmap.org'
    ]
  },
  {
    label: '<strong>DigHimapper</strong>',
    hostnames: ['dighimapper.eu']
  },
  {
    label: '<strong>Gouda Tijdmachine</strong>',
    hostnames: ['www.goudatijdmachine.nl']
  }
]
