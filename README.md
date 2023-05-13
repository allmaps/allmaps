# @allmaps/allmaps

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/transform](packages/transform)
- [@allmaps/render](packages/render)
- [@allmaps/openlayers](packages/openlayers)
- [@allmaps/ui](packages/ui)

Apps:

- [Allmaps Viewer](apps/viewer)
- [Allmaps Tile Server](apps/tileserver)
- [Allmaps Explore](apps/explore)
- [Allmaps Info](apps/info)
- [Allmaps IIIF Viewer](apps/iiif)
- [Allmaps CLI](apps/cli)

## Installation

First, clone this repository locally:

    git clone https://github.com/allmaps/allmaps.git
    cd allmaps

Install dependencies and create symlinks:

    pnpm install -r
    npx lerna link

## Running all packages and apps locally:

To run the `dev` and `build --watch` scripts for all packages and apps, run the following in one terminal window:

    npx lerna run watch --parallel

And this in another:

    npx lerna run dev --parallel

If things don't work, it might help to run:

    npx lerna run check --parallel

To only run a single app in dev mode, you need to run all packages in watch mode:

    npx lerna run watch --parallel

And then use lerna with `--scope` to select a single app:

    npx lerna run --scope "@allmaps/viewer" dev

## Check formatting and types

Check TypeScript types for all packages:

    npx lerna run types --parallel

Run Prettier and ESLint for all packages:

    npx lerna run lint --parallel

## Run tests

Run `test` scripts for all packages and apps:

    npx lerna run test --parallel

Run tests in single package:

    npx lerna run --scope @allmaps/id test

# Versioning & publishing

Create prerelease versions:

    lerna version prerelease

Publish beta versions to npm:

    lerna publish from-git --dist-tag beta

Promoting unchanged pre-release versions:

    lerna version --conventional-commits --conventional-graduate
