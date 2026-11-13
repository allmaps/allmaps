---
title: Overview
description: JavaScript and TypeScript libraries for working with IIIF images, georeferencing data, and warped maps.
sidebar:
  order: 0
---

Allmaps packages provide the building blocks for working with historical maps
in your own applications. Use them to read IIIF resources, work with
[Georeference Annotations](/georeference-annotations), transform coordinates,
and display georeferenced images on a map.

Start with the packages that match what you want to do:

| Task                                                    | Packages                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Display maps in a web application                       | [@allmaps/maplibre](/packages/maplibre), [@allmaps/openlayers](/packages/openlayers), or [@allmaps/leaflet](/packages/leaflet) |
| Read and create georeferencing data                     | [@allmaps/annotation](/packages/annotation)                                                                                    |
| Read IIIF images, manifests, and collections            | [@allmaps/iiif-parser](/packages/iiif-parser)                                                                                  |
| Transform image coordinates into geographic coordinates | [@allmaps/transform](/packages/transform) and [@allmaps/project](/packages/project)                                            |
| Render warped images                                    | [@allmaps/render](/packages/render)                                                                                            |
| Analyze georeferencing quality and distortion           | [@allmaps/analyze](/packages/analyze)                                                                                          |
| Import and export ground control points                 | [@allmaps/io](/packages/io)                                                                                                    |

Each package reference includes its available usage examples and API details.
Install packages individually under the `@allmaps` scope, for example:

```sh
pnpm add @allmaps/annotation
```

For command-line workflows, use the [Allmaps CLI](/packages/cli). To load maps as XYZ
tiles in GIS software or other mapping tools, see the [Allmaps Tile Server](/packages/tileserver).
All package source code is available in the
[Allmaps monorepo](https://github.com/allmaps/allmaps).
