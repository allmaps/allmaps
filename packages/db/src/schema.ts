import { ops, snapshots } from './schema/sharedb.js'
import {
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  members,
  invitations,
  authRelations
} from './schema/auth.js'
import { maps, mapsLatest, mapsRelationsPart } from './schema/maps.js'
import {
  organizationUrls,
  organizationsRelationsPart
} from './schema/organizations.js'
import { listItems, lists, listsRelationsPart } from './schema/lists.js'
import {
  images,
  canvases,
  manifests,
  canvasesToImages,
  manifestsToCanvases,
  iiifRelationsPart
} from './schema/iiif.js'

export const schema = {
  ops,
  snapshots,
  users,
  sessions,
  accounts,
  verifications,
  organizations,
  members,
  invitations,
  maps,
  mapsLatest,
  listItems,
  lists,
  images,
  canvases,
  manifests,
  canvasesToImages,
  manifestsToCanvases,
  organizationUrls
}

export const relations = {
  ...authRelations,
  ...organizationsRelationsPart,
  ...iiifRelationsPart,
  ...listsRelationsPart,
  ...mapsRelationsPart
}
