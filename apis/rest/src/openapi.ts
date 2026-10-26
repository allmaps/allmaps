export const adminDetail = {
  description: 'Allmaps admins only.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Allmaps admin only', color: '#fd0' }]
}

export const authenticatedDetail = {
  description:
    'Authenticated users only. This route operates on the current user and their own resources.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Authenticated', color: '#df0' }]
}

export const iiifImportDetail = {
  description: 'Admins and collaborators only.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'IIIF import', color: '#df0' }]
}

export const organizationOwnerDetail = {
  description:
    'Owners of this organization, collaborators, and Allmaps admins. Only admins change plans or create/delete organizations. Only admins and collaborators manage owners, slugs, domains, and collection display.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Organization management', color: '#df0' }]
}

export const organizationManagerDetail = {
  description: 'Allmaps admins and collaborators only.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Admin or collaborator', color: '#df0' }]
}
