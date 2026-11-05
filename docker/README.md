# Running Allmaps with Docker Compose

Docker Compose runs a complete, self-hosted Allmaps: the Editor, Viewer and Console, the
REST, Annotations and Live APIs, the Tile Server and Preview, a IIIF image server, PostgreSQL
with PostGIS, and a Caddy proxy in front of all of them.

There are two ways to run it:

|                 | Command                                        | Source code                              | Data                                   |
| --------------- | ---------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| **Development** | `docker compose up`                            | mounted from this checkout; edits reload | demo organizations, images and maps    |
| **Deployment**  | `docker compose -f compose.yaml up -d --build` | built into self-contained images         | empty: your own organizations and maps |

Both use the same hostnames and settings. Each has its own database.

## Development

```sh
docker compose up
```

When everything is ready, the `install` service prints the addresses to open, starting
with the Editor at http://editor.allmaps.localhost:5490. (The `localhost:8080` addresses
the dev servers print are inside their containers.)

The first run takes a few minutes: it installs dependencies and builds every package, then
starts the dev servers. Later runs only rebuild what changed.

| Service           | URL                                       |
| ----------------- | ----------------------------------------- |
| Editor            | http://editor.allmaps.localhost:5490      |
| Viewer            | http://viewer.allmaps.localhost:5490      |
| Console (login)   | http://console.allmaps.localhost:5490     |
| REST API          | http://api.allmaps.localhost:5490         |
| Annotations API   | http://annotations.allmaps.localhost:5490 |
| Live API          | http://live.allmaps.localhost:5490        |
| Tile Server       | http://tiles.allmaps.localhost:5490       |
| Preview           | http://preview.allmaps.localhost:5490     |
| IIIF image server | http://iiif.allmaps.localhost:5490        |

Edit files as usual; this is what happens next:

| You edit                                     | What reloads                                                    |
| -------------------------------------------- | --------------------------------------------------------------- |
| `apps/editor`, `apps/viewer`, `apps/console` | Vite updates the page in place                                  |
| `packages/*`                                 | `watch` rebuilds the package, then apps reload and APIs restart |
| `apis/*`                                     | `watch` rebuilds the API, then it restarts (`node --watch`)     |
| `workers/*`                                  | `wrangler dev` reloads the worker                               |
| `packages/render-wasm` (Rust)                | `wasm-pack` rebuilds it; this one is slow                       |
| `pnpm-lock.yaml` (a `git pull`, `pnpm add`)  | everything stops, reinstalls, rebuilds and starts again         |

`compose.override.yaml` defines development mode; Compose applies it automatically on top of
`compose.yaml`.

### Demo data

A new development database gets the demo dataset from `tools/seed`: two organizations
(Demo Amsterdam Archive and Demo European Map Library), four users, six maps from the IIIF
fixture server in `tools/iiif-server` (three georeferenced, with edit history, and three
waiting to be georeferenced), and some lists. The fixture server runs as the `fixtures`
service, at `fixtures-amsterdam.allmaps.localhost:5490` and
`fixtures-europe.allmaps.localhost:5490`: each demo organization owns the images on its
hostname.

Migrations create no organizations, so the Editor's homepage shows only the demo ones.
(allmaps.org's own partner organizations are in `packages/db/seed/allmaps-organizations.sql`.)

### Dependencies

The `install` service owns `node_modules`. It installs and builds when it starts, and again
whenever `pnpm-lock.yaml` changes. The other services wait for it: each runs through
`docker/dev-run.sh`, which starts the service once `install` has written
`/state/installed` (the hash of the lockfile it installed), and stops the service as soon as
that changes. Docker then restarts the service, which waits for the new install. So nothing
runs while packages are being installed, and installs reuse the cached packages in the
`pnpm-store` volume.

`node_modules` holds Linux binaries for the containers. Your editor's language servers,
Prettier and ESLint work from it on any host; running tools such as Vite on the host does
not.

### Working in development mode

- **pnpm commands**: run them in a container, for example
  `docker compose exec watch pnpm add -F @allmaps/editor some-package`. Don't run
  `pnpm install` on the host; if you did, `docker compose restart install` reinstalls.
- **Logs**: `docker compose logs -f editor` (or any service name).
- **Start over with a new demo database**:
  `docker compose down && docker volume rm allmaps_postgres-dev && docker compose up`.
  Don't use plain `down -v` for this: it deletes every volume, including your scans in
  `iiif-images` and the dependency caches.

## Deployment

```sh
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env
docker compose -f compose.yaml up -d --build
```

The `-f compose.yaml` leaves out development mode. Deployment has no default
`BETTER_AUTH_SECRET`, so the first line makes one; without it the REST and Annotations APIs
refuse to start. Each service runs from its own image, with no source code mounted. The
Node apps and APIs, the Tile Server and Preview (`workerd`) and the IIIF image server
(Java) run on `ubuntu:24.04`; PostgreSQL runs on `postgres:17-bookworm` with PostGIS added,
and the proxy on `caddy:2`. A new database starts with no organizations and no maps.

Every service gets a hostname under one domain, `<service>.$DOMAIN`: `editor`, `viewer`,
`console`, `api`, `annotations`, `live`, `tiles`, `preview` and `iiif`. On a server, point
one wildcard DNS record, `*.allmaps.example.org`, at it.

**Choose `DOMAIN` once.** Annotation IDs are built from it when they are served
(`https://annotations.allmaps.example.org/maps/...`), and IIIF image IDs include it, so
changing it changes every permalink.

### Settings

Put settings in a `.env` file next to `compose.yaml`. Compose reads it automatically, and it
is ignored by git. Everything has a default that works on your own machine, except
`BETTER_AUTH_SECRET` in deployment.

| Setting                                    | Default                | What it does                                                                                      |
| ------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `DOMAIN`                                   | `allmaps.localhost`    | Services are at `<service>.$DOMAIN`                                                               |
| `SCHEME`                                   | `http`                 | Scheme in public URLs                                                                             |
| `URL_PORT`                                 | `:5490`                | Port in public URLs, with its colon. Set it empty (`URL_PORT=`) for the standard ports 80 and 443 |
| `TLS`                                      | `off`                  | Who terminates TLS: `off`, `auto`, `files` or `proxy`; see below                                  |
| `HTTP_PORT`                                | `5490`                 | Port Caddy listens on for HTTP                                                                    |
| `HTTPS_PORT`                               | `5443`                 | Port Caddy listens on for HTTPS (`auto` and `files`)                                              |
| `TRUSTED_PROXIES`                          |                        | Required with `TLS=proxy`: IP ranges of the proxy in front of Caddy                               |
| `TLS_CERTS_DIR`                            | `./docker/caddy/certs` | Folder with `cert.pem` and `key.pem` for `TLS=files`                                              |
| `BETTER_AUTH_SECRET`                       |                        | Signs login sessions. Required in deployment: `openssl rand -base64 32`                           |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |                        | GitHub login; see below. Without them, login is off                                               |
| `BASEMAP`                                  | `osm`                  | The modern map under warped maps: `osm`, `esri-world-topo`, `esri-world-imagery` or `protomaps`   |
| `GEOCODE_EARTH_KEY`                        |                        | Enables place search in the Editor                                                                |

`BASEMAP=protomaps` uses an API key that only works on allmaps.org. OpenStreetMap's tile
servers are fine for light use; a busy instance should follow their
[usage policy](https://operations.osmfoundation.org/policies/tiles/).

### TLS

Pick the case that matches your server and copy its block into `.env`.

**Caddy gets certificates from Let's Encrypt.** The server must be reachable from the
internet on ports 80 and 443, with DNS in place.

```sh
DOMAIN=allmaps.example.org
SCHEME=https
URL_PORT=
TLS=auto
HTTP_PORT=80
HTTPS_PORT=443
```

**Caddy uses your own certificate**, for example from an internal certificate authority,
or a wildcard certificate you already have. Put `cert.pem` (with any intermediate
certificates) and `key.pem` in `TLS_CERTS_DIR`; the certificate must cover
`*.allmaps.example.org`.

```sh
DOMAIN=allmaps.example.org
SCHEME=https
URL_PORT=
TLS=files
HTTP_PORT=80
HTTPS_PORT=443
TLS_CERTS_DIR=/etc/ssl/allmaps
```

**Something in front of Caddy terminates TLS**: a load balancer or another proxy, which
forwards plain HTTP to Caddy on `HTTP_PORT`. `TRUSTED_PROXIES` is required: Caddy only
believes the forwarded client address and scheme from these ranges, and refuses to start
without them.

```sh
DOMAIN=allmaps.example.org
SCHEME=https
URL_PORT=
TLS=proxy
HTTP_PORT=5490
TRUSTED_PROXIES=10.0.0.0/8
```

**No TLS**, for a machine on a private network:

```sh
DOMAIN=allmaps.internal.example.org
URL_PORT=
HTTP_PORT=80
```

### GitHub login

Login is optional. To turn it on, register a GitHub OAuth app
(https://github.com/settings/applications/new):

- **Homepage URL**: the Console, for example `http://console.allmaps.localhost:5490`
- **Authorization callback URL**: the REST API followed by `/auth/callback/github`, for
  example `http://api.allmaps.localhost:5490/auth/callback/github`

Then add its client ID and a client secret to `.env`, and sign in through the Console:

```sh
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Your images

The `iiif` service is [Cantaloupe](https://cantaloupe-project.github.io), an IIIF image
server. It serves every TIFF, JPEG and PNG file in the `iiif-images` volume.
To add a scan:

```sh
docker compose cp scan.tif iiif:/images/scan.tif
```

Then open its IIIF address in the Editor and georeference it:
`https://iiif.allmaps.example.org/iiif/3/scan.tif/info.json`. Files in subfolders use
`%2F` for the slash: `/images/survey/1890.tif` is `survey%2F1890.tif`.

Large scans are much faster as pyramidal TIFFs, which store the image in tiles at several
sizes. [libvips](https://www.libvips.org) converts one in a single command:

```sh
vips tiffsave scan.tif scan-pyramid.tif --tile --pyramid --compression jpeg --tile-width 256 --tile-height 256
```

You can also georeference images from any other IIIF server; nothing has to be stored here.

### Your organizations

An organization groups the images on its domains: the Editor's homepage can show its
images, and the REST API lists them under `/organizations/<id>/images`. A new deployment
has none. To add one:

1. **Make yourself an administrator.** Sign in to the Console with GitHub once, then:

   ```sh
   docker compose exec postgres psql -U allmaps -c "UPDATE users SET role = 'admin' WHERE slug = 'your-github-login'"
   ```

   Then sign out and back in. The Console caches your role for five minutes.

2. **Create the organization** in the Console, under Organizations.
3. **Give it its domains** in the Console: the hostnames its IIIF images are served from,
   without the port. For images in the `iiif` service, that's `iiif.allmaps.example.org`.
4. **Turn on _Display collections_** to show its images on the Editor's homepage. The
   homepage shows images in IIIF manifests that are not georeferenced yet, so single
   images opened by URL don't appear there.

After the first administrator, the Console manages the others.

## Data

- **PostgreSQL** keeps maps, their edit history, organizations and users: in the `postgres`
  volume for deployment, and `postgres-dev` for development. Both survive
  `docker compose down` (but not `down -v`). Migrations run automatically at startup.
- **Images** for the `iiif` service are in the `iiif-images` volume.

To back up both:

```sh
docker compose exec postgres pg_dump -U allmaps allmaps > allmaps.sql
docker compose cp iiif:/images ./images
```

To restore into a new or empty database volume, start PostgreSQL on its own first. If the
other services start first, the migrations create an empty schema that the restore then
collides with.

```sh
docker compose -f compose.yaml up -d --wait postgres
docker compose exec -T postgres psql -U allmaps allmaps < allmaps.sql
docker compose -f compose.yaml up -d
docker compose cp ./images/. iiif:/images/
```

## Platforms

macOS and mainstream Linux distributions resolve every `*.localhost` name to your own
machine, and Chrome and Firefox do so on every platform. Elsewhere (Windows, or Linux
without systemd-resolved), tools outside the browser need these lines in the hosts file:

```text
127.0.0.1 editor.allmaps.localhost viewer.allmaps.localhost console.allmaps.localhost
127.0.0.1 api.allmaps.localhost annotations.allmaps.localhost live.allmaps.localhost
127.0.0.1 tiles.allmaps.localhost preview.allmaps.localhost iiif.allmaps.localhost
127.0.0.1 fixtures-amsterdam.allmaps.localhost fixtures-europe.allmaps.localhost
```

## Files

| File                                         | What it is                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `compose.yaml`                               | Deployment, and everything both modes share                                            |
| `compose.override.yaml`                      | Development mode                                                                       |
| `Dockerfile`                                 | Every image: `toolchain` (development), `node`, `workerd`, `cantaloupe` and `postgres` |
| `docker/caddy/`                              | Proxy configuration, one snippet per TLS mode                                          |
| `docker/caddy-dev/`                          | Development: the fixture server's hostnames                                            |
| `docker/workerd-config.sh`                   | Generates the `workerd` configuration for the Tile Server and Preview                  |
| `docker/dev-install.sh`, `docker/dev-run.sh` | Development: installing, and running services around installs                          |
| `tools/seed/src/postgres.ts`                 | Development: seeds the demo dataset into PostgreSQL                                    |
