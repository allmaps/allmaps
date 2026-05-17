export const adminDetail = {
  description: 'Admin only.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Admin only', color: '#fd0' }]
}

export const authenticatedDetail = {
  description:
    'Authenticated users only. This route operates on the current user and their own resources.',
  security: [{ sessionCookie: [] }],
  'x-badges': [{ name: 'Authenticated', color: '#df0' }]
}
