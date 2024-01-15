<p align="center">
  <img src="/packages/ui/src/lib/shared/images/allmaps-logo.svg" width="100px" />
</p>

# @allmaps/allmaps

100,000s of maps are available through [IIIF](https://iiif.io/), across libraries, archives and museums worldwide. Allmaps makes it easier and more inspiring to **curate, georeference and explore collections of digitized maps**.

👉 [allmaps.org](https://allmaps.org/) - [docs.allmaps.org](https://docs.allmaps.org/)

## Contents

Allmaps is an open source project and consists of multiple apps and packages, all written in TypeScript and contained by this monorepo.

Apps:

- [Allmaps Viewer](apps/viewer)
- [Allmaps Tile Server](apps/tileserver)
- [Allmaps Latest](apps/latest)
- [Allmaps CLI](apps/cli)
  <!-- - [Allmaps Explore](apps/explore) -->
  <!-- - [Allmaps Info](apps/info) -->
- [Allmaps IIIF Viewer](apps/iiif)
- [Allmaps Here](apps/here)

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/leaflet](packages/leaflet)
- [@allmaps/maplibre](packages/maplibre)
- [@allmaps/openlayers](packages/openlayers)
- [@allmaps/render](packages/render)
- [@allmaps/schemas](packages/schemas)
- [@allmaps/stdlib](packages/stdlib)
- [@allmaps/tailwind](packages/tailwind)
- [@allmaps/transform](packages/transform)
- [@allmaps/triangulate](packages/triangulate)
- [@allmaps/types](packages/types)
- [@allmaps/ui](packages/ui)

To see how these apps and packages are related, check out the [dependency graph](https://observablehq.com/@allmaps/javascript-dependencies).

## Installation

Make sure you have Node.js (version 20.8 or higher) and [pnpm](https://pnpm.io/installation#using-corepack) installed.

First, clone this repository locally:

```sh
git clone https://github.com/allmaps/allmaps.git
cd allmaps
```

Then, install dependencies and create symlinks:

```sh
pnpm install -r
```

Finally, initialize SvelteKit apps:

```sh
pnpm run check
```

## Running packages and apps locally

### All packages and apps

To run the `watch` and `dev` scripts for all packages and apps, run the following in one terminal window:

```sh
pnpm run watch
```

And this in another:

```sh
pnpm run dev
```

### A single app

To run the `dev` script for a single app, you need to run the `watch` scripts of all packages in one terminal window:

```sh
pnpm run watch
```

And then run the `dev` script of the app in another:

```sh
pnpm --filter "@allmaps/viewer" run dev
```

You can also run the `dev` script from the app's directory instead:

```sh
cd apps/viewer
pnpm run dev
```

## Troubleshooting

If things don't work, it might help to reinitialize the SvelteKit apps:

```sh
pnpm run check
```

Or, reinstall dependencies and create the monorepo's symlinks:

```sh
pnpm install -r
```

As a last resort, you can try to remove some (or all) `node_modules` directories using [npkill](https://npkill.js.org/):

```sh
pnpm dlx npkill
```

## Commit changes

This repository uses [Husky](https://typicode.github.io/husky/) to run type checking, code linting and tests before each commit.

To skip these tests, you can use git's `--no-verify` option:

```sh
git commit --no-verify
```

## Check formatting and types

Check TypeScript types for all packages:

```sh
pnpm run types
```

Run [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/) for all packages:

```sh
pnpm run lint
```

## Run tests

Run tests for all packages and apps:

```sh
pnpm run test
```

Run tests for a single package:

```sh
pnpm --filter "@allmaps/transform" test
```

You can run the tests from the package's directory instead:

```sh
cd packages/transform
pnpm test
```

# Versioning & publishing

Create prerelease versions:

```sh
lerna version prerelease
```

Publish beta versions to npm:

```sh
lerna publish from-git --dist-tag beta
```

Promoting unchanged pre-release versions:

```sh
lerna version --conventional-commits --conventional-graduate
```
