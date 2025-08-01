<p align=center><a href="https://allmaps.org"><img width="480" src="static/allmaps.svg" alt="Allmaps"></a></p>

# Allmaps

100,000s of maps are available through [IIIF](https://iiif.io/), across libraries, archives and museums worldwide. Allmaps makes it easier and more inspiring to **curate, georeference and explore collections of digitized maps**.

👉 For more information about the Allmaps project, see [allmaps.org](https://allmaps.org/).

[![Allmaps Viewer](static/allmaps-viewer.jpg)](https://viewer.allmaps.org/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F9c4e14c0b9d41379)

## Contents

Allmaps is an open source project and consists of multiple apps, packages and workers, all written in TypeScript and contained by this monorepo.

Apps:

- [Allmaps Editor](apps/editor)
- [Allmaps Viewer](apps/viewer)
- [Allmaps Latest](apps/latest)
- [Allmaps CLI](apps/cli)
- [Allmaps Explore](apps/explore)
- [Allmaps IIIF Viewer](apps/iiif)
- [Allmaps Here](apps/here)

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/basemap](packages/basemap)
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

Workers:

- [Allmaps Tile Server](workers/tileserver)
- [Allmaps Preview Server](workers/preview)

To see how these components are related, check out the [dependency graph](https://observablehq.com/@allmaps/javascript-dependencies).

## Contributing

We're welcoming contributions! You can read more about the many ways you can contribute [here](./CONTRIBUTING.md).

## License

- **Apps**: all apps are licensed under the [GPL-3.0](https://opensource.org/licenses/GPL-3.0) license, except the homepage and the CLI, which are licensed under the [MIT](https://opensource.org/licenses/MIT) license.
- **Packages**: all packages are licensed under the [MIT](https://opensource.org/licenses/MIT) license.
- **Workers**: all workers are licensed under the [MIT](https://opensource.org/licenses/MIT) license.
- **Data**: georeference data published through the Allmaps project is licensed under the [CC0](https://creativecommons.org/publicdomain/zero/1.0/) license
- **Base map**: [ODbL](https://opendatacommons.org/licenses/odbl/), © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. See Protomap's [licensing and attribution guidelines](https://github.com/protomaps/basemaps?tab=readme-ov-file#licensing-and-attribution-guidelines) for more details.

## Installation

Make sure you have Node.js (version 20.8 or higher) and [pnpm](https://pnpm.io/) installed.

You can [install pnpm with Corepack](https://pnpm.io/installation#using-corepack):

```sh
corepack enable
corepack use pnpm@8.10.0
```

Then, clone this repository locally:

```sh
git clone https://github.com/allmaps/allmaps.git
cd allmaps
```

Finally, initialize the repository:

```sh
pnpm run init
```

The `init` script is a shorthand for the following commands:

1. `pnpm install --recursive`: install all dependencies for all packages and apps.
2. `pnpm run build:packages`: build all packages to ensure all JavaScript exports are created from TypeScript files.
3. `pnpm run check`: initialize SvelteKit apps.
4. `pnpm run build:apps`: build SvelteKit apps.

If things stop working later on, you can always run the `init` script again.

### Running a single app locally

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

### Running all packages and apps locally

To run the `watch` and `dev` scripts for all packages and apps, run the following in one terminal window:

```sh
pnpm run watch
```

And this in another:

```sh
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
pnpm run version-prerelease
```

Publish beta versions to npm:

```sh
pnpm run publish-beta
```
