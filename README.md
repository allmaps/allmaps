# @allmaps/allmaps

Modules:

- [@allmaps/annotation](packages/annotation)
- [@allmaps/id](packages/id)
- [@allmaps/iiif-parser](packages/iiif-parser)
- [@allmaps/render](packages/render)
- [@allmaps/transform](packages/transform)

## Installation

    pnpm install -r
    lerna link

Run Allmaps Viewer:

    pnpm --filter "@allmaps/viewer" run dev

 Run tests in single package:

    npx lerna run --scope @allmaps/id test
