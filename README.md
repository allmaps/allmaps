# @allmaps/allmaps

Allmaps is a project for **curating, georeferencing and exploring for IIIF maps**!

👉 **[allmaps.org](https://allmaps.org/)**

[Observable Notebooks](https://observablehq.com/@allmaps?tab=notebooks)

More documentation coming soon!

## Contents

This is a mono repo with the following apps and packages:

Apps:

- [Allmaps Viewer](apps/viewer)
- [Allmaps Tile Server](apps/tileserver)
- [Allmaps Explore](apps/explore)
- [Allmaps Info](apps/info)
- [Allmaps IIIF Viewer](apps/iiif)
- [Allmaps CLI](apps/cli)
- [Allmaps Here](apps/here)
- [Allmaps Latest](apps/latest)

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/transform](packages/transform)
- [@allmaps/triangulate](packages/triangulate)
- [@allmaps/render](packages/render)
- [@allmaps/openlayers](packages/openlayers)
- [@allmaps/ui](packages/ui)

## Installation

First, clone this repository locally

```sh
git clone https://github.com/allmaps/allmaps.git
cd allmaps
```

Then install dependencies and create symlinks

```sh
pnpm install -r
npx lerna link
```

## Running packages and apps locally

### All apps and packages

To run the `dev` and `build --watch` scripts for all packages and apps, run the following in one terminal window:

```sh
npx lerna run watch --parallel
```

And this in another:

```sh
npx lerna run dev --parallel
```

### One app or package

To only run a single app in dev mode, you need to run all packages in watch mode:

```sh
npx lerna run watch --parallel
```

And then use lerna with `--scope` to select a single app:

```sh
npx lerna run --scope "@allmaps/viewer" dev
```

You can also directly run the `dev` script from a single app:

```sh
cd apps/viewer
pnpm run dev
```

## Troubleshooting

If things don't work, it might help to run:

```sh
npx lerna run check --parallel
```

or

```sh
npx lerna link
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
npx lerna run types --parallel
```

Run Prettier and ESLint for all packages:

```sh
npx lerna run lint --parallel
```

## Run tests

Run `test` scripts for all packages and apps:

```sh
npx lerna run test --parallel
```

Run tests in single package:

```sh
npx lerna run --scope @allmaps/id test
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
