# @allmaps/allmaps

Packages:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/transform](packages/transform)
- [@allmaps/render](packages/render)
- [@allmaps/openlayers](packages/openlayers)

Apps:

- [Allmaps Viewer](apps/viewer)
- [Allmaps Tile Server](apps/tileserver)

## Installation

    pnpm install -r
    lerna link

Run Allmaps Viewer:

    pnpm --filter "@allmaps/viewer" run dev

 Run tests in single package:

    npx lerna run --scope @allmaps/id test

# Versioning & publishing

Create prerelease versions:

    lerna version prerelease

Publish beta versions to npm:

    lerna publish from-git --dist-tag beta
