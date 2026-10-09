# Allmaps REST API

## User roles and limits

Authenticated accounts have the `user`, `collaborator`, or `admin` role.
Administrators can assign and revoke Collaborator status in the console's user
details using the existing `/auth/admin/set-role` endpoint. No database migration
is needed because the existing `users.role` column stores text.

| Request context                                     | Maximum results per request |
| --------------------------------------------------- | --------------------------: |
| Public                                              |                         200 |
| User                                                |                         400 |
| Collaborator                                        |                       1,000 |
| Organization-plan member querying that organization |                         600 |
| Admin                                               |                         600 |

Collaborator limits also apply to public data within organization queries.
Membership and visibility rules still determine which organization details a
user can access. Existing endpoint default limits are unchanged. Requests using
elevated limits are not cached publicly.

## IIIF imports

Admins and collaborators can use `POST /manifests` and `POST /images` to import
IIIF resources from any institution. Both accept `{ "url": "…" }` or an array
of those objects. Importing an existing resource refreshes its stored IIIF data.

Organization import endpoints require an admin or membership in the target
organization with a qualifying organization plan, and retain their domain
restrictions. Collaborator status alone does not grant that membership.

Collaborators cannot administer users or organizations, assign roles, or modify
other users' lists. Their Better Auth administration permissions are the same
as an ordinary user's. Imports bypass the session cookie cache, so revoking
the role immediately removes general import access. Query limits can take up
to five minutes to reflect a role change because of the existing session cache.

## Organization mutations

Organization PATCH requests update only explicitly supplied fields. Omitted
fields retain their existing values, including the plan. Explicit `null` clears
nullable fields, `false` disables collection display, and an empty `domains`
array clears domains. An empty PATCH is a no-op for an existing organization.

Organization creation defaults the plan to `contributor` only when omitted;
explicit `null` creates an organization without a plan. Adding an organization
member defaults an omitted role to `member`. Updating a member's role requires
an explicit valid role.

## Validation

Run `pnpm --filter @allmaps/api-rest test` for deterministic role, limit, and
import authorization tests. Tests resolve workspace packages to their sources
and require no package build or running development server.
