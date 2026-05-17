# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Allmaps is a monorepo for georeferencing and displaying IIIF maps. It provides libraries for coordinate transformation, WebGL rendering of warped maps, and plugins for Leaflet/OpenLayers/MapLibre. The project centers around the Georeference Annotation spec (an extension of W3C Web Annotations for IIIF images).

## Setup & Commands

**Requirements:** Node.js >=24, pnpm 10.0.0

**Initial setup:**
```bash
pnpm run init    # install deps, build packages, check, build apps
```

**Development (two terminals):**
```bash
pnpm run watch   # Terminal 1: watch and rebuild packages
pnpm run dev     # Terminal 2: run all dev servers
```

**Single app/package:**
```bash
pnpm --filter "@allmaps/viewer" run dev
pnpm --filter "@allmaps/transform" test
```

**Build/check/test:**
```bash
pnpm run build           # build everything (turbo)
pnpm run build:packages  # packages only
pnpm run types           # TypeScript type checking
pnpm run check           # SvelteKit sync and check
pnpm run lint            # prettier + eslint
pnpm run test            # vitest across all packages
pnpm run precommit       # build + test + types + lint + documentation
```

**Reset:**
```bash
pnpm run reset           # remove node_modules, reinstall, rebuild
```

## Architecture

| Directory | Purpose | License |
|-----------|---------|---------|
| `packages/` | Core libraries (transform, render, annotation, iiif-parser, triangulate, map plugins) | MIT |
| `apps/` | SvelteKit apps (editor, viewer, explore, here, latest, homepage, cli) | GPL-3.0 (cli/homepage: MIT) |
| `workers/` | Cloudflare Workers (tileserver, preview, queue) | MIT |
| `apis/` | Cloudflare Workers APIs (api, annotations, live, shared) using Elysia + Drizzle + Neon | AGPL-3.0 |

### Key packages

- **annotation** — Parse/generate Georeference Annotations (the core data format)
- **transform** — Coordinate transformations (Helmert, polynomial, thin plate spline, projective)
- **render** — WebGL2/Canvas renderers for warped maps
- **triangulate** — Triangulation for map warping
- **iiif-parser** — Parse IIIF Image/Presentation API resources
- **leaflet/openlayers/maplibre** — Map library plugins
- **stdlib** — Shared utilities (colors, API helpers, types)
- **id** — Allmaps ID generation

### Build dependency chain

Packages build with `tsc` (composite projects with references). Turbo orchestrates the dependency graph: packages build first, then apps. The `watch` command rebuilds packages on change so app dev servers pick up updates.

## Tech Stack

- **TypeScript** 5.9, target ES2022, bundler module resolution
- **Svelte 5** + **SvelteKit 2** for apps
- **Tailwind CSS 4** for styling
- **Vite 7** (some apps use Rolldown-Vite)
- **Vitest 4** for testing
- **ESLint 9** (flat config) + **Prettier** (no semicolons, single quotes, no trailing commas)
- **Cloudflare Workers** for deployment (wrangler)
- **Zod** for schema validation

## Code Style

Configured in root `.prettierrc`: no semicolons, single quotes, no trailing commas, 80 char width.

## Key Conventions

- Internal dependencies use `workspace:^` and pnpm catalog for shared version management
- TypeScript path mappings in `tsconfig.base.json` point `@allmaps/*` to `src/` directories
- Dev ports are in `ports.json` (viewer: 5500, editor: 5515, etc.)
- PRs should target `develop` branch, not `main`
- Pre-commit hook (husky) runs the full `precommit` suite
- Projections: EPSG:3857 for rendering, EPSG:4326 for output
