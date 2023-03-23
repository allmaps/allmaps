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

Run `dev` and `build --watch` scripts for all packages and apps:

    npx lerna run dev --parallel
    npx lerna run watch --parallel

Run `test` scripts for all packages and apps:

    npx lerna run test --parallel

You can also use pnpm to run packages individually. For example, to run Allmaps Viewer:

    pnpm --filter "@allmaps/viewer" run dev

Run tests in single package:

    npx lerna run --scope @allmaps/id test

# Versioning & publishing

Create prerelease versions:

    lerna version prerelease

Publish beta versions to npm:

    lerna publish from-git --dist-tag beta

Promoting unchanged pre-release versions:

    lerna version --conventional-commits --conventional-graduate
