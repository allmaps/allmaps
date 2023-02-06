# @allmaps/allmaps

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/transform](packages/transform)
- [@allmaps/render](packages/render)
- [@allmaps/openlayers](packages/openlayers)
- [@allmaps/ui-components](packages/ui-components)

Apps:

- [Allmaps Viewer](apps/viewer)
- [Allmaps Tile Server](apps/tileserver)
- [Allmaps Explore](apps/explore)
- [Allmaps Info](apps/info)
- [Allmaps IIIF Viewer](apps/iiif)
- [Allmaps CLI](apps/cli)
- [Allmaps Style Guide](apps/style)

## Installation

    pnpm install -r
    lerna link

Run Allmaps Viewer:

    pnpm --filter "@allmaps/viewer" run dev

 Run tests in single package:

    npx lerna run --scope @allmaps/id test

Run `dev` and `build --watch` scripts for all packages and apps:

    npx lerna run dev --parallel
    npx lerna run watch --parallel

# Versioning & publishing

Create prerelease versions:

    lerna version prerelease

Publish beta versions to npm:

    lerna publish from-git --dist-tag beta

Promoting unchanged pre-release versions:

    lerna version --conventional-commits --conventional-graduate
