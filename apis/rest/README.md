# Allmaps REST API

## User roles and limits

Authenticated accounts have the `user`, `collaborator`, or `admin` role.
Assigning or removing Admin requires updating `users.role` directly in the database.
Admins can assign or remove Collaborator in the Console using
`PATCH /users/:userId/role`, which accepts only `user` or `collaborator` and cannot
change an Admin account. The built-in `/auth/admin/set-role` endpoint remains
disabled, and Better Auth user creation/update endpoints cannot write roles.
Account deletion through Better Auth is also disabled: its cascading membership
deletes would bypass last-owner protection. Account deletion requires transferring
any sole ownership and cleaning up related data in the database.

| Request context                                     | Maximum results per request |
| --------------------------------------------------- | --------------------------: |
| Public                                              |                         200 |
| User                                                |                         400 |
| Collaborator                                        |                         600 |
| Organization-plan member querying that organization |                         600 |
| Admin                                               |                         600 |

Contributor, Supporter, and Innovator have identical import and query-limit
permissions. Ownership does not independently raise query limits. Existing endpoint
default limits are unchanged. Elevated limits and private account data are not
cached publicly.

## Imports

Admins and collaborators can use `POST /manifests` and `POST /images` to import
IIIF resources from any institution. Both accept `{ "url": "…" }` or an array
of those objects. Importing an existing resource refreshes its stored IIIF data.

Organization import endpoints accept admins and collaborators for any organization,
regardless of membership, plan, or domains. Owners can import only into their own
organization with a Contributor, Supporter, or Innovator plan, and only from its
configured domains. Owners without a plan and regular organization members cannot
import. Owners cannot change domains or plans to expand their import rights.

Georeference-data imports through `POST /maps` and `PATCH /maps/:mapId` require an
Admin. This is separate from normal collaborative georeferencing in the Editor.
REST forwards these imports using the server-only `LIVE_IMPORT_SECRET`; Live
requires the same credential. Missing configuration disables imports with HTTP 503. User sessions are not forwarded, and redirects are rejected. See the
[Live setup instructions](../live/README.md#configure-the-shared-secret).

Session loading delegates to Better Auth, sharing reads within each request.
Imports and management operations use fresh sessions, so database role revocations
take effect immediately. Query limits can take up to five minutes to reflect a role
change because of the session cookie cache.

## Console and organization permissions

Global roles and organization membership are independent. A user may be a `member`
or `owner` of multiple organizations; global Admin and Collaborator permissions
apply across all organizations.

| Action                                           | User          | Member        | Owner         | Collaborator  | Admin         |
| ------------------------------------------------ | ------------- | ------------- | ------------- | ------------- | ------------- |
| View/edit own basic profile                      | Yes           | Yes           | Yes           | Yes           | Yes           |
| View organization settings and members           | No            | Own           | Own           | All           | All           |
| View other user profiles                         | No            | No            | No            | Yes           | Yes           |
| Edit other user profiles                         | No            | No            | No            | No            | Yes           |
| Edit organization name, logo, homepage, location | No            | No            | Own           | All           | All           |
| Edit slug, domains, collection display           | No            | No            | No            | Yes           | Yes           |
| Change organization plan                         | No            | No            | No            | No            | Yes           |
| Add/remove regular members                       | No            | No            | Own           | All           | All           |
| Assign, demote, or remove owners                 | No            | No            | No            | Yes           | Yes           |
| Create/delete organizations                      | No            | No            | No            | No            | Yes           |
| Assign/remove Collaborator                       | No            | No            | No            | No            | Yes           |
| Assign/remove Admin                              | Database only | Database only | Database only | Database only | Database only |

Anonymous sessions cannot access Console profiles or management. Signed-in users
without memberships see their own profile. Members see their own organizations
read-only. Members and owners can see their organization member lists but cannot
open other users' profiles. Personal lists remain restricted to their account owner.

Adding a member requires an existing account; invitations to unregistered people
are not supported. Owners cannot promote, demote, or remove any owner, including
themselves. Admins and collaborators cannot remove or demote the last owner.
Membership updates/removals lock the organization and recheck permissions before
writing, protecting against concurrent last-owner removal and membership revocation.
Member additions use Better Auth’s organization API. Updates and removals use the
locked transaction because Better Auth requires the actor to be an organization
member, while Allmaps also permits global managers without membership.

Organization writes use the REST endpoints. Duplicate built-in auth write endpoints,
including invitation writes and leaving an organization, remain disabled.
`GET /organizations/:organizationId/permissions` separates view, edit, membership,
owner-assignment, field-specific, and deletion permissions for Console controls.

Apply the `20261021000000_normalize-organization-roles` migration with this change.
It converts legacy organization admin memberships and pending admin invitations to
owner, and collapses legacy combined roles to owner or member. Global roles are
unchanged. The refined permissions require no additional database migration.

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

Browser requests with credentials and browser mutations are accepted from the
REST API's own origin and `https://console.allmaps.org`. When the REST API is
running on localhost, HTTP localhost origins are also accepted. Public reads
remain available cross-origin without credentials. Server-side and CLI requests
without an Origin header remain supported.
